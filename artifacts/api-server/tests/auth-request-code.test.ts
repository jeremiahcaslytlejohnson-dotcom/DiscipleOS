import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  authEmailCodesTable,
  db,
  usersTable,
} from "@workspace/db";

const resendProxy = vi.hoisted(() => vi.fn());

vi.mock("@replit/connectors-sdk", () => ({
  ReplitConnectors: class {
    proxy = resendProxy;
  },
}));

import { createApp, createPgSessionStore } from "../src/app";
import { hashVerificationCode } from "../src/lib/auth-codes";

const app = createApp(createPgSessionStore());
const createdEmails: string[] = [];
const createdUserIds: string[] = [];

function sentCodeFor(email: string) {
  const call = resendProxy.mock.calls.find(([, , init]) => {
    const body = JSON.parse(init.body as string);
    return body.to.includes(email);
  });
  if (!call) throw new Error(`No delivery captured for ${email}`);
  const body = JSON.parse(call[2].body as string);
  return JSON.parse(call[2].body as string) as {
    from: string;
    to: string[];
    subject: string;
    text: string;
  };
}

function codeFromDelivery(email: string) {
  const body = sentCodeFor(email);
  const match = body.text.match(/\b(\d{6})\b/);
  if (!match) throw new Error(`No verification code captured for ${email}`);
  return match[1];
}

describe("generic passwordless email-code requests", () => {
  beforeEach(() => {
    resendProxy.mockReset();
    resendProxy.mockResolvedValue(new Response(null, { status: 200 }));
    process.env.RESEND_FROM = "login@discipleos.app";
  });

  afterAll(async () => {
    for (const email of createdEmails) {
      await db.delete(authEmailCodesTable).where(eq(authEmailCodesTable.email, email));
      await db.delete(usersTable).where(eq(usersTable.email, email));
    }
    for (const id of createdUserIds) {
      await db.delete(usersTable).where(eq(usersTable.id, id));
    }
  });

  it("returns the same generic response and delivers codes for new and existing emails", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newEmail = `auth-request-new-${suffix}@example.com`;
    const existingEmail = `auth-request-existing-${suffix}@example.com`;
    const existingUserId = `auth-request-existing-user-${suffix}`;
    createdEmails.push(newEmail, existingEmail);
    createdUserIds.push(existingUserId);
    await db.insert(usersTable).values({ id: existingUserId, email: existingEmail });

    const newResponse = await request(app)
      .post("/api/auth/request-code")
      .send({ email: newEmail, purpose: "email" })
      .expect(200);
    const existingResponse = await request(app)
      .post("/api/auth/request-code")
      .send({ email: existingEmail, purpose: "email" })
      .expect(200);

    expect(existingResponse.body).toEqual(newResponse.body);
    expect(newResponse.body).toEqual({
      success: true,
      next: "code",
      message: "If the address is eligible, a verification code was sent.",
    });
    expect(resendProxy).toHaveBeenCalledTimes(2);

    const newCode = codeFromDelivery(newEmail);
    const existingCode = codeFromDelivery(existingEmail);
    const newCodes = await db
      .select()
      .from(authEmailCodesTable)
      .where(eq(authEmailCodesTable.email, newEmail));
    const existingCodes = await db
      .select()
      .from(authEmailCodesTable)
      .where(eq(authEmailCodesTable.email, existingEmail));

    expect(newCodes).toHaveLength(1);
    expect(existingCodes).toHaveLength(1);
    expect(newCodes[0].codeHash).not.toContain(newCode);
    expect(existingCodes[0].codeHash).not.toContain(existingCode);
  });

  it("serializes concurrent code requests with real PostgreSQL", async () => {
    const email = `auth-request-concurrent-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    createdEmails.push(email);

    const responses = await Promise.all([
      request(app)
        .post("/api/auth/request-code")
        .send({ email, purpose: "email" }),
      request(app)
        .post("/api/auth/request-code")
        .send({ email, purpose: "email" }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 429]);
    expect(resendProxy).toHaveBeenCalledTimes(1);
    const codes = await db
      .select()
      .from(authEmailCodesTable)
      .where(eq(authEmailCodesTable.email, email));
    expect(codes).toHaveLength(1);
  });

  it("enforces the hourly IP limit across distinct emails in PostgreSQL", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const requestIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
    const emails = Array.from(
      { length: 21 },
      (_, index) => `auth-request-ip-limit-${suffix}-${index}@example.com`,
    );
    createdEmails.push(...emails);

    const responses = [];
    for (const email of emails) {
      responses.push(
        await request(app)
          .post("/api/auth/request-code")
          .set("x-forwarded-for", requestIp)
          .send({ email, purpose: "email" }),
      );
    }

    expect(responses.slice(0, 20).map((response) => response.status)).toEqual(
      Array(20).fill(200),
    );
    expect(responses[20].status).toBe(429);
    expect(resendProxy).toHaveBeenCalledTimes(20);
    const ipRows = await db
      .select()
      .from(authEmailCodesTable)
      .where(eq(authEmailCodesTable.requestIp, requestIp));
    expect(ipRows).toHaveLength(20);
  });

  it("removes a failed email reservation and allows an immediate retry", async () => {
    const email = `auth-request-delivery-failure-${Date.now()}@example.com`;
    createdEmails.push(email);
    resendProxy.mockResolvedValueOnce(new Response(null, { status: 503 }));

    await request(app)
      .post("/api/auth/request-code")
      .send({ email, purpose: "email" })
      .expect(502);

    const afterFailure = await db
      .select()
      .from(authEmailCodesTable)
      .where(eq(authEmailCodesTable.email, email));
    expect(afterFailure).toHaveLength(0);

    await request(app)
      .post("/api/auth/request-code")
      .send({ email, purpose: "email" })
      .expect(200);

    expect(resendProxy).toHaveBeenCalledTimes(2);
    const afterRetry = await db
      .select()
      .from(authEmailCodesTable)
      .where(eq(authEmailCodesTable.email, email));
    expect(afterRetry).toHaveLength(1);
    expect(afterRetry[0].consumedAt).toBeNull();
  });

  it("creates one account for a new email and reuses it on later verification", async () => {
    const email = `auth-request-account-${Date.now()}@example.com`;
    createdEmails.push(email);

    await request(app)
      .post("/api/auth/request-code")
      .send({ email, purpose: "email" })
      .expect(200);
    const firstCode = codeFromDelivery(email);

    const firstBrowser = request.agent(app);
    const firstVerification = await firstBrowser
      .post("/api/auth/verify-code")
      .send({ email, purpose: "email", code: firstCode })
      .expect(200);
    const userId = firstVerification.body.user.id as string;
    createdUserIds.push(userId);

    const { hash, salt } = hashVerificationCode("654321");
    await db.insert(authEmailCodesTable).values({
      email,
      purpose: "email",
      codeHash: hash,
      codeSalt: salt,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      requestIp: "auth-request-test",
    });

    const secondVerification = await request(app)
      .post("/api/auth/verify-code")
      .send({ email, purpose: "email", code: "654321" })
      .expect(200);
    expect(secondVerification.body.user.id).toBe(userId);

    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    expect(users).toHaveLength(1);
  });
});