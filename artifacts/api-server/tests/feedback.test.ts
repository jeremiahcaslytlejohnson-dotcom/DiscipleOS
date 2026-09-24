import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db, feedbackTable, usersTable } from "@workspace/db";
import { createApp, createPgSessionStore } from "../src/app";

const authUser = vi.hoisted(() => ({
  id: null as string | null,
  email: null as string | null,
}));
const sendFeedbackNotification = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("../src/middlewares/auth", () => ({
  attachCurrentUser: (req: any, _res: unknown, next: () => void) => {
    if (authUser.id) {
      req.dbUser = { id: authUser.id, email: authUser.email };
    }
    next();
  },
  requireAuth: (req: any, res: any, next: () => void) =>
    req.dbUser
      ? next()
      : res.status(401).json({ success: false, error: "Sign in required" }),
}));

vi.mock("../src/services/emailDelivery", async () => {
  const actual = await vi.importActual<typeof import("../src/services/emailDelivery")>(
    "../src/services/emailDelivery",
  );
  return { ...actual, sendFeedbackNotification };
});

const app = createApp(createPgSessionStore());
const createdFeedbackIds: string[] = [];
const createdUserIds: string[] = [];

describe("feedback", () => {
  beforeEach(() => {
    authUser.id = null;
    authUser.email = null;
    sendFeedbackNotification.mockReset();
    sendFeedbackNotification.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    for (const id of createdFeedbackIds) {
      await db.delete(feedbackTable).where(eq(feedbackTable.id, id));
    }
    for (const id of createdUserIds) {
      await db.delete(usersTable).where(eq(usersTable.id, id));
    }
  });

  it("stores anonymous feedback with its browser session owner", async () => {
    const browser = request.agent(app);
    const message = `Feedback test ${Date.now()}`;

    const response = await browser
      .post("/api/feedback")
      .send({
        category: "idea",
        message,
        page: "/",
      })
      .expect(201);

    expect(response.body).toEqual({ success: true });
    expect(sendFeedbackNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message, userEmail: null }),
    );

    const [stored] = await db
      .select()
      .from(feedbackTable)
      .where(eq(feedbackTable.message, message));
    expect(stored).toEqual(expect.objectContaining({
      category: "idea",
      message,
      page: "/",
    }));
    expect(stored.userId).toBeTruthy();
    createdFeedbackIds.push(stored.id);
  });

  it("saves signed-in feedback and includes the account email in the notification", async () => {
    const userId = `feedback-user-${Date.now()}`;
    const email = `feedback-${Date.now()}@example.test`;
    await db.insert(usersTable).values({ id: userId, email });
    createdUserIds.push(userId);
    authUser.id = userId;
    authUser.email = email;

    const message = `Signed-in feedback ${Date.now()}`;
    const response = await request(app)
      .post("/api/feedback")
      .send({ category: "bug", message, page: "/settings" })
      .expect(201);

    expect(response.body).toEqual({ success: true });
    expect(sendFeedbackNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message, page: "/settings", userEmail: email }),
    );
  });

  it("keeps the saved submission when notification delivery fails", async () => {
    sendFeedbackNotification.mockRejectedValueOnce(new Error("Resend unavailable"));
    const message = `Delivery failure feedback ${Date.now()}`;

    const response = await request(app)
      .post("/api/feedback")
      .send({ category: "feedback", message, page: "/calendar" })
      .expect(201);

    expect(response.body).toEqual({ success: true });
    const [stored] = await db
      .select()
      .from(feedbackTable)
      .where(eq(feedbackTable.message, message));
    expect(stored).toEqual(
      expect.objectContaining({
        message,
        page: "/calendar",
        notificationStatus: "failed",
        notificationAttempts: 1,
        notificationLastError: "Resend unavailable",
        notificationSentAt: null,
      }),
    );
    createdFeedbackIds.push(stored.id);
  });

  it("retries failed notifications and does not resend delivered feedback", async () => {
    const ownerEmail = "jeremiah.cas.lytle.johnson@gmail.com";
    const [existingOwner] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, ownerEmail))
      .limit(1);
    const ownerId =
      existingOwner?.id ?? `feedback-retry-owner-${Date.now()}`;
    if (!existingOwner) {
      await db.insert(usersTable).values({ id: ownerId, email: ownerEmail });
      createdUserIds.push(ownerId);
    }
    authUser.id = ownerId;
    authUser.email = ownerEmail;

    const message = `Retryable feedback ${Date.now()}`;
    sendFeedbackNotification.mockRejectedValueOnce(new Error("Resend unavailable"));
    const submitted = await request(app)
      .post("/api/feedback")
      .send({ category: "bug", message, page: "/retry" })
      .expect(201);

    const [stored] = await db
      .select()
      .from(feedbackTable)
      .where(eq(feedbackTable.message, message));
    createdFeedbackIds.push(stored.id);
    expect(submitted.body).toEqual({ success: true });

    sendFeedbackNotification.mockResolvedValue(undefined);
    const callsBeforeRetry = sendFeedbackNotification.mock.calls.length;
    const retried = await request(app)
      .post(`/api/feedback/${stored.id}/notification/retry`)
      .expect(200);
    expect(retried.body).toEqual({
      success: true,
      attempted: 1,
      delivered: 1,
      failed: 0,
      alreadySent: false,
    });
    expect(sendFeedbackNotification.mock.calls.length).toBe(callsBeforeRetry + 1);

    const [deliveredFeedback] = await db
      .select()
      .from(feedbackTable)
      .where(eq(feedbackTable.id, stored.id));
    expect(deliveredFeedback).toEqual(
      expect.objectContaining({
        notificationStatus: "sent",
        notificationAttempts: 2,
        notificationLastError: null,
        notificationSentAt: expect.any(Date),
      }),
    );

    const callsAfterRetry = sendFeedbackNotification.mock.calls.length;
    await request(app)
      .post(`/api/feedback/${stored.id}/notification/retry`)
      .expect(200)
      .expect({
        success: true,
        attempted: 0,
        delivered: 0,
        failed: 0,
        alreadySent: true,
      });
    expect(sendFeedbackNotification.mock.calls.length).toBe(callsAfterRetry);
  });

  it("allows only one concurrent retry claimant for a feedback submission", async () => {
    const ownerEmail = "jeremiah.cas.lytle.johnson@gmail.com";
    const [existingOwner] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, ownerEmail))
      .limit(1);
    const ownerId =
      existingOwner?.id ?? `feedback-concurrent-owner-${Date.now()}`;
    if (!existingOwner) {
      await db.insert(usersTable).values({ id: ownerId, email: ownerEmail });
      createdUserIds.push(ownerId);
    }
    authUser.id = ownerId;
    authUser.email = ownerEmail;

    const [stored] = await db
      .insert(feedbackTable)
      .values({
        userId: ownerId,
        category: "bug",
        message: `Concurrent retry feedback ${Date.now()}`,
        page: "/retry",
        notificationStatus: "failed",
        notificationAttempts: 1,
        notificationLastError: "Initial delivery failed",
      })
      .returning();
    createdFeedbackIds.push(stored.id);

    let releaseDelivery!: () => void;
    let deliveryStarted!: () => void;
    const deliveryHasStarted = new Promise<void>((resolve) => {
      deliveryStarted = resolve;
    });
    const deliveryMayFinish = new Promise<void>((resolve) => {
      releaseDelivery = resolve;
    });
    sendFeedbackNotification.mockImplementationOnce(async () => {
      deliveryStarted();
      await deliveryMayFinish;
    });

    const firstRetry = request(app)
      .post(`/api/feedback/${stored.id}/notification/retry`)
      .expect(200);
    const firstRetryPromise = firstRetry.then((response) => response);
    await deliveryHasStarted;

    const secondRetry = await request(app)
      .post(`/api/feedback/${stored.id}/notification/retry`)
      .expect(409);
    expect(secondRetry.body).toEqual({
      success: false,
      error: "This notification is already being sent.",
    });
    expect(sendFeedbackNotification).toHaveBeenCalledTimes(1);

    releaseDelivery();
    await firstRetryPromise;
    expect(sendFeedbackNotification).toHaveBeenCalledTimes(1);

    const [deliveredFeedback] = await db
      .select()
      .from(feedbackTable)
      .where(eq(feedbackTable.id, stored.id));
    expect(deliveredFeedback).toEqual(
      expect.objectContaining({
        notificationStatus: "sent",
        notificationAttempts: 2,
        notificationSentAt: expect.any(Date),
      }),
    );
  });

  it("limits feedback reading and review updates to the configured owner", async () => {
    const regularId = `feedback-regular-${Date.now()}`;
    const ownerEmail = "jeremiah.cas.lytle.johnson@gmail.com";
    const [existingOwner] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, ownerEmail))
      .limit(1);
    const ownerId = existingOwner?.id ?? `feedback-owner-${Date.now()}`;
    if (existingOwner) {
      await db.insert(usersTable).values({
        id: regularId,
        email: "regular-feedback-user@example.test",
      });
    } else {
      await db.insert(usersTable).values([
        { id: ownerId, email: ownerEmail },
        { id: regularId, email: "regular-feedback-user@example.test" },
      ]);
      createdUserIds.push(ownerId);
    }
    createdUserIds.push(regularId);

    const [stored] = await db
      .insert(feedbackTable)
      .values({
        userId: ownerId,
        category: "idea",
        message: `Owner inbox feedback ${Date.now()}`,
        page: "/",
      })
      .returning();
    createdFeedbackIds.push(stored.id);

    await request(app).get("/api/feedback").expect(401);

    authUser.id = regularId;
    authUser.email = "regular-feedback-user@example.test";
    await request(app).get("/api/feedback").expect(403);
    await request(app)
      .patch(`/api/feedback/${stored.id}`)
      .send({ reviewed: true })
      .expect(403);
    await request(app)
      .post(`/api/feedback/${stored.id}/notification/retry`)
      .expect(403);

    authUser.id = ownerId;
    authUser.email = ownerEmail;
    const inbox = await request(app).get("/api/feedback").expect(200);
    expect(inbox.body.feedback).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: stored.id,
          message: stored.message,
          userEmail: "jeremiah.cas.lytle.johnson@gmail.com",
          reviewedAt: null,
        }),
      ]),
    );

    const reviewed = await request(app)
      .patch(`/api/feedback/${stored.id}`)
      .send({ reviewed: true })
      .expect(200);
    expect(reviewed.body.feedback).toEqual(
      expect.objectContaining({ id: stored.id, reviewedAt: expect.any(String) }),
    );

    const markedNew = await request(app)
      .patch(`/api/feedback/${stored.id}`)
      .send({ reviewed: false })
      .expect(200);
    expect(markedNew.body.feedback).toEqual(
      expect.objectContaining({ id: stored.id, reviewedAt: null }),
    );
  });

  it("rejects empty and oversized messages", async () => {
    await request(app)
      .post("/api/feedback")
      .send({ category: "feedback", message: " " })
      .expect(400);

    await request(app)
      .post("/api/feedback")
      .send({ category: "feedback", message: "x".repeat(2_001) })
      .expect(400);
  });
});