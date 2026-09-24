import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  authEmailCodesTable,
  db,
  eventsTable,
  readingPlansTable,
  usersTable,
} from "@workspace/db";
import { createApp, createPgSessionStore } from "../src/app";
import {
  AUTH_CODE_TTL_MS,
  hashVerificationCode,
} from "../src/lib/auth-codes";
import { isEmailDeliveryConfigured } from "../src/services/emailDelivery";

const app = createApp(createPgSessionStore());
const createdUserIds: string[] = [];
const createdEmails: string[] = [];
const createdPlanIds: string[] = [];

async function seedCode({
  email,
  purpose = "email",
  code = "123456",
  expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS),
}: {
  email: string;
  purpose?: "email" | "sign-in" | "sign-up";
  code?: string;
  expiresAt?: Date;
}) {
  const { hash, salt } = hashVerificationCode(code);
  await db.insert(authEmailCodesTable).values({
    email,
    purpose,
    codeHash: hash,
    codeSalt: salt,
    expiresAt,
    requestIp: "auth-test",
  });
}

describe("first-party passwordless authentication", () => {
  afterAll(async () => {
    for (const email of createdEmails) {
      await db.delete(authEmailCodesTable).where(eq(authEmailCodesTable.email, email));
    }
    for (const id of createdUserIds) {
      await db.delete(usersTable).where(eq(usersTable.id, id));
    }
    for (const id of createdPlanIds) {
      await db.delete(readingPlansTable).where(eq(readingPlansTable.id, id));
    }
  });

  it("reports unauthenticated sessions without exposing account data", async () => {
    const response = await request(app).get("/api/auth/me").expect(200);
    expect(response.body).toEqual({ authenticated: false, user: null });
  });

  it("surfaces missing email delivery configuration instead of exposing a local code", async () => {
    const originalSender = process.env.RESEND_FROM;
    delete process.env.RESEND_FROM;
    try {
      expect(isEmailDeliveryConfigured()).toBe(false);
      const response = await request(app)
        .post("/api/auth/request-code")
        .send({ email: "delivery-blocker@example.com", purpose: "email" })
        .expect(503);
      expect(response.body.code).toBe("EMAIL_DELIVERY_NOT_CONFIGURED");
      expect(response.body.error).not.toMatch(/\d{6}/);
    } finally {
      if (originalSender === undefined) {
        delete process.env.RESEND_FROM;
      } else {
        process.env.RESEND_FROM = originalSender;
      }
    }
  });

  it("creates an authenticated session, consumes a code once, and logs out", async () => {
    const email = `auth-login-${Date.now()}@example.com`;
    const userId = `auth-login-${Date.now()}`;
    createdEmails.push(email);
    createdUserIds.push(userId);
    await db.insert(usersTable).values({ id: userId, email });
    await seedCode({ email });

    const browser = request.agent(app);
    const verified = await browser
      .post("/api/auth/verify-code")
      .send({ email, purpose: "email", code: "123456" })
      .expect(200);
    expect(verified.body.user).toEqual(expect.objectContaining({ id: userId, email }));

    const me = await browser.get("/api/auth/me").expect(200);
    expect(me.body).toEqual({
      authenticated: true,
      user: expect.objectContaining({ id: userId, email }),
    });

    await browser
      .post("/api/auth/verify-code")
      .send({ email, purpose: "email", code: "123456" })
      .expect(400);

    await browser.post("/api/auth/logout").expect(200);
    await browser.get("/api/auth/me").expect(200, {
      authenticated: false,
      user: null,
    });
    const sessionInfo = await browser.get("/api/session/info").expect(200);
    expect(sessionInfo.body.authenticated).toBe(false);
    expect(sessionInfo.body.userId).not.toBe(userId);
    await browser.get("/api/settings").expect(401);
  });

  it("rejects expired and incorrect codes without revealing stored values", async () => {
    const email = `auth-expired-${Date.now()}@example.com`;
    createdEmails.push(email);
    await seedCode({
      email,
      expiresAt: new Date(Date.now() - 1_000),
    });

    const response = await request(app)
      .post("/api/auth/verify-code")
      .send({ email, purpose: "email", code: "123456" })
      .expect(400);
    expect(response.body).toEqual({
      success: false,
      code: "CODE_INVALID_OR_EXPIRED",
      error: "That verification code is invalid or expired.",
    });
  });

  it("recovers from incorrect, expired, and consumed codes with a new code", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const consumedEmail = `auth-recovery-consumed-${suffix}@e2e.discipleos.test`;
    const expiredEmail = `auth-recovery-expired-${suffix}@e2e.discipleos.test`;
    const browser = request.agent(app);

    const firstRequest = await browser
      .post("/api/auth/request-code")
      .send({ email: consumedEmail, purpose: "email" })
      .expect(200);
    expect(firstRequest.body).toEqual({
      success: true,
      next: "code",
      message: "If the address is eligible, a verification code was sent.",
    });
    const firstCodeResponse = await request(app)
      .get(`/api/auth/test-code?email=${encodeURIComponent(consumedEmail)}`)
      .expect(200);
    const firstCode = firstCodeResponse.body.code as string;
    const incorrectCode = firstCode === "000000" ? "000001" : "000000";

    const incorrect = await browser
      .post("/api/auth/verify-code")
      .send({ email: consumedEmail, purpose: "email", code: incorrectCode })
      .expect(400);
    expect(incorrect.body).toEqual({
      success: false,
      code: "CODE_INVALID_OR_EXPIRED",
      error: "That verification code is invalid or expired.",
    });

    await browser
      .post("/api/auth/request-code")
      .send({ email: consumedEmail, purpose: "email" })
      .expect(200);
    const secondCode = (
      await request(app)
        .get(`/api/auth/test-code?email=${encodeURIComponent(consumedEmail)}`)
        .expect(200)
    ).body.code as string;
    const firstVerification = await browser
      .post("/api/auth/verify-code")
      .send({ email: consumedEmail, purpose: "email", code: secondCode })
      .expect(200);
    const userId = firstVerification.body.user.id as string;

    await browser
      .post("/api/auth/request-code")
      .send({ email: consumedEmail, purpose: "email" })
      .expect(200);
    const consumedCode = (
      await request(app)
        .get(`/api/auth/test-code?email=${encodeURIComponent(consumedEmail)}`)
        .expect(200)
    ).body.code as string;
    await browser
      .post("/api/auth/verify-code")
      .send({ email: consumedEmail, purpose: "email", code: consumedCode })
      .expect(200);
    const consumed = await browser
      .post("/api/auth/verify-code")
      .send({ email: consumedEmail, purpose: "email", code: consumedCode })
      .expect(400);
    expect(consumed.body).toEqual(incorrect.body);

    await browser
      .post("/api/auth/request-code")
      .send({ email: consumedEmail, purpose: "email" })
      .expect(200);
    const replacementCode = (
      await request(app)
        .get(`/api/auth/test-code?email=${encodeURIComponent(consumedEmail)}`)
        .expect(200)
    ).body.code as string;
    const replacementVerification = await browser
      .post("/api/auth/verify-code")
      .send({ email: consumedEmail, purpose: "email", code: replacementCode })
      .expect(200);
    expect(replacementVerification.body.user.id).toBe(userId);

    await request(app)
      .post("/api/auth/request-code")
      .send({ email: expiredEmail, purpose: "email" })
      .expect(200);
    const expiredCode = (
      await request(app)
        .get(`/api/auth/test-code?email=${encodeURIComponent(expiredEmail)}`)
        .expect(200)
    ).body.code as string;
    await db
      .update(authEmailCodesTable)
      .set({ expiresAt: new Date(Date.now() - 1_000) })
      .where(eq(authEmailCodesTable.email, expiredEmail));

    const expired = await request(app)
      .post("/api/auth/verify-code")
      .send({ email: expiredEmail, purpose: "email", code: expiredCode })
      .expect(400);
    expect(expired.body).toEqual(incorrect.body);

    await request(app)
      .post("/api/auth/request-code")
      .send({ email: expiredEmail, purpose: "email" })
      .expect(200);
    const replacementExpiredCode = (
      await request(app)
        .get(`/api/auth/test-code?email=${encodeURIComponent(expiredEmail)}`)
        .expect(200)
    ).body.code as string;
    await request(app)
      .post("/api/auth/verify-code")
      .send({ email: expiredEmail, purpose: "email", code: replacementExpiredCode })
      .expect(200);

    await request(app)
      .post("/api/auth/test-cleanup")
      .send({ emails: [consumedEmail, expiredEmail] })
      .expect(200);
  });

  it("creates a new account only after a valid email code", async () => {
    const email = `auth-signup-${Date.now()}@example.com`;
    createdEmails.push(email);
    await seedCode({ email, purpose: "email", code: "654321" });

    const browser = request.agent(app);
    const response = await browser
      .post("/api/auth/verify-code")
      .send({ email, purpose: "email", code: "654321" })
      .expect(200);
    const userId = response.body.user.id as string;
    createdUserIds.push(userId);
    expect(response.body.user.email).toBe(email);
    expect(userId).toBeTruthy();
  });

  it("provides a non-production fixture code without exposing email content", async () => {
    const email = `auth-fixture-${Date.now()}@e2e.discipleos.test`;
    createdEmails.push(email);

    await request(app)
      .post("/api/auth/request-code")
      .send({ email, purpose: "email" })
      .expect(200);

    const codeResponse = await request(app)
      .get(`/api/auth/test-code?email=${encodeURIComponent(email)}`)
      .expect(200);
    expect(codeResponse.body).toEqual({
      success: true,
      code: expect.stringMatching(/^\d{6}$/),
    });
    await request(app)
      .get(`/api/auth/test-code?email=${encodeURIComponent(email)}`)
      .expect(404);
  });

  it("cleans up reserved auth fixture data idempotently", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const email = `auth-cleanup-${suffix}@e2e.discipleos.test`;
    const planId = `auth-cleanup-plan-${suffix}`;
    const eventId = `auth-cleanup-event-${suffix}`;

    await request(app)
      .post("/api/auth/request-code")
      .send({ email, purpose: "email" })
      .expect(200);
    const code = await request(app)
      .get(`/api/auth/test-code?email=${encodeURIComponent(email)}`)
      .expect(200);
    const browser = request.agent(app);
    const verified = await browser
      .post("/api/auth/verify-code")
      .send({ email, purpose: "email", code: code.body.code })
      .expect(200);
    const userId = verified.body.user.id as string;

    await browser
      .post("/api/events")
      .send({
        id: eventId,
        title: "Fixture event",
        type: "prayer",
        date: "2026-09-20",
        time: "07:00",
      })
      .expect(200);
    await browser
      .post("/api/reading/plans")
      .send({
        id: planId,
        name: "Fixture plan",
        templateKey: "custom",
        assignments: [],
        completed: {},
      })
      .expect(200);

    const cleanup = await request(app)
      .post("/api/auth/test-cleanup")
      .send({ emails: [email] })
      .expect(200);
    expect(cleanup.body).toEqual({
      success: true,
      deleted: {
        users: 1,
        events: 1,
        completions: 0,
        sentReminders: 0,
        plans: 1,
        subscriptions: 0,
        settings: 0,
        feedback: 0,
        legacyIdentities: 0,
        sessions: 1,
        codes: 1,
      },
    });

    const repeatCleanup = await request(app)
      .post("/api/auth/test-cleanup")
      .send({ emails: [email] })
      .expect(200);
    expect(repeatCleanup.body).toEqual({
      success: true,
      deleted: {
        users: 0,
        events: 0,
        completions: 0,
        sentReminders: 0,
        plans: 0,
        subscriptions: 0,
        settings: 0,
        feedback: 0,
        legacyIdentities: 0,
        sessions: 0,
        codes: 0,
      },
    });
    expect(
      (await db.select().from(usersTable).where(eq(usersTable.id, userId))).length,
    ).toBe(0);
    expect(
      (await db.select().from(readingPlansTable).where(eq(readingPlansTable.id, planId))).length,
    ).toBe(0);
    expect(
      (await db.select().from(eventsTable).where(eq(eventsTable.id, eventId))).length,
    ).toBe(0);
  });

  it("cleans up anonymous browser data when verification fails before account creation", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const email = `auth-anonymous-cleanup-${suffix}@e2e.discipleos.test`;
    const planId = `auth-anonymous-cleanup-plan-${suffix}`;
    const browser = request.agent(app);

    await browser.get("/api/session/info").expect(200);
    await browser
      .post("/api/reading/plans")
      .send({
        id: planId,
        name: "Anonymous fixture plan",
        templateKey: "custom",
        assignments: [],
        completed: {},
      })
      .expect(200);

    const cleanup = await browser
      .post("/api/auth/test-cleanup")
      .send({ emails: [email] })
      .expect(200);
    expect(cleanup.body.deleted).toEqual(
      expect.objectContaining({ users: 0, plans: 1, codes: 0 }),
    );
    expect(
      (await browser.get("/api/reading/plans").expect(200)).body.plans,
    ).toEqual([]);
  });

  it("connects the current browser's anonymous plan when email verification creates an account", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const email = `auth-plan-claim-${suffix}@example.com`;
    const planId = `auth-plan-claim-${suffix}`;
    createdEmails.push(email);
    createdPlanIds.push(planId);

    const browser = request.agent(app);
    await browser.get("/api/session/info").expect(200);
    await browser
      .post("/api/reading/plans")
      .send({
        id: planId,
        name: "Current browser plan",
        templateKey: "custom",
        assignments: [],
        completed: {},
      })
      .expect(200);

    await seedCode({ email, purpose: "email", code: "246810" });
    const verified = await browser
      .post("/api/auth/verify-code")
      .send({ email, purpose: "email", code: "246810" })
      .expect(200);
    createdUserIds.push(verified.body.user.id as string);

    const claim = await browser.post("/api/account/claim").expect(200);
    expect(claim.body.claimed.plans).toBe(1);

    const plans = await browser.get("/api/reading/plans").expect(200);
    expect(plans.body.plans.map((plan: { id: string }) => plan.id)).toContain(planId);
  });

  it("keeps authenticated account data isolated by local owner ID", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const emailA = `auth-isolation-a-${suffix}@example.com`;
    const emailB = `auth-isolation-b-${suffix}@example.com`;
    const userIdA = `auth-isolation-a-${suffix}`;
    const userIdB = `auth-isolation-b-${suffix}`;
    const eventId = `auth-isolation-event-${suffix}`;
    createdEmails.push(emailA, emailB);
    createdUserIds.push(userIdA, userIdB);
    await db.insert(usersTable).values([
      { id: userIdA, email: emailA },
      { id: userIdB, email: emailB },
    ]);
    await seedCode({ email: emailA });
    await seedCode({ email: emailB });

    const accountA = request.agent(app);
    const accountB = request.agent(app);
    await accountA
      .post("/api/auth/verify-code")
      .send({ email: emailA, purpose: "email", code: "123456" })
      .expect(200);
    await accountB
      .post("/api/auth/verify-code")
      .send({ email: emailB, purpose: "email", code: "123456" })
      .expect(200);

    await accountA
      .post("/api/events")
      .send({
        id: eventId,
        title: "Account A event",
        type: "prayer",
        date: "2026-09-19",
        time: "07:00",
      })
      .expect(200);
    const accountBEvents = await accountB.get("/api/events").expect(200);
    expect(accountBEvents.body.events.map((event: { id: string }) => event.id)).not.toContain(eventId);

    await db.delete(eventsTable).where(eq(eventsTable.id, eventId));
  });
});
