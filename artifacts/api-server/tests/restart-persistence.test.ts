/**
 * Restart-persistence integration tests.
 *
 * Simulates a server restart by creating two Express app instances, each with
 * its OWN PgStore. Neither store shares any in-memory state with the other —
 * they only share the underlying PostgreSQL database. This accurately models a
 * real restart where the new process has no prior in-memory state.
 *
 * The session cookie issued by server A must still resolve to the same userId
 * and the same user data when presented to server B.
 */
import request from "supertest";
import { createApp, createPgSessionStore } from "../src/app";

// ── Shared state between phases ───────────────────────────────────────────────
let capturedCookie = "";
let capturedUserId = "";
const testEventId = `restart-event-${Date.now()}`;
const testPlanId = `restart-plan-${Date.now()}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract a sendable cookie string from a supertest response. */
function extractCookie(res: request.Response): string {
  const h = res.headers["set-cookie"];
  if (Array.isArray(h)) return h.map((s: string) => s.split(";")[0]).join("; ");
  if (typeof h === "string") return (h as string).split(";")[0];
  return "";
}

// ── Phase 1: before restart (server A) ───────────────────────────────────────

describe("Phase 1 — before restart (server A)", () => {
  // Fresh store + app per phase — no shared in-memory state
  const appA = createApp(createPgSessionStore());

  it("creates a session and captures the cookie + userId", async () => {
    const res = await request(appA).get("/api/session/info");
    expect(res.status).toBe(200);

    capturedCookie = extractCookie(res);
    capturedUserId = res.body.userId;

    expect(capturedCookie).toContain("connect.sid");
    expect(typeof capturedUserId).toBe("string");
    expect(capturedUserId.length).toBeGreaterThan(0);
  });

  it("session is not established before any write", async () => {
    const res = await request(appA)
      .get("/api/session/info")
      .set("Cookie", capturedCookie);
    expect(res.status).toBe(200);
    expect(res.body.established).toBe(false);
    expect(res.body.userId).toBe(capturedUserId);
  });

  it("creates an event", async () => {
    const res = await request(appA)
      .post("/api/events")
      .set("Cookie", capturedCookie)
      .send({
        id: testEventId,
        title: "Restart Test Event",
        type: "prayer",
        date: "2026-09-01",
        time: "06:00",
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("session becomes established after write", async () => {
    const res = await request(appA)
      .get("/api/session/info")
      .set("Cookie", capturedCookie);
    expect(res.status).toBe(200);
    expect(res.body.established).toBe(true);
    expect(res.body.userId).toBe(capturedUserId);
  });

  it("creates a reading plan", async () => {
    const res = await request(appA)
      .post("/api/reading/plans")
      .set("Cookie", capturedCookie)
      .send({
        id: testPlanId,
        name: "Restart Test Plan",
        selectedBooks: ["Genesis"],
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        assignments: [
          { date: "2026-09-01", readings: [{ key: "d1-0", label: "Genesis 1" }] },
        ],
        completed: {},
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("confirms both records are stored and accessible on server A", async () => {
    const evRes = await request(appA)
      .get("/api/events")
      .set("Cookie", capturedCookie);
    const plRes = await request(appA)
      .get("/api/reading/plans")
      .set("Cookie", capturedCookie);
    expect(evRes.body.events.map((e: any) => e.id)).toContain(testEventId);
    expect(plRes.body.plans.map((p: any) => p.id)).toContain(testPlanId);
  });
});

// ── Phase 2: after simulated restart (server B) ───────────────────────────────

describe("Phase 2 — after simulated restart (server B)", () => {
  // SEPARATE store instance — zero shared in-memory state with server A.
  // Only the same PostgreSQL database is shared.
  const appB = createApp(createPgSessionStore());

  it("server B recovers the same userId from the original session cookie", async () => {
    const res = await request(appB)
      .get("/api/session/info")
      .set("Cookie", capturedCookie);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(capturedUserId);
  });

  it("session is still established on server B (persisted in database)", async () => {
    const res = await request(appB)
      .get("/api/session/info")
      .set("Cookie", capturedCookie);
    expect(res.body.established).toBe(true);
  });

  it("event is accessible on server B after restart", async () => {
    const res = await request(appB)
      .get("/api/events")
      .set("Cookie", capturedCookie);
    expect(res.status).toBe(200);
    const ids = res.body.events.map((e: any) => e.id);
    expect(ids).toContain(testEventId);
  });

  it("reading plan is accessible on server B after restart", async () => {
    const res = await request(appB)
      .get("/api/reading/plans")
      .set("Cookie", capturedCookie);
    expect(res.status).toBe(200);
    const ids = res.body.plans.map((p: any) => p.id);
    expect(ids).toContain(testPlanId);
  });

  it("a separate session on server B cannot access the data", async () => {
    // No cookie → fresh anonymous session → different userId → no data
    const evRes = await request(appB).get("/api/events");
    const plRes = await request(appB).get("/api/reading/plans");

    expect(evRes.body.events.map((e: any) => e.id)).not.toContain(testEventId);
    expect(plRes.body.plans.map((p: any) => p.id)).not.toContain(testPlanId);
  });
});

// ── Phase 3: defensive hydration guard ───────────────────────────────────────

describe("Phase 3 — defensive hydration guard (unestablished session must not erase localStorage)", () => {
  const appC = createApp(createPgSessionStore());

  it("a fresh (unestablished) session returns established: false", async () => {
    const res = await request(appC).get("/api/session/info");
    expect(res.status).toBe(200);
    expect(res.body.established).toBe(false);
    expect(typeof res.body.userId).toBe("string");
  });

  it("a fresh session returns empty events and plans (the condition the frontend guards against)", async () => {
    const res1 = await request(appC).get("/api/session/info");
    const freshCookie = extractCookie(res1);

    const evRes = await request(appC)
      .get("/api/events")
      .set("Cookie", freshCookie);
    const plRes = await request(appC)
      .get("/api/reading/plans")
      .set("Cookie", freshCookie);

    // established=false AND empty → frontend keeps localStorage data, does not clear it
    expect(evRes.body.events).toHaveLength(0);
    expect(plRes.body.plans).toHaveLength(0);
  });

  it("established session with all data deleted returns established: true (intentionally empty is authoritative)", async () => {
    // Create → write → delete → verify established=true but data=[]
    const res1 = await request(appC).get("/api/session/info");
    const cookie = extractCookie(res1);

    const tempId = `temp-plan-${Date.now()}`;
    await request(appC)
      .post("/api/reading/plans")
      .set("Cookie", cookie)
      .send({ id: tempId, name: "Temp", selectedBooks: [], assignments: [], completed: {} });

    await request(appC)
      .delete("/api/reading/plans")
      .set("Cookie", cookie)
      .send({ id: tempId });

    const info = await request(appC)
      .get("/api/session/info")
      .set("Cookie", cookie);
    // established=true (even though all data is now gone) → server state is authoritative
    expect(info.body.established).toBe(true);

    const plans = await request(appC)
      .get("/api/reading/plans")
      .set("Cookie", cookie);
    // Frontend rule: established=true AND empty → clear UI state (user deleted everything)
    expect(plans.body.plans).toHaveLength(0);
  });
});
