import { describe, expect, it, vi } from "vitest";
import { estimateChapterMinutes } from "../../discipleos/src/bible-data";
import { calculateMountainRhythm } from "../../discipleos/src/lib/mountain-rhythm";
import {
  activateConsistencyResetPlan,
  CONSISTENCY_RESET_DAYS,
  CONSISTENCY_RESET_NAME,
  CONSISTENCY_RESET_TEMPLATE_KEY,
  LEGACY_CONSISTENCY_RESET_TEMPLATE_KEY,
  buildConsistencyResetSchedule,
  createConsistencyResetPlan,
  expandConsistencyResetContent,
  findActiveConsistencyReset,
  isConsistencyResetComplete,
  isConsistencyResetPlan,
  isCurrentConsistencyResetPlan,
  isRetiredConsistencyResetPlan,
  normalizeConsistencyResetPlan,
  resolveSelectedPlanId,
} from "../../discipleos/src/lib/consistency-reset";

describe("20-Day Reset", () => {
  it("expands every intended range into one canonical chapter", () => {
    const chapters = expandConsistencyResetContent(estimateChapterMinutes);
    const keys = chapters.map((chapter) => chapter.key);

    expect(chapters).toHaveLength(117);
    expect(new Set(keys).size).toBe(117);
    expect(keys).toContain("Matthew-1");
    expect(keys).toContain("Matthew-28");
    expect(keys).toContain("Mark-16");
    expect(keys).toContain("Luke-24");
    expect(keys).toContain("John-21");
    expect(keys).toContain("Acts-28");
    expect(keys).not.toContain("Psalms-30");
    expect(keys).toContain("Acts-9");
    expect(keys).not.toContain("Matthew-29");
  });

  it("creates exactly 20 consecutive days with balanced estimated minutes", () => {
    const { assignments, totalChapters, totalMinutes } =
      buildConsistencyResetSchedule("2026-08-27", estimateChapterMinutes);
    const assigned = assignments.flatMap((day) => day.readings);
    const minutes = assignments.map((day) => day.estimatedMinutes);

    expect(assignments).toHaveLength(CONSISTENCY_RESET_DAYS);
    expect(totalChapters).toBe(117);
    expect(assigned).toHaveLength(totalChapters);
    expect(new Set(assigned.map((chapter) => chapter.key)).size).toBe(totalChapters);
    expect(assignments[0].date).toBe("2026-08-27");
    expect(assignments.at(-1)?.date).toBe("2026-09-15");
    expect(minutes.reduce((sum, value) => sum + value, 0)).toBe(totalMinutes);
    // Chapter boundaries are indivisible, so the optimal partition can differ
    // by a few estimated minutes while still staying close to the daily target.
    expect(Math.max(...minutes) - Math.min(...minutes)).toBeLessThanOrEqual(7);

    for (let index = 1; index < assignments.length; index += 1) {
      const previous = new Date(`${assignments[index - 1].date}T12:00:00Z`);
      const current = new Date(`${assignments[index].date}T12:00:00Z`);
      expect(current.getTime() - previous.getTime()).toBe(86_400_000);
    }
  });

  it("recognizes current and historical 20-day Reset records without rewriting their identity", () => {
    expect(isConsistencyResetPlan({
      id: "new-reset-instance",
      templateKey: CONSISTENCY_RESET_TEMPLATE_KEY,
      name: CONSISTENCY_RESET_NAME,
    })).toBe(true);
    expect(isConsistencyResetPlan({
      id: "legacy-reset-instance",
      templateKey: LEGACY_CONSISTENCY_RESET_TEMPLATE_KEY,
      name: "20-Day Consistency Reset",
    })).toBe(true);
    expect(isConsistencyResetPlan({
      id: "retired-reset",
      name: "Historical plan",
      templateKey: "30-day-consistency-reset",
    })).toBe(false);
    expect(isRetiredConsistencyResetPlan({
      id: "retired-reset",
      templateKey: "30-day-consistency-reset",
      name: "30-Day Consistency Reset",
    })).toBe(true);
    expect(isConsistencyResetPlan({
      id: "ordinary-plan",
      templateKey: "custom",
      name: "A custom plan",
    })).toBe(false);
  });

  it("migrates the old 20-day identity while preserving completion history", () => {
    const legacy = {
      id: "old-20-day-reset",
      templateKey: LEGACY_CONSISTENCY_RESET_TEMPLATE_KEY,
      name: "20-Day Consistency Reset",
      completed: { "Matthew-1": true },
      assignments: [{ date: "2026-08-27", readings: [{ key: "Matthew-1" }] }],
    };

    const migrated = normalizeConsistencyResetPlan(legacy);

    expect(isCurrentConsistencyResetPlan(migrated)).toBe(true);
    expect(migrated).toMatchObject({
      id: legacy.id,
      name: CONSISTENCY_RESET_NAME,
      templateKey: CONSISTENCY_RESET_TEMPLATE_KEY,
      completed: legacy.completed,
      assignments: legacy.assignments,
    });
  });

  it("does not normalize retired 30-day plans into a current Reset", () => {
    const legacy = {
      id: "old-30-day-reset",
      templateKey: "30-day-consistency-reset",
      name: "30-Day Consistency Reset",
      assignments: [{ date: "2026-08-27", readings: [{ key: "Matthew-1" }] }],
      completed: {},
    };
    const migrated = normalizeConsistencyResetPlan(legacy);

    expect(migrated).toEqual(legacy);
    expect(isRetiredConsistencyResetPlan(migrated)).toBe(true);
    expect(isCurrentConsistencyResetPlan(migrated)).toBe(false);
    expect(findActiveConsistencyReset([migrated])).toBeNull();
  });

  it("only treats a fully completed Reset as restartable", () => {
    const assignments = [
      { date: "2026-08-27", readings: [{ key: "Matthew-1" }] },
      { date: "2026-08-28", readings: [{ key: "Matthew-2" }] },
    ];

    expect(isConsistencyResetComplete({
      templateKey: CONSISTENCY_RESET_TEMPLATE_KEY,
      assignments,
      completed: { "Matthew-1": true },
    })).toBe(false);
    expect(isConsistencyResetComplete({
      templateKey: CONSISTENCY_RESET_TEMPLATE_KEY,
      assignments,
      completed: { "Matthew-1": true, "Matthew-2": true },
    })).toBe(true);
  });

  it("commits one persisted Reset, selects it, assigns today's reading, and starts at Basecamp", async () => {
    const existingPlan = { id: "existing-plan", name: "Existing", assignments: [] };
    const reset = createConsistencyResetPlan({
      id: "reset-success",
      startDate: "2026-08-28",
      estimateChapterMinutes,
    });
    let plans: any[] = [existingPlan];
    let selectedPlanId: string | null = existingPlan.id;
    const savePlan = vi.fn(async () => {});
    const commitPlan = vi.fn((savedPlan) => {
      plans = [savedPlan, ...plans];
      selectedPlanId = savedPlan.id;
    });

    const result = await activateConsistencyResetPlan({
      plans,
      plan: reset,
      savePlan,
      commitPlan,
    });

    expect(result.outcome).toBe("activated");
    expect(savePlan).toHaveBeenCalledOnce();
    expect(commitPlan).toHaveBeenCalledOnce();
    expect(plans).toContain(existingPlan);
    expect(plans.filter(isConsistencyResetPlan)).toHaveLength(1);
    expect(resolveSelectedPlanId(plans, selectedPlanId)).toBe(reset.id);
    expect(reset.assignments).toHaveLength(20);
    expect(reset.name).toBe("20-Day Reset");
    expect(reset.templateKey).toBe("20-day-reset");
    expect(reset.journeyKey).toBe("20-day-reset");
    expect(reset.assignments.find((assignment) => assignment.date === reset.startDate)?.readings.length).toBeGreaterThan(0);

    const rhythm = calculateMountainRhythm({
      today: reset.startDate,
      plans,
      selectedPlanId: reset.id,
    });
    expect(rhythm.level).toBe("Basecamp");
    expect(rhythm.completedDays).toBe(0);
    expect(rhythm.earnedProgress).toBe(0);
    expect(rhythm.todayPlanned).toBe(1);
  });

  it("does not commit or select a Reset when persistence fails", async () => {
    const existingPlan = { id: "existing-plan", name: "Existing", assignments: [] };
    const originalPlans = [existingPlan];
    const reset = createConsistencyResetPlan({
      id: "reset-failure",
      startDate: "2026-08-28",
      estimateChapterMinutes,
    });
    const commitPlan = vi.fn();

    const result = await activateConsistencyResetPlan({
      plans: originalPlans,
      plan: reset,
      savePlan: vi.fn(async () => {
        throw Object.assign(new Error("offline"), { status: 503 });
      }),
      commitPlan,
    });

    expect(result.outcome).toBe("failed");
    expect(commitPlan).not.toHaveBeenCalled();
    expect(originalPlans).toEqual([existingPlan]);
    expect(resolveSelectedPlanId(originalPlans, existingPlan.id)).toBe(existingPlan.id);
    expect(findActiveConsistencyReset(originalPlans)).toBeNull();
  });

  it("short-circuits duplicate activation and restores an active Reset during hydration", async () => {
    const reset = createConsistencyResetPlan({
      id: "persisted-reset",
      startDate: "2026-08-28",
      estimateChapterMinutes,
    });
    const hydratedPlans = JSON.parse(JSON.stringify([
      { id: "older-plan", name: "Older", assignments: [] },
      reset,
    ]));
    const savePlan = vi.fn(async () => {});
    const commitPlan = vi.fn();

    const result = await activateConsistencyResetPlan({
      plans: hydratedPlans,
      plan: createConsistencyResetPlan({
        id: "duplicate-reset",
        startDate: "2026-08-28",
        estimateChapterMinutes,
      }),
      savePlan,
      commitPlan,
    });

    expect(result).toEqual({ outcome: "existing", plan: hydratedPlans[1] });
    expect(savePlan).not.toHaveBeenCalled();
    expect(commitPlan).not.toHaveBeenCalled();
    expect(resolveSelectedPlanId(hydratedPlans, null)).toBe(reset.id);
  });
});