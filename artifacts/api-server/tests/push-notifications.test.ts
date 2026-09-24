/**
 * Push notification integration tests.
 *
 * web-push is mocked at module level so no real VAPID keys or push endpoints
 * are required. All DB operations hit the real Neon test database; test rows
 * use a unique prefix and are cleaned up in afterAll.
 *
 * Scenarios covered:
 *  1. CRON_SECRET guard (missing / wrong / correct)
 *  2. Missing VAPID configuration → 500
 *  3. Subscription creation and per-device renewal via POST /api/push
 *  4. Due-reminder delivery targeting (owner only)
 *  5. Duplicate reminder suppression via sent_reminders
 *  6. Invalid subscription (410) → subscription deleted; other errors → kept
 *  7. sent_reminders only inserted when at least one send succeeds
 */

// ── web-push mock — must be declared before any import that loads web-push ───
import { vi } from "vitest";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import webpush from "web-push";
import { db } from "@workspace/db";
import {
  eventsTable,
  pushSubscriptionsTable,
  sentRemindersTable,
} from "@workspace/db";
import { and, eq, like } from "drizzle-orm";
import { createApp, createPgSessionStore } from "../src/app";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PREFIX = "push-test-";

function uid(label = "") {
  return `${PREFIX}${label}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
}

/** Current UTC date as YYYY-MM-DD */
function todayUTC() {
  const n = new Date();
  const y = n.getUTCFullYear();
  const m = String(n.getUTCMonth() + 1).padStart(2, "0");
  const d = String(n.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Current UTC time as HH:MM */
function nowHHMM() {
  const n = new Date();
  return `${String(n.getUTCHours()).padStart(2, "0")}:${String(n.getUTCMinutes()).padStart(2, "0")}`;
}

function extractCookie(res: request.Response): string {
  const h = res.headers["set-cookie"];
  if (Array.isArray(h)) return h.map((s: string) => s.split(";")[0]).join("; ");
  if (typeof h === "string") return (h as string).split(";")[0];
  return "";
}

const CRON_SECRET = process.env.CRON_SECRET!; // set in vitest.config.ts

// ── Shared app instance ───────────────────────────────────────────────────────

const store = createPgSessionStore();
const app = createApp(store);

// ── Cleanup ───────────────────────────────────────────────────────────────────

afterAll(async () => {
  // Remove all rows created by this test run (identified by the prefix)
  await db.delete(eventsTable).where(like(eventsTable.id, `${PREFIX}%`));
  await db.delete(pushSubscriptionsTable).where(like(pushSubscriptionsTable.endpoint, `https://push-test.example%`));
  await db.delete(sentRemindersTable).where(like(sentRemindersTable.eventId, `${PREFIX}%`));
});

