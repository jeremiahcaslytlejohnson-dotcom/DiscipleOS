import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPlanDateInTimeZone } from "@workspace/structured-plan-lifecycle";

const authUser = vi.hoisted(() => ({ id: null as string | null }));

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function makeClimb(id: string, startDate: string, completed = false) {
  const assignments = Array.from({ length: 7 }, (_, index) => ({
    date: addDays(startDate, index),
    readings: [{ key: `${id}-reading-${index}` }],
  }));
  const dates = assignments.map((assignment) => assignment.date);
  return {
    id,
    name: "7-Day Climb",
    journeyKey: "7-day-climb",
    journeyType: "7-day-climb",
    journeyDays: 7,
    durationDays: 7,
    totalDays: 7,
    startDate,
    endDate: dates[dates.length - 1],
    timeZone: "America/New_York",
    assignments,
    completed: completed
      ? Object.fromEntries(
          assignments.flatMap((assignment) =>
            assignment.readings.map((reading) => [reading.key, true]),
          ),
        )
      : {},
    ...(completed
      ? {
          earnedDayKeys: dates,
          dayCompletionDates: Object.fromEntries(dates.map((date) => [date, date])),
        }
      : {}),
  };
}

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

  it("claims a fresh climb without blocking on or overwriting historical climbs", async () => {
    const app = createApp(createPgSessionStore());
    const accountBrowser = request.agent(app);
    const anonymousBrowser = request.agent(app);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const accountUserId = `user_historical_climb_claim_${suffix}`;
    const today = getPlanDateInTimeZone("America/New_York");
    const expiredClimb = makeClimb(`expired-climb-${suffix}`, "2025-01-01");
    const completedClimb = makeClimb(
      `completed-climb-${suffix}`,
      addDays(today, -6),
      true,
    );
    const freshClimb = makeClimb(`fresh-climb-${suffix}`, today);
    const accountOrdinaryPlan = {
      id: `account-ordinary-${suffix}`,
      name: "Account reading plan",
      assignments: [],
      completed: {},
    };
    const anonymousOrdinaryPlan = {
      id: `anonymous-ordinary-${suffix}`,
      name: "Anonymous reading plan",
      assignments: [],
      completed: {},
    };

    authUser.id = accountUserId;
    await accountBrowser.post("/api/reading/plans").send(expiredClimb).expect(200);
    await accountBrowser.post("/api/reading/plans").send(completedClimb).expect(200);
    await accountBrowser
      .post("/api/reading/plans")
      .send(accountOrdinaryPlan)
      .expect(200);

    authUser.id = null;
    await anonymousBrowser
      .post("/api/reading/plans")
      .send(freshClimb)
      .expect(200);
    await anonymousBrowser
      .post("/api/reading/plans")
      .send(anonymousOrdinaryPlan)
      .expect(200);

    authUser.id = accountUserId;
    const claim = await anonymousBrowser.post("/api/account/claim").expect(200);
    expect(claim.body.claimed).toEqual({
      events: 0,
      plans: 2,
      subscriptions: 0,
    });

    const plansResponse = await accountBrowser.get("/api/reading/plans").expect(200);
    const plans = new Map(
      (plansResponse.body.plans as Array<Record<string, any>>).map((plan) => [
        plan.id,
        plan,
      ]),
    );
    expect([...plans.keys()]).toEqual(
      expect.arrayContaining([
        expiredClimb.id,
        completedClimb.id,
        freshClimb.id,
        accountOrdinaryPlan.id,
        anonymousOrdinaryPlan.id,
      ]),
    );
    expect(plans.get(expiredClimb.id)).toEqual(
      expect.objectContaining({
        startDate: expiredClimb.startDate,
        endDate: expiredClimb.endDate,
        completed: {},
      }),
    );
    expect(plans.get(completedClimb.id)).toEqual(
      expect.objectContaining({
        completed: completedClimb.completed,
        earnedDayKeys: completedClimb.earnedDayKeys,
        dayCompletionDates: completedClimb.dayCompletionDates,
      }),
    );
    expect(plans.get(freshClimb.id)).toEqual(
      expect.objectContaining({
        startDate: today,
        assignments: freshClimb.assignments,
        completed: {},
      }),
    );
    expect(plans.get(accountOrdinaryPlan.id)).toEqual(
      expect.objectContaining(accountOrdinaryPlan),
    );
    expect(plans.get(anonymousOrdinaryPlan.id)).toEqual(
      expect.objectContaining(anonymousOrdinaryPlan),
    );

    await accountBrowser
      .post("/api/reading/plans")
      .send({
        ...makeClimb(`second-active-climb-${suffix}`, today),
      })
      .expect(409);
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
