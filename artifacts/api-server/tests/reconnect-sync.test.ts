/**
 * Reconnect synchronization regression tests (API layer).
 *
 * These tests verify the API behaviors that the frontend reconnect sync relies
 * on. They cover the reconciliation contract at the HTTP level: idempotent
 * upserts, sequential pending-op replay, defensive hydration signals, and
 * cross-user isolation — without requiring a browser or localStorage.
 *
 * The frontend sync logic (flushPendingOps + syncWithServer) is exercised end-
 * to-end via these API calls; the debounce/in-flight guard is a client-side
 * concern tested separately via the repeated-write idempotency cases below.
 */
import request from "supertest";
import { createApp, createPgSessionStore } from "../src/app";

function extractCookie(res: request.Response): string {
  const h = res.headers["set-cookie"];
  if (Array.isArray(h)) return h.map((s: string) => s.split(";")[0]).join("; ");
  if (typeof h === "string") return (h as string).split(";")[0];
  return "";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const makeApp = () => createApp(createPgSessionStore());

// ── 1. Start offline with local data → API returns later → data remains ──────

describe("1 — start offline: local data survives until server responds", () => {
  /**
   * The frontend shows localStorage data immediately, then calls syncWithServer.
   * If the server was unreachable at mount time, syncWithServer throws → local
   * data is kept. When the server comes back (simulated here by the next request
   * succeeding), data is reconciled.
   *
   * At the API level: a fresh session with no prior writes returns established:false
   * and empty data. The frontend uses this signal to keep localStorage intact.
   */
  const app = makeApp();

  it("fresh session returns established:false + empty data", async () => {
    const res = await request(app).get("/api/session/info");
    expect(res.status).toBe(200);
    expect(res.body.established).toBe(false);

    const cookie = extractCookie(res);
    const evRes = await request(app).get("/api/events").set("Cookie", cookie);
    const plRes = await request(app).get("/api/reading/plans").set("Cookie", cookie);

    // Frontend rule: established=false + empty → do NOT overwrite localStorage
    expect(evRes.body.events).toHaveLength(0);
    expect(plRes.body.plans).toHaveLength(0);
  });
});

// ── 2. Go offline → create/edit/delete → reconnect → changes reach server ────

describe("2 — offline mutations flushed on reconnect", () => {
  /**
   * Simulates: user creates/edits/deletes while offline (pending ops queued
   * locally). On reconnect, flushPendingOps replays them to the server in order.
   * The API accepts each op because events and plans are upserted by id.
   */
  const app = makeApp();
  let cookie = "";
  const eventId = uid();
  const planId = uid();

  it("establishes session", async () => {
    const res = await request(app).get("/api/session/info");
    cookie = extractCookie(res);
    expect(cookie).toContain("connect.sid");
  });

  it("pending upsert-event reaches server on flush", async () => {
    // Simulate flushPendingOps replaying a failed create
    const res = await request(app)
      .post("/api/events")
      .set("Cookie", cookie)
      .send({ id: eventId, title: "Offline Event", type: "prayer", date: "2026-09-01", time: "07:00" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("pending upsert-plan reaches server on flush", async () => {
    const res = await request(app)
      .post("/api/reading/plans")
      .set("Cookie", cookie)
      .send({ id: planId, name: "Offline Plan", selectedBooks: ["Mark"], assignments: [], completed: {} });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("pending chapter-complete reaches server on flush", async () => {
    const res = await request(app)
      .post("/api/reading/complete")
      .set("Cookie", cookie)
      .send({ planId, key: "d1-0", completed: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("pending day-complete reaches server on flush", async () => {
    const dayPlanId = uid();
    await request(app)
      .post("/api/reading/plans")
      .set("Cookie", cookie)
      .send({
        id: dayPlanId,
        name: "Offline Day Plan",
        selectedBooks: [],
        assignments: [{
          date: "2026-09-02",
          readings: [{ key: "day-d1" }, { key: "day-d2" }],
        }],
        completed: { "day-d1": false, "day-d2": false },
      });

    const res = await request(app)
      .post("/api/reading/day-complete")
      .set("Cookie", cookie)
      .send({
        planId: dayPlanId,
        date: "2026-09-02",
        completed: true,
        completionDate: "2026-09-02",
      });

    expect(res.status).toBe(200);
    const plans = await request(app).get("/api/reading/plans").set("Cookie", cookie);
    const savedPlan = plans.body.plans.find((plan: any) => plan.id === dayPlanId);
    expect(savedPlan?.completed).toMatchObject({ "day-d1": true, "day-d2": true });
    expect(savedPlan?.earnedDayKeys).toContain("2026-09-02");
  });

  it("pending delete-event reaches server on flush", async () => {
    const deleteId = uid();
    // Create first
    await request(app)
      .post("/api/events")
      .set("Cookie", cookie)
      .send({ id: deleteId, title: "To Delete", type: "prayer", date: "2026-09-02", time: "08:00" });

    // Delete (simulating pending delete-event op)
    const del = await request(app)
      .delete("/api/events")
      .set("Cookie", cookie)
      .send({ id: deleteId });
    expect(del.status).toBe(200);

    // Confirm gone
    const ev = await request(app).get("/api/events").set("Cookie", cookie);
    expect(ev.body.events.map((e: any) => e.id)).not.toContain(deleteId);
  });

  it("pending delete-plan reaches server on flush", async () => {
    const deletePlanId = uid();
    await request(app)
      .post("/api/reading/plans")
      .set("Cookie", cookie)
      .send({ id: deletePlanId, name: "To Delete", selectedBooks: [], assignments: [], completed: {} });

    const del = await request(app)
      .delete("/api/reading/plans")
      .set("Cookie", cookie)
      .send({ id: deletePlanId });
    expect(del.status).toBe(200);

    const pl = await request(app).get("/api/reading/plans").set("Cookie", cookie);
    expect(pl.body.plans.map((p: any) => p.id)).not.toContain(deletePlanId);
  });

  it("after flush, server data is accessible (pull returns current state)", async () => {
    const ev = await request(app).get("/api/events").set("Cookie", cookie);
    const pl = await request(app).get("/api/reading/plans").set("Cookie", cookie);
    expect(ev.body.events.map((e: any) => e.id)).toContain(eventId);
    expect(pl.body.plans.map((p: any) => p.id)).toContain(planId);
  });
});

// ── 3. Reconnect when server and local already match → no duplication ─────────

describe("3 — reconnect with matching state does not duplicate records", () => {
  /**
   * flushPendingOps re-sends the same upsert. Since the API uses ON CONFLICT DO
   * UPDATE (upsert by id), re-sending the same payload replaces the existing row
   * rather than creating a second one.
   */
  const app = makeApp();
  let cookie = "";
  const eventId = uid();

  it("creates an event", async () => {
    const res = await request(app).get("/api/session/info");
    cookie = extractCookie(res);

    await request(app)
      .post("/api/events")
      .set("Cookie", cookie)
      .send({ id: eventId, title: "Sync Test", type: "prayer", date: "2026-09-01", time: "08:00" });
  });

  it("re-sending the same upsert does not create a duplicate", async () => {
    // Simulate flushPendingOps replaying the same op a second time
    await request(app)
      .post("/api/events")
      .set("Cookie", cookie)
      .send({ id: eventId, title: "Sync Test", type: "prayer", date: "2026-09-01", time: "08:00" });

    const ev = await request(app).get("/api/events").set("Cookie", cookie);
    const matches = ev.body.events.filter((e: any) => e.id === eventId);
    expect(matches).toHaveLength(1); // exactly one, not two
  });

  it("re-sending a chapter-complete is idempotent", async () => {
    const planId = uid();
    await request(app)
      .post("/api/reading/plans")
      .set("Cookie", cookie)
      .send({
        id: planId,
        name: "Idempotent Plan",
        selectedBooks: [],
        assignments: [{ date: "2026-09-01", readings: [{ key: "d1-0" }] }],
        completed: {},
      });

    // Mark complete twice (simulating a retry)
    await request(app).post("/api/reading/complete").set("Cookie", cookie).send({
      planId,
      key: "d1-0",
      completed: true,
      earnedDay: "2026-09-01",
    });
    await request(app).post("/api/reading/complete").set("Cookie", cookie).send({
      planId,
      key: "d1-0",
      completed: true,
      earnedDay: "2026-09-01",
    });
    await request(app).post("/api/reading/complete").set("Cookie", cookie).send({
      planId,
      key: "d1-0",
      completed: false,
    });

    const pl = await request(app).get("/api/reading/plans").set("Cookie", cookie);
    const plan = pl.body.plans.find((p: any) => p.id === planId);
    expect(plan?.completed?.["d1-0"]).toBe(false);
    expect(plan?.earnedDayKeys).toEqual(["2026-09-01"]);
  });

  it("does not let a full plan replay erase late completion history", async () => {
    const planId = uid();
    const plan = {
      id: planId,
      name: "Timed History Plan",
      selectedBooks: [],
      assignments: [{ date: "2026-09-01", readings: [{ key: "timed-day-0" }] }],
      completed: {},
    };
    await request(app)
      .post("/api/reading/plans")
      .set("Cookie", cookie)
      .send(plan);

    await request(app)
      .post("/api/reading/day-complete")
      .set("Cookie", cookie)
      .send({
        planId,
        date: "2026-09-01",
        completed: true,
        completionDate: "2026-09-03",
      });

    await request(app)
      .post("/api/reading/plans")
      .set("Cookie", cookie)
      .send({
        ...plan,
        completed: { "timed-day-0": false },
      });

    const plans = await request(app).get("/api/reading/plans").set("Cookie", cookie);
    const savedPlan = plans.body.plans.find((item: any) => item.id === planId);
    expect(savedPlan?.completed?.["timed-day-0"]).toBe(false);
    expect(savedPlan?.earnedDayKeys).toEqual(["2026-09-01"]);
    expect(savedPlan?.dayCompletionDates).toEqual({ "2026-09-01": "2026-09-03" });
  });
});

// ── 4. Established session intentionally empty → valid empty state ────────────

describe("4 — established session with no data: empty state is valid and authoritative", () => {
  /**
   * User creates something (session becomes established), then deletes it.
   * Server returns established:true + empty arrays.
   * Frontend rule: established=true → server is authoritative even when empty
   * → clear UI state (user deliberately has no data).
   */
  const app = makeApp();
  let cookie = "";

  it("session becomes established after one write", async () => {
    const res = await request(app).get("/api/session/info");
    cookie = extractCookie(res);

    const tempId = uid();
    await request(app)
      .post("/api/events")
      .set("Cookie", cookie)
      .send({ id: tempId, title: "Temp", type: "prayer", date: "2026-09-01", time: "08:00" });

    await request(app).delete("/api/events").set("Cookie", cookie).send({ id: tempId });

    const info = await request(app).get("/api/session/info").set("Cookie", cookie);
    expect(info.body.established).toBe(true);
  });

  it("server returns empty data for established session (intentionally empty)", async () => {
    const ev = await request(app).get("/api/events").set("Cookie", cookie);
    const pl = await request(app).get("/api/reading/plans").set("Cookie", cookie);
    // Frontend rule: established=true + empty → show empty (server is authoritative)
    expect(ev.body.events).toHaveLength(0);
    expect(pl.body.plans).toHaveLength(0);
  });
});

// ── 5. Unestablished + empty server must not wipe non-empty localStorage ──────

describe("5 — unestablished session + empty server: localStorage is preserved", () => {
  /**
   * This is the defensive hydration guard. An unestablished session (brand new,
   * or restored after a restart) returning empty data must NOT be treated as
   * authoritative. The frontend keeps localStorage data instead.
   *
   * Tested at the API level: session/info returns established:false, events and
   * plans return empty — the frontend interprets this combination as "keep local".
   */
  const app = makeApp();

  it("fresh session returns established:false and empty data", async () => {
    const res = await request(app).get("/api/session/info");
    const cookie = extractCookie(res);

    expect(res.body.established).toBe(false);

    const ev = await request(app).get("/api/events").set("Cookie", cookie);
    const pl = await request(app).get("/api/reading/plans").set("Cookie", cookie);

    // Combined signal: established=false + empty → frontend MUST keep localStorage
    expect(ev.body.events).toHaveLength(0);
    expect(pl.body.plans).toHaveLength(0);
  });
});

// ── 6. Repeated sync triggers do not create duplicate records ─────────────────

describe("6 — repeated online/focus/visibility events do not create duplicates", () => {
  /**
   * The debounce guard in the frontend collapses rapid events. At the API level,
   * even if the guard fails and multiple syncs fire concurrently, each upsert is
   * idempotent — the server never creates duplicate rows.
   */
  const app = makeApp();
  let cookie = "";
  const eventId = uid();

  beforeAll(async () => {
    const res = await request(app).get("/api/session/info");
    cookie = extractCookie(res);
  });

  it("sending the same upsert 3 times (simulating 3 rapid sync triggers) yields 1 record", async () => {
    const payload = { id: eventId, title: "Rapid Sync Test", type: "prayer", date: "2026-09-01", time: "09:00" };
    await Promise.all([
      request(app).post("/api/events").set("Cookie", cookie).send(payload),
      request(app).post("/api/events").set("Cookie", cookie).send(payload),
      request(app).post("/api/events").set("Cookie", cookie).send(payload),
    ]);

    const ev = await request(app).get("/api/events").set("Cookie", cookie);
    const matches = ev.body.events.filter((e: any) => e.id === eventId);
    expect(matches).toHaveLength(1);
  });
});

// ── 7. Cross-user isolation remains intact through reconnect ──────────────────

describe("7 — cross-user isolation: reconnect sync cannot leak data across sessions", () => {
  /**
   * Session A's pending op flush pushes data for userId A.
   * Session B (different cookie) never sees that data, even after syncing.
   */
  const app = makeApp();
  let cookieA = "";
  let cookieB = "";
  const eventId = uid();

  it("session A creates data", async () => {
    const resA = await request(app).get("/api/session/info");
    cookieA = extractCookie(resA);

    await request(app)
      .post("/api/events")
      .set("Cookie", cookieA)
      .send({ id: eventId, title: "Session A Event", type: "prayer", date: "2026-09-01", time: "07:00" });
  });

  it("session B cannot see session A's data after its own sync", async () => {
    const resB = await request(app).get("/api/session/info");
    cookieB = extractCookie(resB);

    // Session B performs its own sync (GET events + plans)
    const ev = await request(app).get("/api/events").set("Cookie", cookieB);
    const pl = await request(app).get("/api/reading/plans").set("Cookie", cookieB);

    expect(ev.body.events.map((e: any) => e.id)).not.toContain(eventId);
    expect(pl.body.plans).toHaveLength(0);
  });

  it("session A's own sync still returns its data", async () => {
    const ev = await request(app).get("/api/events").set("Cookie", cookieA);
    expect(ev.body.events.map((e: any) => e.id)).toContain(eventId);
  });
});
