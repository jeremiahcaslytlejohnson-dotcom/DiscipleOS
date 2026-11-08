import express from "express";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  analyticsRateLimitsTable,
  db,
  eventCompletionsTable,
  eventsTable,
  pushSubscriptionsTable,
  readingPlansTable,
  sentRemindersTable,
  usersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

import webpush from "web-push";
import accountRouter from "../src/routes/account";
import eventsRouter from "../src/routes/events";
import readingRouter from "../src/routes/reading";
import trackRouter from "../src/routes/track";
import { sendDueReminders } from "../src/services/reminderDelivery";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Task 6 PostgreSQL tests require an isolated DATABASE_URL.");
}
const databaseTarget = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(databaseTarget.hostname) ||
  databaseTarget.port !== "55432" ||
  databaseTarget.pathname !== "/discipleos_task6_test"
) {
  throw new Error(
    "Task 6 PostgreSQL tests are restricted to the disposable local database on port 55432.",
  );
}

const fixtureEventIds: string[] = [];
const fixturePlanIds: string[] = [];
const fixtureEndpoints: string[] = [];
const fixtureUserIds: string[] = [];
const fixtureAnalyticsIps: string[] = [];

function suffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeRouteApp({
  userId,
  anonymousUserId,
  databaseUserId,
}: {
  userId?: string;
  anonymousUserId?: string;
  databaseUserId?: string;
} = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).session = {
      userId,
      anonymousUserId,
      sessionEstablished: false,
    };
    if (databaseUserId) {
      (req as any).dbUser = { id: databaseUserId };
    }
    (req as any).log = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };
    next();
  });
  app.use(eventsRouter);
  app.use(readingRouter);
  app.use(accountRouter);
  return app;
}

async function seedReminder({
  id,
  ownerId,
  endpoint,
  date = "2026-11-08",
  time = "09:00",
  timeZone = "UTC",
}: {
  id: string;
  ownerId: string;
  endpoint: string;
  date?: string;
  time?: string;
  timeZone?: string;
}) {
  fixtureEventIds.push(id);
  fixtureEndpoints.push(endpoint);
  await db.insert(eventsTable).values({
    id,
    userId: ownerId,
    title: "PostgreSQL reminder fixture",
    type: "prayer",
    date,
    time,
    notes: "Synthetic test data",
    remind: true,
    reminderMinutes: 0,
    repeat: "none",
    repeatWeekdays: [],
    repeatUntil: null,
    timeZone,
    countsTowardRhythm: true,
  });
  await db.insert(pushSubscriptionsTable).values({
    userId: ownerId,
    deviceId: `task6-device-${suffix()}`,
    endpoint,
    p256dh: "test-public-key",
    auth: "test-auth-key",
  });
}

