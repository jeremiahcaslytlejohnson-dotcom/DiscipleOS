import { inArray } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import {
  db,
  deletedEventTombstonesTable,
  eventCompletionsTable,
  eventsTable,
  readingPlansTable,
} from "@workspace/db";
import {
  flushPendingOps,
  type PendingOp,
} from "../../discipleos/src/lib/sync";
import { createApp, createPgSessionStore } from "../src/app";

function uniqueId(label: string) {
  return `guided-climb-delete-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function addDays(dateISO: string, amount: number) {
  const date = new Date(`${dateISO}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function extractCookie(res: request.Response): string {
  const header = res.headers["set-cookie"];
  if (Array.isArray(header)) return header.map((value) => value.split(";")[0]).join("; ");
  if (typeof header === "string") return header.split(";")[0];
  return "";
}

describe("Guided Climb reminder deletion persistence", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("replays a failed plan-and-reminder delete and preserves server-side unrelated data", async () => {
    const planId = uniqueId("plan");
    const unrelatedPlanId = uniqueId("ordinary-plan");
    const mountainPlanId = uniqueId("mountain-plan");
    const reminderId = `guided-climb-reminder:${planId}`;
    const unrelatedEventId = uniqueId("prayer");
    const eventIds = [reminderId, unrelatedEventId];
    const planIds = [planId, unrelatedPlanId, mountainPlanId];
    const sessionStore = createPgSessionStore();
    const appBeforeReplay = createApp(sessionStore);
    const appAfterReplay = createApp(createPgSessionStore());
    let cookie = "";

    try {
      const session = await request(appBeforeReplay).get("/api/session/info").expect(200);
      cookie = extractCookie(session);

      const startDate = "2026-10-11";
      const mountainAssignments = Array.from({ length: 7 }, (_, index) => ({
        date: addDays(startDate, index),
        readings: [{ key: `${mountainPlanId}-${index}`, label: `Genesis ${index + 1}` }],
      }));
      const mountainPlan = {
        id: mountainPlanId,
        name: "7-Day Climb",
        journeyKey: "7-day-climb",
        journeyType: "7-day-climb",
        journeyDays: 7,
        durationDays: 7,
        totalDays: 7,
        startDate,
        endDate: addDays(startDate, 6),
        assignments: mountainAssignments,
        completed: { [`${mountainPlanId}-0`]: true },
        earnedDayKeys: [addDays(startDate, 0)],
        dayCompletionDates: { [addDays(startDate, 0)]: addDays(startDate, 0) },
      };
      const ordinaryPlan = {
        id: unrelatedPlanId,
        name: "Personal reading plan",
        selectedBooks: ["Psalms"],
        startDate,
        endDate: startDate,
        assignments: [
          { date: startDate, readings: [{ key: `${unrelatedPlanId}-reading`, label: "Psalm 1" }] },
        ],
        completed: { [`${unrelatedPlanId}-reading`]: true },
      };
      const guidedPlan = {
        id: planId,
        name: "Discover Scripture",
        selectedBooks: ["Genesis", "Matthew", "Psalms", "Proverbs"],
        startDate,
        endDate: addDays(startDate, 26),
        readingTime: "08:15",
        guidedClimb: { series: "Guided Climb", set: 1, slug: "find-your-footing" },
        assignments: Array.from({ length: 27 }, (_, index) => ({
          date: addDays(startDate, index),
          readings: [{ key: `${planId}-reading-${index}`, label: `Reading ${index + 1}` }],
        })),
        completed: {},
      };
      const guidedReminder = {
        id: reminderId,
        title: "Discover Scripture reading",
        type: "event",
        date: guidedPlan.startDate,
        time: guidedPlan.readingTime,
        notes: "Daily reading reminder for Guided Climb: Discover Scripture.",
        remind: true,
        reminderMinutes: 0,
        repeat: "daily",
        repeatWeekdays: [0, 1, 2, 3, 4, 5, 6],
        repeatUntil: guidedPlan.endDate,
        countsTowardRhythm: false,
      };
      const unrelatedEvent = {
        id: unrelatedEventId,
        title: "Morning prayer",
        type: "event",
        date: startDate,
        time: "06:30",
        notes: "Personal prayer reminder",
        remind: true,
        reminderMinutes: 0,
        repeat: "daily",
      };

      for (const plan of [mountainPlan, ordinaryPlan, guidedPlan]) {
        await request(appBeforeReplay)
          .post("/api/reading/plans")
          .set("Cookie", cookie)
          .send(plan)
          .expect(200);
      }
      for (const event of [guidedReminder, unrelatedEvent]) {
        await request(appBeforeReplay)
          .post("/api/events")
          .set("Cookie", cookie)
          .send(event)
          .expect(200);
      }

      const beforeDeletePlans = await request(appBeforeReplay)
        .get("/api/reading/plans")
        .set("Cookie", cookie)
        .expect(200);
      const beforeDeleteEvents = await request(appBeforeReplay)
        .get("/api/events")
        .set("Cookie", cookie)
        .expect(200);
      expect(beforeDeletePlans.body.plans.map((plan: any) => plan.id)).toEqual(
        expect.arrayContaining(planIds),
      );
      expect(beforeDeleteEvents.body.events.map((event: any) => event.id)).toEqual(
        expect.arrayContaining(eventIds),
      );

      const pendingDeletes: PendingOp[] = [
        { type: "delete-event", id: reminderId, ts: 1 },
        { type: "delete-plan", id: planId, ts: 2 },
      ];
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Temporary network failure")));
      const remainingAfterFailure = await flushPendingOps(pendingDeletes);
      expect(remainingAfterFailure).toEqual(pendingDeletes);

      const stillPresent = await request(appBeforeReplay)
        .get("/api/events")
        .set("Cookie", cookie)
        .expect(200);
      expect(stillPresent.body.events.map((event: any) => event.id)).toContain(reminderId);

      const replayFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const endpoint = String(input);
        const body = JSON.parse(String(init?.body || "{}"));
        const response = endpoint.endsWith("/reading/plans")
          ? await request(appBeforeReplay)
              .delete("/api/reading/plans")
              .set("Cookie", cookie)
              .send(body)
          : await request(appBeforeReplay)
              .delete("/api/events")
              .set("Cookie", cookie)
              .send(body);
        return { ok: response.status >= 200 && response.status < 300, status: response.status };
      });
      vi.stubGlobal("fetch", replayFetch);
      const remainingAfterReplay = await flushPendingOps(remainingAfterFailure);
      expect(remainingAfterReplay).toEqual([]);
      expect(replayFetch).toHaveBeenCalledTimes(2);

      const serverPlans = await request(appAfterReplay)
        .get("/api/reading/plans")
        .set("Cookie", cookie)
        .expect(200);
      const serverEvents = await request(appAfterReplay)
        .get("/api/events")
        .set("Cookie", cookie)
        .expect(200);
      const plansById = new Map(serverPlans.body.plans.map((plan: any) => [plan.id, plan]));
      const eventsById = new Map(serverEvents.body.events.map((event: any) => [event.id, event]));

      expect(plansById.has(planId)).toBe(false);
      expect(eventsById.has(reminderId)).toBe(false);
      expect(eventsById.get(unrelatedEventId)).toMatchObject({
        title: "Morning prayer",
        notes: "Personal prayer reminder",
      });
      expect(plansById.get(unrelatedPlanId)?.completed).toMatchObject(
        ordinaryPlan.completed,
      );
      expect(plansById.get(mountainPlanId)).toMatchObject({
        completed: mountainPlan.completed,
        earnedDayKeys: mountainPlan.earnedDayKeys,
        dayCompletionDates: mountainPlan.dayCompletionDates,
      });
    } finally {
      vi.unstubAllGlobals();
      if (cookie) {
        await Promise.all([
          request(appBeforeReplay).delete("/api/events").set("Cookie", cookie).send({ id: reminderId }),
          request(appBeforeReplay).delete("/api/events").set("Cookie", cookie).send({ id: unrelatedEventId }),
          request(appBeforeReplay).delete("/api/reading/plans").set("Cookie", cookie).send({ id: planId }),
          request(appBeforeReplay).delete("/api/reading/plans").set("Cookie", cookie).send({ id: unrelatedPlanId }),
          request(appBeforeReplay).delete("/api/reading/plans").set("Cookie", cookie).send({ id: mountainPlanId }),
        ]);
      }
      await db.delete(eventCompletionsTable).where(inArray(eventCompletionsTable.eventId, eventIds));
      await db.delete(eventsTable).where(inArray(eventsTable.id, eventIds));
      await db
        .delete(deletedEventTombstonesTable)
        .where(inArray(deletedEventTombstonesTable.eventId, eventIds));
      await db.delete(readingPlansTable).where(inArray(readingPlansTable.id, planIds));
      if (cookie) {
        const encodedValue = cookie.split(";")[0].slice("connect.sid=".length);
        const signedValue = decodeURIComponent(encodedValue);
        const sessionId = (signedValue.startsWith("s:") ? signedValue.slice(2) : signedValue)
          .split(".")[0];
        await new Promise<void>((resolve, reject) => {
          sessionStore.destroy(sessionId, (error) => (error ? reject(error) : resolve()));
        });
      }
    }
  });
});
