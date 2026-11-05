import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeDatabase = vi.hoisted(() => {
  const plans = new Map<string, { userId: string; data: Record<string, any> }>();
  let legacyBarrierEnabled = false;
  let legacyReadCount = 0;
  let legacyReadTarget = 0;
  let legacyBarrier: Promise<void> | undefined;
  let releaseLegacyBarrier: (() => void) | undefined;
  let rowLockCount = 0;

  return {
    plans,
    reset() {
      plans.clear();
      legacyBarrierEnabled = false;
      legacyReadCount = 0;
      legacyReadTarget = 0;
      legacyBarrier = undefined;
      releaseLegacyBarrier = undefined;
      rowLockCount = 0;
    },
    recordRowLock() {
      rowLockCount += 1;
    },
    getRowLockCount() {
      return rowLockCount;
    },
    enableLegacyReadBarrier(target: number) {
      legacyBarrierEnabled = true;
      legacyReadCount = 0;
      legacyReadTarget = target;
      legacyBarrier = new Promise<void>((resolve) => {
        releaseLegacyBarrier = resolve;
      });
    },
    async waitForLegacyReads() {
      if (!legacyBarrierEnabled || !legacyBarrier) return;
      legacyReadCount += 1;
      if (legacyReadCount === legacyReadTarget) releaseLegacyBarrier?.();
      await legacyBarrier;
    },
  };
});

vi.mock("@workspace/db", () => {
  const readingPlansTable = {
    id: { name: "id" },
    userId: { name: "user_id" },
    data: { name: "data" },
    updatedAt: { name: "updated_at" },
  };
  const rowLocks = new Map<string, Promise<void>>();

  function conditionValue(condition: any, columnName: string): unknown {
    const conditions = Array.isArray(condition) ? condition.flat(Infinity) : [condition];
    return conditions.find((item: any) => item?.columnName === columnName)?.value;
  }

  function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  async function acquireRowLock(key: string): Promise<() => void> {
    const previous = rowLocks.get(key) || Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    rowLocks.set(key, current);
    await previous;
    return release;
  }

  function makeClient(transaction?: {
    lockForUpdate: (key: string) => Promise<void>;
  }) {
    return {
      select() {
        return {
          from() {
            return {
              where(condition: any) {
                const planId = conditionValue(condition, "id") as string;
                const userId = conditionValue(condition, "user_id") as string;
                let pendingLock: Promise<void> | undefined;
                const query = {
                  for(mode: string) {
                    if (mode === "update" && transaction) {
                      pendingLock = transaction.lockForUpdate(`${userId}:${planId}`);
                    }
                    return query;
                  },
                  async limit() {
                    await pendingLock;
                    if (!transaction) await fakeDatabase.waitForLegacyReads();
                    const row = fakeDatabase.plans.get(planId);
                    return row && row.userId === userId
                      ? [{ data: clone(row.data) }]
                      : [];
                  },
                };
                return query;
              },
            };
          },
        };
      },
      update() {
        return {
          set(values: { data: Record<string, any> }) {
            return {
              async where(condition: any) {
                const planId = conditionValue(condition, "id") as string;
                const userId = conditionValue(condition, "user_id") as string;
                const row = fakeDatabase.plans.get(planId);
                if (row?.userId === userId) row.data = clone(values.data);
              },
            };
          },
        };
      },
      insert() {
        return {
          values(values: { id: string; userId: string; data: Record<string, any> }) {
            return {
              async onConflictDoUpdate(options: { set: { data: Record<string, any> } }) {
                const existing = fakeDatabase.plans.get(values.id);
                fakeDatabase.plans.set(values.id, {
                  userId: existing?.userId || values.userId,
                  data: clone(options.set.data || values.data),
                });
              },
            };
          },
        };
      },
    };
  }

  const db = {
    ...makeClient(),
    async transaction<T>(callback: (tx: ReturnType<typeof makeClient>) => Promise<T>) {
      const releases: Array<() => void> = [];
      const tx = makeClient({
        async lockForUpdate(key) {
          fakeDatabase.recordRowLock();
          releases.push(await acquireRowLock(key));
        },
      });
      try {
        return await callback(tx);
      } finally {
        releases.reverse().forEach((release) => release());
      }
    },
  };

  return { db, readingPlansTable };
});

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: (column: { name: string }, value: unknown) => ({
      columnName: column.name,
      value,
    }),
    and: (...conditions: unknown[]) => conditions,
  };
});

import readingRouter from "../src/routes/reading";

const USER_ID = "fixture-user";
const PLAN_ID = "fixture-plan";
const OTHER_PLAN_ID = "fixture-other-plan";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).session = { userId: USER_ID };
    (req as any).log = { error: vi.fn() };
    next();
  });
  app.use(readingRouter);
  return app;
}

function makePlan(id: string, readings: Array<{ date: string; keys: string[] }>) {
  return {
    id,
    assignments: readings.map(({ date, keys }) => ({
      date,
      readings: keys.map((key) => ({ key })),
    })),
    completed: Object.fromEntries(readings.flatMap(({ keys }) => keys.map((key) => [key, false]))),
    earnedDayKeys: ["2026-08-30"],
    dayCompletionDates: { "2026-08-30": "2026-08-31" },
  };
}