async function cleanupFixtures() {
  for (const eventId of fixtureEventIds) {
    await db
      .delete(sentRemindersTable)
      .where(eq(sentRemindersTable.eventId, eventId));
    await db
      .delete(eventCompletionsTable)
      .where(eq(eventCompletionsTable.eventId, eventId));
    await db.delete(eventsTable).where(eq(eventsTable.id, eventId));
  }
  for (const planId of fixturePlanIds) {
    await db.delete(readingPlansTable).where(eq(readingPlansTable.id, planId));
  }
  for (const endpoint of fixtureEndpoints) {
    await db
      .delete(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
  }
  for (const userId of fixtureUserIds) {
    await db.delete(usersTable).where(eq(usersTable.id, userId));
  }
  for (const clientIp of fixtureAnalyticsIps) {
    await db
      .delete(analyticsRateLimitsTable)
      .where(eq(analyticsRateLimitsTable.clientIp, clientIp));
  }
}

afterAll(async () => {
  await cleanupFixtures();
});

beforeEach(() => {
  vi.mocked(webpush.setVapidDetails).mockReset();
  vi.mocked(webpush.sendNotification)
    .mockReset()
    .mockResolvedValue({ statusCode: 201 } as any);
});

describe("Task 6 isolated PostgreSQL reliability checks", () => {
  it("merges concurrent completion writes with a stale full-plan sync and retains history", async () => {
    const userId = `task6-reading-owner-${suffix()}`;
    const planId = `task6-reading-plan-${suffix()}`;
    fixturePlanIds.push(planId);
    const existingHistoryDate = "2026-11-05";
    const earnedDate = "2026-11-06";
    const initialPlan = {
      id: planId,
      name: "PostgreSQL completion fixture",
      templateKey: "custom",
      assignments: [
        {
          date: earnedDate,
          readings: [{ key: "chapter-a" }, { key: "chapter-b" }],
        },
      ],
      completed: { "chapter-a": false, "chapter-b": false },
      completionUpdatedAt: { "chapter-a": 100, "chapter-b": 100 },
      earnedDayKeys: [existingHistoryDate],
      dayCompletionDates: { [existingHistoryDate]: existingHistoryDate },
    };
    await db.insert(readingPlansTable).values({
      id: planId,
      userId,
      templateKey: "custom",
      data: initialPlan,
    });

    const app = makeRouteApp({ userId });
    const [completionResponse, staleSyncResponse] = await Promise.all([
      request(app)
        .post("/reading/complete")
        .send({
          planId,
          key: "chapter-a",
          completed: true,
          earnedDay: earnedDate,
          completionDate: "2026-11-07",
          mutationTs: 500,
        }),
      request(app)
        .post("/reading/plans")
        .send({
          ...initialPlan,
          completed: { "chapter-a": false, "chapter-b": true },
          completionUpdatedAt: { "chapter-a": 400, "chapter-b": 400 },
          earnedDayKeys: [],
          dayCompletionDates: {},
        }),
    ]);

    expect(completionResponse.status).toBe(200);
    expect(staleSyncResponse.status).toBe(200);
    const [storedPlan] = await db
      .select({ data: readingPlansTable.data })
      .from(readingPlansTable)
      .where(eq(readingPlansTable.id, planId));
    expect(storedPlan.data.completed).toMatchObject({
      "chapter-a": true,
      "chapter-b": true,
    });
    expect(storedPlan.data.completionUpdatedAt).toMatchObject({
      "chapter-a": 500,
    });
    expect(storedPlan.data.earnedDayKeys).toEqual(
      expect.arrayContaining([existingHistoryDate, earnedDate]),
    );
    expect(storedPlan.data.dayCompletionDates).toMatchObject({
      [existingHistoryDate]: existingHistoryDate,
      [earnedDate]: "2026-11-07",
    });
  });

  it("serializes overlapping account claims by anonymous owner and moves data once", async () => {
    const id = suffix();
    const anonymousUserId = `task6-anon-${id}`;
    const accountA = `task6-account-a-${id}`;
    const accountB = `task6-account-b-${id}`;
    const eventId = `task6-claim-event-${id}`;
    const planId = `task6-claim-plan-${id}`;
    const endpoint = `https://push.example.invalid/task6-claim/${id}`;
    fixtureUserIds.push(accountA, accountB);
    fixtureEventIds.push(eventId);
    fixturePlanIds.push(planId);
    fixtureEndpoints.push(endpoint);

    await db.insert(usersTable).values([
      { id: accountA, email: `${accountA}@example.invalid` },
      { id: accountB, email: `${accountB}@example.invalid` },
    ]);
    await db.insert(eventsTable).values({
      id: eventId,
      userId: anonymousUserId,
      title: "Claim fixture",
      type: "prayer",
      date: "2026-11-08",
      time: "09:00",
      notes: "",
      remind: false,
      reminderMinutes: 10,
      repeat: "none",
      repeatWeekdays: [],
      repeatUntil: null,
      timeZone: "UTC",
      countsTowardRhythm: true,
    });
    await db.insert(readingPlansTable).values({
      id: planId,
      userId: anonymousUserId,
      templateKey: "custom",
      data: {
        id: planId,
        name: "Claim fixture",
        templateKey: "custom",
        assignments: [],
        completed: {},
      },
    });
    await db.insert(pushSubscriptionsTable).values({
      userId: anonymousUserId,
      deviceId: `task6-claim-device-${id}`,
      endpoint,
      p256dh: "test-public-key",
      auth: "test-auth-key",
    });

    const appA = makeRouteApp({
      userId: accountA,
      anonymousUserId,
      databaseUserId: accountA,
    });
    const appB = makeRouteApp({
      userId: accountB,
      anonymousUserId,
      databaseUserId: accountB,
    });
    const [claimA, claimB] = await Promise.all([
      request(appA).post("/account/claim"),
      request(appB).post("/account/claim"),
    ]);
    expect(claimA.status).toBe(200);
    expect(claimB.status).toBe(200);
    expect(
      claimA.body.claimed.events + claimB.body.claimed.events,
    ).toBe(1);
    expect(claimA.body.claimed.plans + claimB.body.claimed.plans).toBe(1);
    expect(
      claimA.body.claimed.subscriptions + claimB.body.claimed.subscriptions,
    ).toBe(1);

    const [storedEvent] = await db
      .select({ userId: eventsTable.userId })
      .from(eventsTable)
      .where(eq(eventsTable.id, eventId));
    const [storedPlan] = await db
      .select({ userId: readingPlansTable.userId })
      .from(readingPlansTable)
      .where(eq(readingPlansTable.id, planId));
    const [storedSubscription] = await db
      .select({ userId: pushSubscriptionsTable.userId })
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
    expect([accountA, accountB]).toContain(storedEvent.userId);
    expect(storedPlan.userId).toBe(storedEvent.userId);
    expect(storedSubscription.userId).toBe(storedEvent.userId);
    expect(
      await request(
        storedEvent.userId === accountA ? appA : appB,
      )
        .post("/account/claim")
        .then((response) => response.body.claimed),
    ).toEqual({ events: 0, plans: 0, subscriptions: 0 });
  });

  it("allows only one overlapping PostgreSQL reminder worker to deliver per endpoint", async () => {
    const id = suffix();
    const eventId = `task6-reminder-overlap-${id}`;
    const ownerId = `task6-reminder-owner-${id}`;
    const endpoint = `https://push.example.invalid/task6-overlap/${id}`;
    await seedReminder({ id: eventId, ownerId, endpoint });

    let releaseDelivery!: () => void;
    let markDeliveryStarted!: () => void;
    const deliveryStarted = new Promise<void>((resolve) => {
      markDeliveryStarted = resolve;
    });
    const deliveryGate = new Promise<void>((resolve) => {
      releaseDelivery = resolve;
    });
    vi.mocked(webpush.sendNotification).mockImplementation(async () => {
      markDeliveryStarted();
      await deliveryGate;
      return { statusCode: 201 } as any;
    });

    const now = new Date("2026-11-08T09:00:00.000Z");
    const first = sendDueReminders(
      { now, source: "scheduled", invocationId: `worker-a-${id}` },
    );
    await deliveryStarted;
    const second = sendDueReminders(
      { now, source: "scheduled", invocationId: `worker-b-${id}` },
    );
    releaseDelivery();
    const [firstRun, secondRun] = await Promise.all([first, second]);

    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    expect(firstRun.sent + secondRun.sent).toBe(1);
    expect(firstRun.alreadySentSkips + secondRun.alreadySentSkips).toBe(1);
    const markers = await db
      .select()
      .from(sentRemindersTable)
      .where(eq(sentRemindersTable.eventId, eventId));
    expect(markers).toHaveLength(1);
    expect(markers[0].endpoint).toBe(endpoint);
  });

  it("serializes an event edit against delivery and permits the edited schedule once", async () => {
    const id = suffix();
    const eventId = `task6-reminder-edit-${id}`;
    const ownerId = `task6-reminder-edit-owner-${id}`;
    const endpoint = `https://push.example.invalid/task6-edit/${id}`;
    await seedReminder({ id: eventId, ownerId, endpoint });
    await db.insert(eventCompletionsTable).values({
      eventId,
      occurrenceDate: "2026-11-08",
      completed: true,
    });

    let releaseDelivery!: () => void;
    let markDeliveryStarted!: () => void;
    const deliveryStarted = new Promise<void>((resolve) => {
      markDeliveryStarted = resolve;
    });
    const deliveryGate = new Promise<void>((resolve) => {
      releaseDelivery = resolve;
    });
    vi.mocked(webpush.sendNotification).mockImplementation(async () => {
      markDeliveryStarted();
      await deliveryGate;
      return { statusCode: 201 } as any;
    });

    const worker = sendDueReminders({
      now: new Date("2026-11-08T09:00:00.000Z"),
      source: "scheduled",
    });
    await deliveryStarted;

    let editSettled = false;
    const edit = request(makeRouteApp({ userId: ownerId }))
      .post("/events")
      .send({
        id: eventId,
        title: "Edited PostgreSQL reminder",
        type: "prayer",
        date: "2026-11-08",
        time: "09:05",
        notes: "Synthetic test data",
        remind: true,
        reminderMinutes: 0,
        repeat: "none",
        repeatWeekdays: [],
        timeZone: "UTC",
      })
      .then((response) => {
        editSettled = true;
        return response;
      });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(editSettled).toBe(false);

    releaseDelivery();
    const originalRun = await worker;
    const editResponse = await edit;
    expect(originalRun.sent).toBe(1);
    expect(editResponse.status).toBe(200);

    vi.mocked(webpush.sendNotification)
      .mockReset()
      .mockResolvedValue({ statusCode: 201 } as any);
    const editedRun = await sendDueReminders({
      now: new Date("2026-11-08T09:05:00.000Z"),
      source: "scheduled",
    });
    const repeatedRun = await sendDueReminders({
      now: new Date("2026-11-08T09:05:00.000Z"),
      source: "scheduled",
    });
    expect(editedRun.sent).toBe(1);
    expect(repeatedRun.sent).toBe(0);
    expect(repeatedRun.alreadySentSkips).toBe(1);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);

    const completions = await db
      .select()
      .from(eventCompletionsTable)
      .where(eq(eventCompletionsTable.eventId, eventId));
    expect(completions).toHaveLength(1);
    expect(completions[0].completed).toBe(true);
    const markers = await db
      .select()
      .from(sentRemindersTable)
      .where(eq(sentRemindersTable.eventId, eventId));
    expect(markers).toHaveLength(2);
    expect(markers.map((marker) => marker.endpoint)).toEqual([
      endpoint,
      endpoint,
    ]);
  });

  it("removes revoked endpoints but retains transient failures for retry", async () => {
    const revokedId = suffix();
    const revokedEventId = `task6-reminder-revoked-${revokedId}`;
    const revokedEndpoint = `https://push.example.invalid/task6-revoked/${revokedId}`;
    await seedReminder({
      id: revokedEventId,
      ownerId: `task6-revoked-owner-${revokedId}`,
      endpoint: revokedEndpoint,
    });
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce(
      Object.assign(new Error("Gone"), { statusCode: 410 }),
    );
    const revokedRun = await sendDueReminders({
      now: new Date("2026-11-08T09:00:00.000Z"),
    });
    expect(revokedRun.expiredSubscriptionsRemoved).toBe(1);
    expect(
      await db
        .select()
        .from(pushSubscriptionsTable)
        .where(eq(pushSubscriptionsTable.endpoint, revokedEndpoint)),
    ).toHaveLength(0);

    const retryId = suffix();
    const retryEventId = `task6-reminder-retry-${retryId}`;
    const retryEndpoint = `https://push.example.invalid/task6-retry/${retryId}`;
    await seedReminder({
      id: retryEventId,
      ownerId: `task6-retry-owner-${retryId}`,
      endpoint: retryEndpoint,
    });
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce(
      Object.assign(new Error("Temporary failure"), { statusCode: 503 }),
    );
    const failedRun = await sendDueReminders({
      now: new Date("2026-11-08T09:00:00.000Z"),
    });
    expect(failedRun.failedDeliveries).toBe(1);
    expect(
      await db
        .select()
        .from(sentRemindersTable)
        .where(eq(sentRemindersTable.eventId, retryEventId)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(pushSubscriptionsTable)
        .where(eq(pushSubscriptionsTable.endpoint, retryEndpoint)),
    ).toHaveLength(1);

    vi.mocked(webpush.sendNotification).mockResolvedValue({
      statusCode: 201,
    } as any);
    const retriedRun = await sendDueReminders({
      now: new Date("2026-11-08T09:00:00.000Z"),
    });
    expect(retriedRun.sent).toBe(1);
    expect(
      await db
        .select()
        .from(sentRemindersTable)
        .where(eq(sentRemindersTable.eventId, retryEventId)),
    ).toHaveLength(1);
  });

  it("deduplicates the repeated local hour during the fall DST transition", async () => {
    const id = suffix();
    const eventId = `task6-reminder-dst-${id}`;
    const endpoint = `https://push.example.invalid/task6-dst/${id}`;
    await seedReminder({
      id: eventId,
      ownerId: `task6-dst-owner-${id}`,
      endpoint,
      date: "2026-11-01",
      time: "01:30",
      timeZone: "America/New_York",
    });

    const firstOccurrence = await sendDueReminders({
      now: new Date("2026-11-01T05:30:00.000Z"),
    });
    const repeatedWallClockHour = await sendDueReminders({
      now: new Date("2026-11-01T06:30:00.000Z"),
    });
    expect(firstOccurrence.sent).toBe(1);
    expect(repeatedWallClockHour.sent).toBe(0);
    expect(repeatedWallClockHour.alreadySentSkips).toBe(1);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
  });

  it("does not invent a delivery time for a nonexistent spring-forward hour", async () => {
    const id = suffix();
    const eventId = `task6-reminder-spring-dst-${id}`;
    const endpoint = `https://push.example.invalid/task6-spring-dst/${id}`;
    await seedReminder({
      id: eventId,
      ownerId: `task6-spring-dst-owner-${id}`,
      endpoint,
      date: "2026-03-08",
      time: "02:30",
      timeZone: "America/New_York",
    });

    const run = await sendDueReminders({
      now: new Date("2026-03-08T07:30:00.000Z"),
    });
    expect(run.sent).toBe(0);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
    expect(
      await db
        .select()
        .from(sentRemindersTable)
        .where(eq(sentRemindersTable.eventId, eventId)),
    ).toHaveLength(0);
  });

  it("enforces analytics rate limits using the schema-managed PostgreSQL table", async () => {
    const clientIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
    fixtureAnalyticsIps.push(clientIp);
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      Object.defineProperty(req, "ip", { configurable: true, value: clientIp });
      next();
    });
    app.use(trackRouter);

    for (let attempt = 0; attempt < 30; attempt += 1) {
      await request(app)
        .post("/track")
        .send({ event: "task6_test_event" })
        .expect(200);
    }
    await request(app)
      .post("/track")
      .send({ event: "task6_test_event" })
      .expect(429);

    const [rateLimit] = await db
      .select({ requestCount: analyticsRateLimitsTable.requestCount })
      .from(analyticsRateLimitsTable)
      .where(eq(analyticsRateLimitsTable.clientIp, clientIp));
    expect(rateLimit.requestCount).toBe(31);
  });
});