beforeEach(() => {
  // Reset mock state between tests so call counts don't bleed across
  vi.mocked(webpush.setVapidDetails).mockClear();
  vi.mocked(webpush.sendNotification).mockClear();
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. CRON_SECRET guard
// ═════════════════════════════════════════════════════════════════════════════

describe("1 — CRON_SECRET guard", () => {
  it("1a: missing secret → 401", async () => {
    const res = await request(app).post("/api/reminders/send");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("1b: wrong secret → 401", async () => {
    const res = await request(app)
      .post("/api/reminders/send")
      .set("x-cron-secret", "not-the-secret");
    expect(res.status).toBe(401);
  });

  it("1c: correct secret via header → 200", async () => {
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as any);
    const res = await request(app)
      .post("/api/reminders/send")
      .set("x-cron-secret", CRON_SECRET);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("1d: correct secret via query param → 200", async () => {
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as any);
    const res = await request(app)
      .post(`/api/reminders/send?secret=${CRON_SECRET}`);
    expect(res.status).toBe(200);
  });

  it("1e: push/test missing secret → 401", async () => {
    const res = await request(app).post("/api/push/test");
    expect(res.status).toBe(401);
  });

  it("1f: push/test wrong secret → 401", async () => {
    const res = await request(app)
      .post("/api/push/test")
      .set("x-cron-secret", "wrong");
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. Missing / invalid VAPID configuration
// ═════════════════════════════════════════════════════════════════════════════

describe("2 — Missing VAPID configuration", () => {
  // Trigger the VAPID failure by making the mocked setVapidDetails throw.
  // This is equivalent to the real configureWebPush() throwing when env vars
  // are absent, but avoids mutating process.env (which can bleed into later
  // tests if save/restore goes wrong).

  it("2a: /api/reminders/send returns 500 when VAPID setup fails", async () => {
    vi.mocked(webpush.setVapidDetails).mockImplementationOnce(() => {
      throw new Error("Missing VAPID env vars (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)");
    });

    const res = await request(app)
      .post("/api/reminders/send")
      .set("x-cron-secret", CRON_SECRET);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/VAPID/i);
  });

  it("2b: /api/push/test returns 500 when VAPID setup fails", async () => {
    vi.mocked(webpush.setVapidDetails).mockImplementationOnce(() => {
      throw new Error("Missing VAPID env vars (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)");
    });

    const res = await request(app)
      .post("/api/push/test")
      .set("x-cron-secret", CRON_SECRET);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/VAPID/i);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. Subscription creation via POST /api/push
// ═════════════════════════════════════════════════════════════════════════════

describe("3 — Subscription creation", () => {
  let cookie = "";
  const endpoint = `https://push-test.example/sub/${uid("create")}`;

  beforeAll(async () => {
    const res = await request(app).get("/api/session/info");
    cookie = extractCookie(res);
  });

  it("3a: POST /api/push creates a subscription record", async () => {
    const res = await request(app)
      .post("/api/push")
      .set("Cookie", cookie)
      .send({ endpoint, keys: { p256dh: "dGVzdA", auth: "dGVzdA" } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const [row] = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
    expect(row).toBeDefined();
    expect(row.p256dh).toBe("dGVzdA");
  });

  it("3b: same owner can update keys (upsert)", async () => {
    const res = await request(app)
      .post("/api/push")
      .set("Cookie", cookie)
      .send({ endpoint, keys: { p256dh: "bmV3S2V5", auth: "bmV3QXV0aA" } });
    expect(res.status).toBe(200);

    const [row] = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
    expect(row.p256dh).toBe("bmV3S2V5"); // updated
  });

  it("3c: missing required fields → 400", async () => {
    const res = await request(app)
      .post("/api/push")
      .set("Cookie", cookie)
      .send({ endpoint }); // no keys
    expect(res.status).toBe(400);
  });

  it("3d: DELETE /api/push/:endpoint removes the record", async () => {
    const toDelete = `https://push-test.example/del/${uid()}`;
    await request(app)
      .post("/api/push")
      .set("Cookie", cookie)
      .send({ endpoint: toDelete, keys: { p256dh: "a", auth: "b" } });

    const del = await request(app)
      .delete(`/api/push/${encodeURIComponent(toDelete)}`)
      .set("Cookie", cookie);
    expect(del.status).toBe(200);

    const rows = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, toDelete));
    expect(rows).toHaveLength(0);
  });

  it("3e: renewal replaces the previous endpoint for the same device", async () => {
    const deviceId = uid("device-renew");
    const oldEndpoint = `https://push-test.example/renew-old/${uid()}`;
    const newEndpoint = `https://push-test.example/renew-new/${uid()}`;

    await request(app)
      .post("/api/push")
      .set("Cookie", cookie)
      .send({
        deviceId,
        endpoint: oldEndpoint,
        keys: { p256dh: "old-key", auth: "old-auth" },
      });

    const renewed = await request(app)
      .post("/api/push")
      .set("Cookie", cookie)
      .send({
        deviceId,
        previousEndpoint: oldEndpoint,
        endpoint: newEndpoint,
        keys: { p256dh: "new-key", auth: "new-auth" },
      });

    expect(renewed.status).toBe(200);

    const oldRows = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, oldEndpoint));
    const newRows = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, newEndpoint));

    expect(oldRows).toHaveLength(0);
    expect(newRows).toHaveLength(1);
    expect(newRows[0].deviceId).toBe(deviceId);
  });

  it("3f: renewing one device preserves another device for the same owner", async () => {
    const deviceA = uid("device-a");
    const deviceB = uid("device-b");
    const oldEndpointA = `https://push-test.example/device-a-old/${uid()}`;
    const newEndpointA = `https://push-test.example/device-a-new/${uid()}`;
    const endpointB = `https://push-test.example/device-b/${uid()}`;

    await request(app)
      .post("/api/push")
      .set("Cookie", cookie)
      .send({
        deviceId: deviceA,
        endpoint: oldEndpointA,
        keys: { p256dh: "a-old", auth: "a-old" },
      });
    await request(app)
      .post("/api/push")
      .set("Cookie", cookie)
      .send({
        deviceId: deviceB,
        endpoint: endpointB,
        keys: { p256dh: "b", auth: "b" },
      });

    await request(app)
      .post("/api/push")
      .set("Cookie", cookie)
      .send({
        deviceId: deviceA,
        previousEndpoint: oldEndpointA,
        endpoint: newEndpointA,
        keys: { p256dh: "a-new", auth: "a-new" },
      });

    const [newA] = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, newEndpointA));
    const [preservedB] = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpointB));

    expect(newA.deviceId).toBe(deviceA);
    expect(preservedB.deviceId).toBe(deviceB);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. Cross-user subscription isolation
// ═════════════════════════════════════════════════════════════════════════════

describe("4 — Cross-user subscription isolation", () => {
  let cookieA = "";
  let cookieB = "";
  const endpoint = `https://push-test.example/iso/${uid()}`;

  beforeAll(async () => {
    const resA = await request(app).get("/api/session/info");
    cookieA = extractCookie(resA);
    const resB = await request(app).get("/api/session/info");
    cookieB = extractCookie(resB);
  });

  it("4a: user A registers endpoint", async () => {
    const res = await request(app)
      .post("/api/push")
      .set("Cookie", cookieA)
      .send({ endpoint, keys: { p256dh: "a", auth: "b" } });
    expect(res.status).toBe(200);
  });

  it("4b: user B cannot claim user A's endpoint → 403", async () => {
    const res = await request(app)
      .post("/api/push")
      .set("Cookie", cookieB)
      .send({ endpoint, keys: { p256dh: "x", auth: "y" } });
    expect(res.status).toBe(403);
  });

  it("4c: user B delete of user A endpoint is a scoped no-op (not 403)", async () => {
    const res = await request(app)
      .delete(`/api/push/${encodeURIComponent(endpoint)}`)
      .set("Cookie", cookieB);
    expect(res.status).toBe(200); // silent no-op

    // Row still exists (user A owns it)
    const [row] = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
    expect(row).toBeDefined();
  });

  it("4d: rejected takeover does not delete the caller's previous endpoint", async () => {
    const deviceId = uid("takeover-device");
    const userBEndpoint = `https://push-test.example/user-b-current/${uid()}`;

    await request(app)
      .post("/api/push")
      .set("Cookie", cookieB)
      .send({
        deviceId,
        endpoint: userBEndpoint,
        keys: { p256dh: "b", auth: "b" },
      });

    const takeover = await request(app)
      .post("/api/push")
      .set("Cookie", cookieB)
      .send({
        deviceId,
        previousEndpoint: userBEndpoint,
        endpoint,
        keys: { p256dh: "x", auth: "y" },
      });

    expect(takeover.status).toBe(403);
    const [preserved] = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, userBEndpoint));
    expect(preserved).toBeDefined();
  });

  it("4e: concurrent endpoint takeover leaves the losing user's device intact", async () => {
    const contestedEndpoint = `https://push-test.example/contested/${uid()}`;
    const deviceA = uid("race-device-a");
    const deviceB = uid("race-device-b");
    const currentA = `https://push-test.example/race-a-current/${uid()}`;
    const currentB = `https://push-test.example/race-b-current/${uid()}`;

    await request(app)
      .post("/api/push")
      .set("Cookie", cookieA)
      .send({
        deviceId: deviceA,
        endpoint: currentA,
        keys: { p256dh: "a", auth: "a" },
      });
    await request(app)
      .post("/api/push")
      .set("Cookie", cookieB)
      .send({
        deviceId: deviceB,
        endpoint: currentB,
        keys: { p256dh: "b", auth: "b" },
      });

    const [resultA, resultB] = await Promise.all([
      request(app)
        .post("/api/push")
        .set("Cookie", cookieA)
        .send({
          deviceId: deviceA,
          previousEndpoint: currentA,
          endpoint: contestedEndpoint,
          keys: { p256dh: "a-new", auth: "a-new" },
        }),
      request(app)
        .post("/api/push")
        .set("Cookie", cookieB)
        .send({
          deviceId: deviceB,
          previousEndpoint: currentB,
          endpoint: contestedEndpoint,
          keys: { p256dh: "b-new", auth: "b-new" },
        }),
    ]);

    expect([resultA.status, resultB.status].sort()).toEqual([200, 403]);

    const losingEndpoint = resultA.status === 403 ? currentA : currentB;
    const [losingRow] = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, losingEndpoint));
    expect(losingRow).toBeDefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. Due-reminder delivery targeting
// ═════════════════════════════════════════════════════════════════════════════

describe("5 — Due-reminder delivery targeting", () => {
  let ownerCookie = "";
  let ownerUserId = "";
  let otherCookie = "";
  const eventId = uid("evt");
  const ownerEndpoint = `https://push-test.example/owner/${uid()}`;
  const ownerSecondEndpoint = `https://push-test.example/owner-second/${uid()}`;
  const otherEndpoint = `https://push-test.example/other/${uid()}`;

  beforeAll(async () => {
    // Set up owner session
    const ownerRes = await request(app).get("/api/session/info");
    ownerCookie = extractCookie(ownerRes);
    ownerUserId = ownerRes.body.userId;

    // Set up other-user session
    const otherRes = await request(app).get("/api/session/info");
    otherCookie = extractCookie(otherRes);
    const otherUserId = otherRes.body.userId;

    // Create a due event owned by owner (reminderMinutes=0 → due exactly at now)
    await db.insert(eventsTable).values({
      id: eventId,
      userId: ownerUserId,
      title: "Test Reminder Event",
      type: "prayer",
      date: todayUTC(),
      time: nowHHMM(),
      reminderMinutes: 0,
      remind: true,
      timeZone: "UTC",
      repeat: "none",
      repeatWeekdays: [],
      notes: "",
    });

    // Register owner's push subscription
    await request(app)
      .post("/api/push")
      .set("Cookie", ownerCookie)
      .send({
        deviceId: uid("owner-device-1"),
        endpoint: ownerEndpoint,
        keys: { p256dh: "ownerKey", auth: "ownerAuth" },
      });

    await request(app)
      .post("/api/push")
      .set("Cookie", ownerCookie)
      .send({
        deviceId: uid("owner-device-2"),
        endpoint: ownerSecondEndpoint,
        keys: { p256dh: "ownerKey2", auth: "ownerAuth2" },
      });

    // Register other-user's subscription (should NOT receive owner's reminder)
    await request(app)
      .post("/api/push")
      .set("Cookie", otherCookie)
      .send({ endpoint: otherEndpoint, keys: { p256dh: "otherKey", auth: "otherAuth" } });
  });

  it("5a: sends to owner's subscription with correct payload; skips other users", async () => {
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/reminders/send")
      .set("x-cron-secret", CRON_SECRET);

    expect(res.status).toBe(200);
    expect(res.body.sent).toBeGreaterThanOrEqual(1);

    const calls = vi.mocked(webpush.sendNotification).mock.calls;
    const calledEndpoints = calls.map((c) => (c[0] as any).endpoint);

    // Owner's subscription must have been targeted
    expect(calledEndpoints).toContain(ownerEndpoint);
    expect(calledEndpoints).toContain(ownerSecondEndpoint);

    // Other user's subscription must NOT have been targeted
    expect(calledEndpoints).not.toContain(otherEndpoint);

    // Payload for the owner's call has the correct title and idempotency tag
    const ownerCall = calls.find((c) => (c[0] as any).endpoint === ownerEndpoint);
    expect(ownerCall).toBeDefined();
    const payload = JSON.parse(ownerCall![1] as string);
    expect(payload.title).toBe("Test Reminder Event");
    expect(payload.tag).toBe(`discipleos-${eventId}-${todayUTC()}`);

    const sentRows = await db
      .select()
      .from(sentRemindersTable)
      .where(eq(sentRemindersTable.eventId, eventId));
    expect(sentRows).toHaveLength(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. Duplicate reminder suppression (sent_reminders)
// ═════════════════════════════════════════════════════════════════════════════

describe("6 — Duplicate reminder suppression", () => {
  let ownerCookie = "";
  let ownerUserId = "";
  const eventId = uid("dup");
  const endpoint = `https://push-test.example/dup/${uid()}`;

  beforeAll(async () => {
    const ownerRes = await request(app).get("/api/session/info");
    ownerCookie = extractCookie(ownerRes);
    ownerUserId = ownerRes.body.userId;

    await db.insert(eventsTable).values({
      id: eventId,
      userId: ownerUserId,
      title: "Duplicate Test Event",
      type: "prayer",
      date: todayUTC(),
      time: nowHHMM(),
      reminderMinutes: 0,
      remind: true,
      timeZone: "UTC",
      repeat: "none",
      repeatWeekdays: [],
      notes: "",
    });

    await request(app)
      .post("/api/push")
      .set("Cookie", ownerCookie)
      .send({ endpoint, keys: { p256dh: "key", auth: "auth" } });
  });

  it("6a: first call sends the notification", async () => {
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/reminders/send")
      .set("x-cron-secret", CRON_SECRET);

    expect(res.status).toBe(200);
    const callCount = vi.mocked(webpush.sendNotification).mock.calls.filter(
      (c) => (c[0] as any).endpoint === endpoint
    ).length;
    expect(callCount).toBeGreaterThanOrEqual(1);
  });

  it("6b: second call (same cron cycle) does NOT send again", async () => {
    vi.mocked(webpush.sendNotification).mockClear();
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/reminders/send")
      .set("x-cron-secret", CRON_SECRET);

    expect(res.status).toBe(200);

    // This event should be skipped — sent_reminders row exists from call 6a
    const callsForThisEndpoint = vi.mocked(webpush.sendNotification).mock.calls.filter(
      (c) => (c[0] as any).endpoint === endpoint
    );
    expect(callsForThisEndpoint).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6b. Editing an event mints a new reminder identity
// ═════════════════════════════════════════════════════════════════════════════

describe("6b — Edited event reminders use a fresh identity", () => {
  let ownerCookie = "";
  let ownerUserId = "";
  const originalEventId = uid("edited-original");
  const editedEventId = uid("edited-replacement");
  const endpoint = `https://push-test.example/edited/${uid()}`;

  beforeAll(async () => {
    const ownerRes = await request(app).get("/api/session/info");
    ownerCookie = extractCookie(ownerRes);
    ownerUserId = ownerRes.body.userId;

    await db.insert(eventsTable).values({
      id: originalEventId,
      userId: ownerUserId,
      title: "Original reminder",
      type: "prayer",
      date: todayUTC(),
      time: nowHHMM(),
      reminderMinutes: 0,
      remind: true,
      timeZone: "UTC",
      repeat: "none",
      repeatWeekdays: [],
      notes: "Original reminder content",
    });

    await request(app)
      .post("/api/push")
      .set("Cookie", ownerCookie)
      .send({ endpoint, keys: { p256dh: "key", auth: "auth" } });
  });

  it("sends the original reminder once", async () => {
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/reminders/send")
      .set("x-cron-secret", CRON_SECRET);

    expect(res.status).toBe(200);
    expect(
      vi.mocked(webpush.sendNotification).mock.calls.filter(
        (call) => (call[0] as any).endpoint === endpoint,
      ),
    ).toHaveLength(1);

    const sentRows = await db
      .select()
      .from(sentRemindersTable)
      .where(eq(sentRemindersTable.eventId, originalEventId));
    expect(sentRows).toHaveLength(1);
  });

  it("replaces the edited event with a new reminder identity", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("Cookie", ownerCookie)
      .send({
        id: editedEventId,
        replacesEventId: originalEventId,
        title: "Edited reminder",
        type: "prayer",
        date: todayUTC(),
        time: nowHHMM(),
        reminderMinutes: 0,
        remind: true,
        timeZone: "UTC",
        repeat: "none",
        repeatWeekdays: [],
        notes: "Edited reminder content",
      });

    expect(res.status).toBe(200);
    expect(res.body.event).toMatchObject({
      id: editedEventId,
      title: "Edited reminder",
      notes: "Edited reminder content",
    });

    const oldRows = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, originalEventId));
    const editedRows = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, editedEventId));
    expect(oldRows).toHaveLength(0);
    expect(editedRows).toHaveLength(1);
  });

  it("sends the edited reminder once despite the original sent record", async () => {
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/reminders/send")
      .set("x-cron-secret", CRON_SECRET);

    expect(res.status).toBe(200);
    expect(
      vi.mocked(webpush.sendNotification).mock.calls.filter(
        (call) => (call[0] as any).endpoint === endpoint,
      ),
    ).toHaveLength(1);

    const sentRows = await db
      .select()
      .from(sentRemindersTable)
      .where(eq(sentRemindersTable.eventId, editedEventId));
    expect(sentRows).toHaveLength(1);
  });

  it("does not duplicate the edited reminder on a subsequent cron pass", async () => {
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/reminders/send")
      .set("x-cron-secret", CRON_SECRET);

    expect(res.status).toBe(200);
    expect(
      vi.mocked(webpush.sendNotification).mock.calls.filter(
        (call) => (call[0] as any).endpoint === endpoint,
      ),
    ).toHaveLength(0);

    const sentRows = await db
      .select()
      .from(sentRemindersTable)
      .where(eq(sentRemindersTable.eventId, editedEventId));
    expect(sentRows).toHaveLength(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. Invalid subscription handling (expired / gone endpoints)
// ═════════════════════════════════════════════════════════════════════════════

describe("7 — Invalid subscription handling", () => {
  let ownerCookie = "";
  let ownerUserId = "";

  beforeAll(async () => {
    const ownerRes = await request(app).get("/api/session/info");
    ownerCookie = extractCookie(ownerRes);
    ownerUserId = ownerRes.body.userId;
  });

  it("7a: 410 (Gone) response from push service → subscription deleted", async () => {
    const eventId = uid("exp");
    const endpoint = `https://push-test.example/exp/${uid()}`;

    await db.insert(eventsTable).values({
      id: eventId,
      userId: ownerUserId,
      title: "Expired Sub Event",
      type: "prayer",
      date: todayUTC(),
      time: nowHHMM(),
      reminderMinutes: 0,
      remind: true,
      timeZone: "UTC",
      repeat: "none",
      repeatWeekdays: [],
      notes: "",
    });

    await request(app)
      .post("/api/push")
      .set("Cookie", ownerCookie)
      .send({ endpoint, keys: { p256dh: "k", auth: "a" } });

    // Simulate push service returning 410 Gone
    const err410 = Object.assign(new Error("Gone"), { statusCode: 410 });
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce(err410);

    await request(app)
      .post("/api/reminders/send")
      .set("x-cron-secret", CRON_SECRET);

    // Subscription must have been deleted
    const rows = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
    expect(rows).toHaveLength(0);
  });

  it("7b: 404 (Not Found) response → subscription deleted", async () => {
    const eventId = uid("404");
    const endpoint = `https://push-test.example/404/${uid()}`;

    await db.insert(eventsTable).values({
      id: eventId,
      userId: ownerUserId,
      title: "404 Sub Event",
      type: "prayer",
      date: todayUTC(),
      time: nowHHMM(),
      reminderMinutes: 0,
      remind: true,
      timeZone: "UTC",
      repeat: "none",
      repeatWeekdays: [],
      notes: "",
    });

    await request(app)
      .post("/api/push")
      .set("Cookie", ownerCookie)
      .send({ endpoint, keys: { p256dh: "k", auth: "a" } });

    const err404 = Object.assign(new Error("Not Found"), { statusCode: 404 });
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce(err404);

    await request(app)
      .post("/api/reminders/send")
      .set("x-cron-secret", CRON_SECRET);

    const rows = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
    expect(rows).toHaveLength(0);
  });

  it("7c: non-410/404 error → subscription is kept (transient failure)", async () => {
    const eventId = uid("transient");
    const endpoint = `https://push-test.example/transient/${uid()}`;

    await db.insert(eventsTable).values({
      id: eventId,
      userId: ownerUserId,
      title: "Transient Fail Event",
      type: "prayer",
      date: todayUTC(),
      time: nowHHMM(),
      reminderMinutes: 0,
      remind: true,
      timeZone: "UTC",
      repeat: "none",
      repeatWeekdays: [],
      notes: "",
    });

    await request(app)
      .post("/api/push")
      .set("Cookie", ownerCookie)
      .send({ endpoint, keys: { p256dh: "k", auth: "a" } });

    // Simulate a transient network error (no statusCode property → not 404/410)
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce(new Error("Connection reset"));

    await request(app)
      .post("/api/reminders/send")
      .set("x-cron-secret", CRON_SECRET);

    // Subscription must be retained for retry
    const rows = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
    expect(rows).toHaveLength(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. sent_reminders only inserted when at least one send succeeds
// ═════════════════════════════════════════════════════════════════════════════

describe("8 — sent_reminders insert gating", () => {
  let ownerCookie = "";
  let ownerUserId = "";

  beforeAll(async () => {
    const ownerRes = await request(app).get("/api/session/info");
    ownerCookie = extractCookie(ownerRes);
    ownerUserId = ownerRes.body.userId;
  });

  it("8a: all sends fail → no sent_reminders row → event retried next run", async () => {
    const eventId = uid("nosend");
    const endpoint = `https://push-test.example/nosend/${uid()}`;

    await db.insert(eventsTable).values({
      id: eventId,
      userId: ownerUserId,
      title: "No Send Event",
      type: "prayer",
      date: todayUTC(),
      time: nowHHMM(),
      reminderMinutes: 0,
      remind: true,
      timeZone: "UTC",
      repeat: "none",
      repeatWeekdays: [],
      notes: "",
    });

    await request(app)
      .post("/api/push")
      .set("Cookie", ownerCookie)
      .send({ endpoint, keys: { p256dh: "k", auth: "a" } });

    // All sends fail with a transient error
    vi.mocked(webpush.sendNotification).mockRejectedValue(new Error("Network down"));

    await request(app)
      .post("/api/reminders/send")
      .set("x-cron-secret", CRON_SECRET);

    // No sent_reminders row — event can be retried
    const rows = await db
      .select()
      .from(sentRemindersTable)
      .where(eq(sentRemindersTable.eventId, eventId));
    expect(rows).toHaveLength(0);

    // Cleanup
    vi.mocked(webpush.sendNotification).mockReset();
    await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint));
    await db.delete(eventsTable).where(eq(eventsTable.id, eventId));
  });

  it("8b: no subscriptions for user → no sent_reminders row", async () => {
    const eventId = uid("nosub");
    // Use a fresh userId (new session) so no subscriptions exist for them
    const noSubRes = await request(app).get("/api/session/info");
    const noSubCookie = extractCookie(noSubRes);
    const noSubUserId = noSubRes.body.userId;

    await db.insert(eventsTable).values({
      id: eventId,
      userId: noSubUserId,
      title: "No Sub Event",
      type: "prayer",
      date: todayUTC(),
      time: nowHHMM(),
      reminderMinutes: 0,
      remind: true,
      timeZone: "UTC",
      repeat: "none",
      repeatWeekdays: [],
      notes: "",
    });

    vi.mocked(webpush.sendNotification).mockResolvedValue({} as any);

    await request(app)
      .post("/api/reminders/send")
      .set("x-cron-secret", CRON_SECRET);

    const rows = await db
      .select()
      .from(sentRemindersTable)
      .where(eq(sentRemindersTable.eventId, eventId));
    expect(rows).toHaveLength(0);

    // Cleanup
    await db.delete(eventsTable).where(eq(eventsTable.id, eventId));
  });

  it("8c: at least one send succeeds → sent_reminders row inserted", async () => {
    const eventId = uid("onesend");
    const endpoint = `https://push-test.example/onesend/${uid()}`;

    await db.insert(eventsTable).values({
      id: eventId,
      userId: ownerUserId,
      title: "One Send Event",
      type: "prayer",
      date: todayUTC(),
      time: nowHHMM(),
      reminderMinutes: 0,
      remind: true,
      timeZone: "UTC",
      repeat: "none",
      repeatWeekdays: [],
      notes: "",
    });

    await request(app)
      .post("/api/push")
      .set("Cookie", ownerCookie)
      .send({ endpoint, keys: { p256dh: "k", auth: "a" } });

    vi.mocked(webpush.sendNotification).mockResolvedValue({} as any);

    await request(app)
      .post("/api/reminders/send")
      .set("x-cron-secret", CRON_SECRET);

    const rows = await db
      .select()
      .from(sentRemindersTable)
      .where(eq(sentRemindersTable.eventId, eventId));
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});