describe("reading completion writes serialize per user and plan", () => {
  beforeEach(() => {
    fakeDatabase.reset();
    fakeDatabase.plans.set(PLAN_ID, {
      userId: USER_ID,
      data: makePlan(PLAN_ID, [
        { date: "2026-09-01", keys: ["chapter-a"] },
        { date: "2026-09-02", keys: ["day-b1", "day-b2"] },
      ]),
    });
    fakeDatabase.plans.set(OTHER_PLAN_ID, {
      userId: USER_ID,
      data: makePlan(OTHER_PLAN_ID, [
        { date: "2026-09-03", keys: ["other-plan-chapter"] },
      ]),
    });
  });

  it("keeps overlapping chapter and day updates plus existing history", async () => {
    // Before row locking, force every request to read the same old snapshot.
    // This deterministically recreates the lost-update window without a database.
    fakeDatabase.enableLegacyReadBarrier(3);
    const app = makeApp();

    const [chapterResponse, dayResponse, otherPlanResponse] = await Promise.all([
      request(app).post("/reading/complete").send({
        planId: PLAN_ID,
        key: "chapter-a",
        completed: true,
      }),
      request(app).post("/reading/day-complete").send({
        planId: PLAN_ID,
        date: "2026-09-02",
        completed: true,
        completionDate: "2026-09-02",
      }),
      request(app).post("/reading/complete").send({
        planId: OTHER_PLAN_ID,
        key: "other-plan-chapter",
        completed: true,
      }),
    ]);

    expect(chapterResponse.status).toBe(200);
    expect(dayResponse.status).toBe(200);
    expect(otherPlanResponse.status).toBe(200);

    const savedPlan = fakeDatabase.plans.get(PLAN_ID)!.data;
    expect(savedPlan.completed).toMatchObject({
      "chapter-a": true,
      "day-b1": true,
      "day-b2": true,
    });
    expect(savedPlan.earnedDayKeys).toEqual(["2026-08-30", "2026-09-02"]);
    expect(savedPlan.dayCompletionDates).toEqual({
      "2026-08-30": "2026-08-31",
      "2026-09-02": "2026-09-02",
    });
    expect(fakeDatabase.plans.get(OTHER_PLAN_ID)!.data.completed).toEqual({
      "other-plan-chapter": true,
    });
  });

  it("keeps newer completion state and the first date through stale writes and plan replay", async () => {
    const app = makeApp();

    const firstCompletion = await request(app).post("/reading/day-complete").send({
      planId: PLAN_ID,
      date: "2026-09-02",
      completed: true,
      completionDate: "2026-09-03",
      mutationTs: 200,
    });
    const staleUncompletion = await request(app).post("/reading/day-complete").send({
      planId: PLAN_ID,
      date: "2026-09-02",
      completed: false,
      mutationTs: 100,
    });
    const staleReplay = await request(app).post("/reading/plans").send({
      ...makePlan(PLAN_ID, [
        { date: "2026-09-01", keys: ["chapter-a"] },
        { date: "2026-09-02", keys: ["day-b1", "day-b2"] },
      ]),
      completed: {
        "chapter-a": false,
        "day-b1": false,
        "day-b2": false,
      },
      dayCompletionDates: {
        "2026-09-02": "2026-09-09",
      },
    });

    expect(firstCompletion.status).toBe(200);
    expect(staleUncompletion.status).toBe(200);
    expect(staleReplay.status).toBe(200);

    const savedPlan = fakeDatabase.plans.get(PLAN_ID)!.data;
    expect(savedPlan.completed).toMatchObject({
      "day-b1": true,
      "day-b2": true,
    });
    expect(savedPlan.earnedDayKeys).toEqual(["2026-08-30", "2026-09-02"]);
    expect(savedPlan.dayCompletionDates).toEqual({
      "2026-08-30": "2026-08-31",
      "2026-09-02": "2026-09-03",
    });
    expect(savedPlan.completionUpdatedAt).toMatchObject({
      "day-b1": 200,
      "day-b2": 200,
    });
  });

  it("accepts a newer explicit uncompletion without deleting earned history", async () => {
    const app = makeApp();
    await request(app).post("/reading/day-complete").send({
      planId: PLAN_ID,
      date: "2026-09-02",
      completed: true,
      completionDate: "2026-09-03",
      mutationTs: 200,
    });

    const response = await request(app).post("/reading/day-complete").send({
      planId: PLAN_ID,
      date: "2026-09-02",
      completed: false,
      mutationTs: 300,
    });

    expect(response.status).toBe(200);
    const savedPlan = fakeDatabase.plans.get(PLAN_ID)!.data;
    expect(savedPlan.completed).toMatchObject({
      "day-b1": false,
      "day-b2": false,
    });
    expect(savedPlan.earnedDayKeys).toContain("2026-09-02");
    expect(savedPlan.dayCompletionDates["2026-09-02"]).toBe("2026-09-03");
  });

  it("serializes a stale full-plan replay with a concurrent completion", async () => {
    const app = makeApp();
    const stalePlan = {
      ...makePlan(PLAN_ID, [
        { date: "2026-09-01", keys: ["chapter-a"] },
        { date: "2026-09-02", keys: ["day-b1", "day-b2"] },
      ]),
      completed: {
        "chapter-a": false,
        "day-b1": false,
        "day-b2": false,
      },
    };

    const [planResponse, completionResponse] = await Promise.all([
      request(app).post("/reading/plans").send(stalePlan),
      request(app).post("/reading/complete").send({
        planId: PLAN_ID,
        key: "chapter-a",
        completed: true,
        mutationTs: 500,
      }),
    ]);

    expect(planResponse.status).toBe(200);
    expect(completionResponse.status).toBe(200);
    expect(fakeDatabase.getRowLockCount()).toBeGreaterThanOrEqual(2);
    expect(fakeDatabase.plans.get(PLAN_ID)!.data.completed["chapter-a"]).toBe(true);
  });
});
