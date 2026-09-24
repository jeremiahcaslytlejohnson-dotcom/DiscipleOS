/**
 * Integration tests: cross-user isolation for events, plans, and push subscriptions.
 * Two separate sessions prove that user A cannot read, write, or delete user B's data.
 */
import request from "supertest";
import app from "../src/app";

// Each agent has its own cookie jar — two independent sessions
const agentA = request.agent(app);
const agentB = request.agent(app);

function addDays(dateISO: string, amount: number) {
  const date = new Date(`${dateISO}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

describe("Cross-user isolation", () => {
  // Warm up both sessions so session.userId is assigned
  beforeAll(async () => {
    await agentA.get("/api/healthz");
    await agentB.get("/api/healthz");
  });

  // ─── Events ────────────────────────────────────────────────────────────────

  describe("Events", () => {
    let eventIdA: string;

    it("creates an event for user A", async () => {
      const res = await agentA.post("/api/events").send({
        title: "User A Prayer",
        type: "prayer",
        date: "2026-01-01",
        time: "06:00",
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      eventIdA = res.body.event.id;
    });

    it("user B cannot read user A's events", async () => {
      const res = await agentB.get("/api/events");
      expect(res.status).toBe(200);
      const ids = (res.body.events as any[]).map((e: any) => e.id);
      expect(ids).not.toContain(eventIdA);
    });

    it("user B gets 409 when trying to write with user A's event ID", async () => {
      const res = await agentB.post("/api/events").send({
        id: eventIdA,
        title: "HIJACKED",
        type: "prayer",
        date: "2026-01-01",
        time: "06:00",
      });
      // Must return 409 (conflict) — not a 500 and not a silent overwrite
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);

      // Confirm user A's event is unchanged
      const aEvents = await agentA.get("/api/events");
      const aEvent = (aEvents.body.events as any[]).find((e: any) => e.id === eventIdA);
      expect(aEvent?.title).toBe("User A Prayer");
    });

    it("user B's delete attempt on user A's event is a no-op", async () => {
      const delRes = await agentB.delete("/api/events").send({ id: eventIdA });
      expect(delRes.status).toBe(200);
      // A's event still exists
      const aEvents = await agentA.get("/api/events");
      const ids = (aEvents.body.events as any[]).map((e: any) => e.id);
      expect(ids).toContain(eventIdA);
    });
  });

  // ─── Reading plans ──────────────────────────────────────────────────────────

  describe("Reading plans", () => {
    const planIdA = "test-plan-" + Date.now();

    it("creates a plan for user A", async () => {
      const res = await agentA.post("/api/reading/plans").send({
        id: planIdA,
        name: "User A Plan",
        selectedBooks: [],
        assignments: [],
        completed: {},
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("user B cannot read user A's plans", async () => {
      const res = await agentB.get("/api/reading/plans");
      expect(res.status).toBe(200);
      const ids = (res.body.plans as any[]).map((p: any) => p.id);
      expect(ids).not.toContain(planIdA);
    });

    it("user B gets 403 when trying to overwrite user A's plan by ID", async () => {
      const res = await agentB.post("/api/reading/plans").send({
        id: planIdA,
        name: "HIJACKED",
        selectedBooks: [],
        assignments: [],
        completed: {},
      });
      expect(res.status).toBe(403);
    });

    it("user B's delete attempt on user A's plan is a no-op", async () => {
      await agentB.delete("/api/reading/plans").send({ id: planIdA });
      // A's plan must still exist
      const res = await agentA.get("/api/reading/plans");
      const ids = (res.body.plans as any[]).map((p: any) => p.id);
      expect(ids).toContain(planIdA);
    });

    it("user B cannot mark chapters complete in user A's plan", async () => {
      const res = await agentB.post("/api/reading/complete").send({
        planId: planIdA,
        key: "day-1-0",
        completed: true,
      });
      expect(res.status).toBe(200);
      // A's plan completed map must not have been modified
      const plans = await agentA.get("/api/reading/plans");
      const plan = (plans.body.plans as any[]).find((p: any) => p.id === planIdA);
      expect(plan?.completed?.["day-1-0"]).not.toBe(true);
    });

    it("allows separate users to save independent ordinary plans", async () => {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const resetA = `plan-${suffix}-a`;
      const resetB = `plan-${suffix}-b`;
      const resetPayload = {
        templateKey: "custom",
        name: "Independent plan",
        assignments: [],
        completed: {},
      };

      await agentA
        .post("/api/reading/plans")
        .send({ id: resetA, ...resetPayload })
        .expect(200);
      await agentB
        .post("/api/reading/plans")
        .send({ id: resetB, ...resetPayload })
        .expect(200);

      const plansA = await agentA.get("/api/reading/plans").expect(200);
      const plansB = await agentB.get("/api/reading/plans").expect(200);
      expect(plansA.body.plans.map((plan: { id: string }) => plan.id)).toContain(resetA);
      expect(plansB.body.plans.map((plan: { id: string }) => plan.id)).toContain(resetB);
    });

    it("keeps ordinary plans concurrent while allowing only one active structured climb", async () => {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const ordinaryPlanId = `ordinary-${suffix}`;
      const climbAId = `climb-a-${suffix}`;
      const climbBId = `climb-b-${suffix}`;
      const assignments = Array.from({ length: 7 }, (_, index) => ({
        date: addDays("2026-08-27", index),
        readings: [{ key: `climb-${suffix}-${index}` }],
      }));
      const climbPayload = {
        journeyKey: "7-day-climb",
        journeyType: "7-day-climb",
        journeyDays: 7,
        durationDays: 7,
        totalDays: 7,
        assignments,
        completed: {},
      };

      await agentA
        .post("/api/reading/plans")
        .send({
          id: ordinaryPlanId,
          name: "Concurrent ordinary plan",
          selectedBooks: ["John"],
          assignments: [],
          completed: {},
        })
        .expect(200);
      await agentA
        .post("/api/reading/plans")
        .send({ id: climbAId, name: "7-Day Climb", ...climbPayload })
        .expect(200);

      const blocked = await agentA
        .post("/api/reading/plans")
        .send({ id: climbBId, name: "7-Day Climb", ...climbPayload });
      expect(blocked.status).toBe(409);
      expect(blocked.body.error).toContain("structured climb");

      for (const assignment of assignments) {
        await agentA
          .post("/api/reading/complete")
          .send({
            planId: climbAId,
            key: assignment.readings[0].key,
            completed: true,
            earnedDay: assignment.date,
          })
          .expect(200);
      }

      await agentA
        .post("/api/reading/plans")
        .send({ id: climbBId, name: "7-Day Climb", ...climbPayload })
        .expect(200);

      const plans = await agentA.get("/api/reading/plans").expect(200);
      const planIds = plans.body.plans.map((plan: { id: string }) => plan.id);
      expect(planIds).toEqual(expect.arrayContaining([ordinaryPlanId, climbAId, climbBId]));
    });
  });

  // ─── Push subscriptions ─────────────────────────────────────────────────────

  describe("Push subscriptions", () => {
    const endpointA = "https://example.com/push/user-a-" + Date.now();

    it("user A can register a push subscription", async () => {
      const res = await agentA.post("/api/push").send({
        endpoint: endpointA,
        keys: { p256dh: "AAAA", auth: "BBBB" },
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("user B gets 403 when trying to claim user A's endpoint", async () => {
      const res = await agentB.post("/api/push").send({
        endpoint: endpointA,
        keys: { p256dh: "CCCC", auth: "DDDD" },
      });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("user B cannot delete user A's push subscription", async () => {
      const res = await agentB.delete(`/api/push/${encodeURIComponent(endpointA)}`);
      expect(res.status).toBe(200); // scoped delete is a no-op for wrong userId
    });
  });
});
