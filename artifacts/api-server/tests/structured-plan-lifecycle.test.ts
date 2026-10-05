import { describe, expect, it } from "vitest";
import {
  findActiveStructuredPlan,
  getPlanDateInTimeZone,
  getStructuredPlanLifecycle,
  isActiveStructuredPlan,
} from "@workspace/structured-plan-lifecycle";

const DAY_COUNTS = {
  "7-day-climb": 7,
  "20-day-reset": 20,
  "40-day-climb": 40,
} as const;

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function makePlan(
  id: string,
  kind: keyof typeof DAY_COUNTS = "7-day-climb",
  startDate = "2026-08-01",
) {
  const days = DAY_COUNTS[kind];
  return {
    id,
    journeyKey: kind,
    journeyType: kind,
    journeyDays: days,
    startDate,
    endDate: addDays(startDate, days - 1),
    timeZone: "America/New_York",
    assignments: Array.from({ length: days }, (_, index) => ({
      date: addDays(startDate, index),
      readings: [{ key: `${id}-reading-${index}` }],
    })),
    completed: {} as Record<string, boolean>,
    earnedDayKeys: [] as string[],
  };
}

describe("structured plan lifecycle", () => {
  it("expires an incomplete climb only after its final scheduled date", () => {
    const plan = makePlan("expired");

    expect(getStructuredPlanLifecycle(plan, "2026-08-07")).toBe("active");
    expect(getStructuredPlanLifecycle(plan, "2026-08-08")).toBe("expired");
    expect(isActiveStructuredPlan(plan, "2026-08-08")).toBe(false);
  });

  it("keeps a completed climb historical when its readings are later reopened", () => {
    const plan = makePlan("completed");
    plan.earnedDayKeys = plan.assignments.map((day) => day.date);

    expect(getStructuredPlanLifecycle(plan, "2026-08-03")).toBe("completed");
    expect(isActiveStructuredPlan(plan, "2026-08-03")).toBe(false);
  });

  it("recognizes a currently fully checked structured route as completed", () => {
    const plan = makePlan("checked");
    plan.completed = Object.fromEntries(
      plan.assignments.map((day) => [day.readings[0].key, true]),
    );

    expect(getStructuredPlanLifecycle(plan, "2026-08-03")).toBe("completed");
  });

  it("uses the same lifecycle for 20-day and 40-day structured plans", () => {
    for (const kind of ["20-day-reset", "40-day-climb"] as const) {
      const plan = makePlan(kind, kind);
      expect(getStructuredPlanLifecycle(plan, "2026-08-02")).toBe("active");
      expect(getStructuredPlanLifecycle(plan, plan.endDate)).toBe("active");
      expect(getStructuredPlanLifecycle(plan, addDays(plan.endDate, 1))).toBe(
        "expired",
      );
    }
  });

  it("does not apply the structured lifecycle to ordinary plans", () => {
    const ordinaryPlan = {
      id: "ordinary",
      name: "My reading plan",
      startDate: "2026-08-01",
      endDate: "2026-08-07",
      assignments: makePlan("ordinary").assignments,
    };

    expect(getStructuredPlanLifecycle(ordinaryPlan, "2026-08-08")).toBeNull();
    expect(isActiveStructuredPlan(ordinaryPlan, "2026-08-08")).toBe(false);
  });

  it("selects the newest active plan instead of an expired or completed record", () => {
    const expired = makePlan("expired");
    const completed = makePlan("completed");
    completed.earnedDayKeys = completed.assignments.map((day) => day.date);
    const current = makePlan("current", "7-day-climb", "2026-08-20");

    expect(findActiveStructuredPlan([expired, completed, current], "2026-08-22")?.id).toBe(
      "current",
    );
  });

  it("calculates a plan date in the plan timezone around UTC midnight", () => {
    expect(
      getPlanDateInTimeZone(
        "America/New_York",
        new Date("2026-10-05T02:00:00.000Z"),
      ),
    ).toBe("2026-10-04");
  });
});
