import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authUser = vi.hoisted(() => ({ id: null as string | null }));

vi.mock("../src/middlewares/auth", () => ({
  attachCurrentUser: (req: any, _res: unknown, next: () => void) => {
    if (authUser.id) req.dbUser = { id: authUser.id };
    next();
  },
  requireAuth: (req: any, res: any, next: () => void) =>
    req.dbUser ? next() : res.status(401).json({ success: false, error: "Sign in required" }),
}));

import { createApp, createPgSessionStore } from "../src/app";
import { db, pushSubscriptionsTable, readingPlansTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

describe("Account claim", () => {
  beforeEach(() => {
    authUser.id = null;
  });

  it("moves only this browser's anonymous events, plans, and push subscription to its account", async () => {
    const app = createApp(createPgSessionStore());

    const ownerBrowser = request.agent(app);
    const otherBrowser = request.agent(app);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const eventId = `claim-event-${suffix}`;
    const planId = `claim-plan-${suffix}`;
    const endpoint = `https://push.example/claim/${suffix}`;

    await ownerBrowser.post("/api/events").send({
      id: eventId,
      title: "Anonymous prayer",
      type: "prayer",
      date: "2026-08-26",
      time: "06:00",
    }).expect(200);
    await ownerBrowser.post("/api/reading/plans").send({
      id: planId,
      templateKey: "custom",
      name: "Anonymous plan",
      assignments: [],
      completed: {},
    }).expect(200);
    await ownerBrowser.post("/api/push").send({
      endpoint,
      keys: { p256dh: "AAAA", auth: "BBBB" },
    }).expect(200);

    authUser.id = `user_claim_a_${suffix}`;
    const claim = await ownerBrowser.post("/api/account/claim").expect(200);
    expect(claim.body.claimed).toEqual({ events: 1, plans: 1, subscriptions: 1 });

    const ownerEvents = await ownerBrowser.get("/api/events").expect(200);
    expect(ownerEvents.body.events.map((event: { id: string }) => event.id)).toContain(eventId);
    const ownerPlans = await ownerBrowser.get("/api/reading/plans").expect(200);
    const claimedPlan = ownerPlans.body.plans.find((plan: { id: string }) => plan.id === planId);
    expect(claimedPlan).toEqual(expect.objectContaining({ templateKey: "custom" }));

    const secondDeviceForOwner = request.agent(app);
    const secondDeviceEvents = await secondDeviceForOwner.get("/api/events").expect(200);
    expect(secondDeviceEvents.body.events.map((event: { id: string }) => event.id)).toContain(eventId);
    const secondDevicePlans = await secondDeviceForOwner.get("/api/reading/plans").expect(200);
    expect(secondDevicePlans.body.plans.map((plan: { id: string }) => plan.id)).toContain(planId);

    authUser.id = `user_claim_b_${suffix}`;
    const otherEvents = await otherBrowser.get("/api/events").expect(200);
    expect(otherEvents.body.events.map((event: { id: string }) => event.id)).not.toContain(eventId);
    const otherPlans = await otherBrowser.get("/api/reading/plans").expect(200);
    expect(otherPlans.body.plans.map((plan: { id: string }) => plan.id)).not.toContain(planId);
    await otherBrowser.post("/api/push").send({
      endpoint,
      keys: { p256dh: "CCCC", auth: "DDDD" },
    }).expect(403);
  });

  it("does not claim or return a retired 30-day Reset", async () => {
    const app = createApp(createPgSessionStore());
    const browser = request.agent(app);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const legacyPlanId = `legacy-reset-${suffix}`;

    await browser.post("/api/reading/plans").send({
      id: legacyPlanId,
      templateKey: "30-day-consistency-reset",
      name: "30-Day Consistency Reset",
      assignments: [],
      completed: {},
    }).expect(410);

    authUser.id = `user_reset_claim_${suffix}`;
    const claim = await browser.post("/api/account/claim").expect(200);
    expect(claim.body.claimed.plans).toBe(0);

    const plans = await browser.get("/api/reading/plans").expect(200);
    expect(plans.body.plans.map((plan: { id: string }) => plan.id)).not.toContain(legacyPlanId);
  });

  it("keeps the 20-day Reset locked at the API boundary", async () => {
    const app = createApp(createPgSessionStore());
    const browser = request.agent(app);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const planId = `current-reset-${suffix}`;
    const assignments = [
      { date: "2026-08-27", readings: [{ key: "Matthew-1", label: "Matthew 1" }] },
      { date: "2026-08-28", readings: [{ key: "Matthew-2", label: "Matthew 2" }] },
    ];

    await browser.post("/api/reading/plans").send({
      id: planId,
      templateKey: "20-day-reset",
      name: "20-Day Reset",
      startDate: "2026-08-27",
      endDate: "2026-09-15",
      assignments,
      completed: { "Matthew-1": true },
    }).expect(403);
  });

  it("replaces the same device's account subscription during claim and preserves other devices", async () => {
    const app = createApp(createPgSessionStore());
    const accountBrowser = request.agent(app);
    const anonymousBrowser = request.agent(app);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const accountUserId = `user_device_claim_${suffix}`;
    const sharedDeviceId = `claim-device-${suffix}`;
    const otherDeviceId = `other-device-${suffix}`;
    const oldAccountEndpoint = `https://push.example/account-old/${suffix}`;
    const anonymousEndpoint = `https://push.example/anonymous-new/${suffix}`;
    const otherDeviceEndpoint = `https://push.example/account-other/${suffix}`;

    authUser.id = accountUserId;
    await accountBrowser.post("/api/push").send({
      deviceId: sharedDeviceId,
      endpoint: oldAccountEndpoint,
      keys: { p256dh: "OLD", auth: "OLD" },
    }).expect(200);
    await accountBrowser.post("/api/push").send({
      deviceId: otherDeviceId,
      endpoint: otherDeviceEndpoint,
      keys: { p256dh: "OTHER", auth: "OTHER" },
    }).expect(200);

    authUser.id = null;
    await anonymousBrowser.post("/api/push").send({
      deviceId: sharedDeviceId,
      endpoint: anonymousEndpoint,
      keys: { p256dh: "NEW", auth: "NEW" },
    }).expect(200);

    authUser.id = accountUserId;
    const claim = await anonymousBrowser.post("/api/account/claim").expect(200);
    expect(claim.body.claimed.subscriptions).toBe(1);

    const sameDeviceRows = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(
        and(
          eq(pushSubscriptionsTable.userId, accountUserId),
          eq(pushSubscriptionsTable.deviceId, sharedDeviceId),
        ),
      );
    const [otherDeviceRow] = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, otherDeviceEndpoint));

    expect(sameDeviceRows).toHaveLength(1);
    expect(sameDeviceRows[0].endpoint).toBe(anonymousEndpoint);
    expect(otherDeviceRow).toBeDefined();

    await db
      .delete(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, accountUserId));
  });

  it("does not allow an unauthenticated request to claim data", async () => {
    const app = createApp(createPgSessionStore());
    await request(app).post("/api/account/claim").expect(401);
  });

  it("does not allow a locked 20-day Reset to be created", async () => {
    const app = createApp(createPgSessionStore());
    const browser = request.agent(app);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const firstPlanId = `active-reset-a-${suffix}`;
    const assignments = [
      { date: "2026-08-27", readings: [{ key: "Matthew-1", label: "Matthew 1" }] },
    ];

    const reset = {
      id: firstPlanId,
      templateKey: "20-day-consistency-reset",
      name: "20-Day Consistency Reset",
      assignments,
      completed: {},
    };

    await browser.post("/api/reading/plans").send(reset).expect(403);
  });
});
