import { addDaysISO } from "./local-date";

export const CONSISTENCY_RESET_DAYS = 20;
export const CONSISTENCY_RESET_TEMPLATE_KEY = "20-day-reset";
export const LEGACY_CONSISTENCY_RESET_TEMPLATE_KEY = "20-day-consistency-reset";
export const CONSISTENCY_RESET_NAME = "20-Day Reset";
export const CONSISTENCY_RESET_DESCRIPTION =
  "The four Gospels and Acts, arranged into a focused 20-day route.";
export const LEGACY_CONSISTENCY_RESET_NAMES = new Set([
  "20-Day Consistency Reset",
]);
const RETIRED_CONSISTENCY_RESET_TEMPLATE_KEYS = new Set([
  "30-day-consistency-reset",
]);
const RETIRED_CONSISTENCY_RESET_NAMES = new Set([
  "30-Day Consistency Reset",
  "30 Day Consistency Reset",
  "Legacy 30-Day Reset",
]);
const RETIRED_CONSISTENCY_RESET_IDS = new Set([
  "plan-30day-consistency-reset",
  "discipleos-30-day-reset",
]);

/**
 * The Reset follows the four Gospels and Acts in canonical order. Ranges are
 * expanded into individual chapters before scheduling so counts and completion
 * keys remain chapter-accurate.
 */
export const CONSISTENCY_RESET_CONTENT = [
  ["Matthew 1-28"],
  ["Mark 1-16"],
  ["Luke 1-24"],
  ["John 1-21"],
  ["Acts 1-28"],
] as const;

export type ResetChapter = {
  book: string;
  chapter: number;
  key: string;
  label: string;
  estimatedMinutes: number;
};

export type ResetAssignment = {
  date: string;
  readings: ResetChapter[];
  chapterCount: number;
  estimatedMinutes: number;
};

export type ConsistencyResetPlan = {
  id: string;
  templateKey: typeof CONSISTENCY_RESET_TEMPLATE_KEY;
  name: typeof CONSISTENCY_RESET_NAME;
  journeyKey: "20-day-reset";
  journeyType: "20-day-reset";
  selectedBooks: string[];
  description: string;
  startDate: string;
  endDate: string;
  readingTime: string;
  readingMode: "preset";
  paceMode: "time";
  dailyMinutes: number;
  journeyDays: number;
  durationDays: number;
  totalDays: number;
  totalChapters: number;
  totalMinutes: number;
  color: string;
  assignments: ResetAssignment[];
  completed: Record<string, boolean>;
  resetInstanceId: string;
};

export function parseResetReference(reference: string) {
  const match = reference.trim().match(/^(.*?)(?:\s+)(\d+)(?:-(\d+))?$/);
  if (!match) throw new Error(`Invalid Reset reading reference: ${reference}`);

  const displayBook = match[1];
  const book = displayBook === "Psalm" ? "Psalms" : displayBook;
  const start = Number(match[2]);
  const end = Number(match[3] || match[2]);
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const chapter = start + index;
    return { book, chapter, label: `${displayBook} ${chapter}` };
  });
}

export function expandConsistencyResetContent(
  estimateChapterMinutes: (book: string, chapter: number) => number,
): ResetChapter[] {
  return CONSISTENCY_RESET_CONTENT.flatMap((day) =>
    day.flatMap((reference) =>
      parseResetReference(reference).map(({ book, chapter, label }) => ({
        book,
        chapter,
        label,
        key: `${book}-${chapter}`,
        estimatedMinutes: estimateChapterMinutes(book, chapter),
      })),
    ),
  );
}

/**
 * Partitions the canonical chapter stream into exactly 20 contiguous days using
 * dynamic programming. It minimizes squared deviation from the overall daily
 * minute target, which keeps the schedule balanced without dropping order or
 * treating a displayed range as one chapter.
 */
export function buildConsistencyResetSchedule(
  startDate: string,
  estimateChapterMinutes: (book: string, chapter: number) => number,
): {
  assignments: ResetAssignment[];
  totalChapters: number;
  totalMinutes: number;
} {
  const chapters = expandConsistencyResetContent(estimateChapterMinutes);
  const totalChapters = chapters.length;
  const totalMinutes = chapters.reduce((sum, chapter) => sum + chapter.estimatedMinutes, 0);
  if (totalChapters < CONSISTENCY_RESET_DAYS) {
    throw new Error("The Consistency Reset content must fill at least 20 days");
  }

  const targetMinutes = totalMinutes / CONSISTENCY_RESET_DAYS;
  const prefix = [0];
  for (const chapter of chapters) {
    prefix.push(prefix[prefix.length - 1] + chapter.estimatedMinutes);
  }

  const costs = Array.from({ length: CONSISTENCY_RESET_DAYS + 1 }, () =>
    Array<number>(totalChapters + 1).fill(Number.POSITIVE_INFINITY),
  );
  const previousCuts = Array.from({ length: CONSISTENCY_RESET_DAYS + 1 }, () =>
    Array<number>(totalChapters + 1).fill(-1),
  );
  costs[0][0] = 0;

  for (let day = 1; day <= CONSISTENCY_RESET_DAYS; day += 1) {
    for (let end = day; end <= totalChapters; end += 1) {
      for (let start = day - 1; start < end; start += 1) {
        if (!Number.isFinite(costs[day - 1][start])) continue;
        const minutes = prefix[end] - prefix[start];
        const deviation = minutes - targetMinutes;
        const cost = costs[day - 1][start] + deviation * deviation;
        if (
          cost < costs[day][end] ||
          (cost === costs[day][end] && start < previousCuts[day][end])
        ) {
          costs[day][end] = cost;
          previousCuts[day][end] = start;
        }
      }
    }
  }

  const ranges: Array<[number, number]> = [];
  let end = totalChapters;
  for (let day = CONSISTENCY_RESET_DAYS; day > 0; day -= 1) {
    const start = previousCuts[day][end];
    if (start < 0) throw new Error("Unable to build a 20-day Consistency Reset schedule");
    ranges.unshift([start, end]);
    end = start;
  }

  const assignments = ranges.map(([start, rangeEnd], index) => {
    const readings = chapters.slice(start, rangeEnd);
    return {
      date: addDaysISO(startDate, index),
      readings,
      chapterCount: readings.length,
      estimatedMinutes: readings.reduce((sum, chapter) => sum + chapter.estimatedMinutes, 0),
    };
  });

  return { assignments, totalChapters, totalMinutes };
}

export function createConsistencyResetPlan({
  id,
  startDate,
  estimateChapterMinutes,
}: {
  id: string;
  startDate: string;
  estimateChapterMinutes: (book: string, chapter: number) => number;
}): ConsistencyResetPlan {
  const { assignments, totalChapters, totalMinutes } =
    buildConsistencyResetSchedule(startDate, estimateChapterMinutes);

  return {
    id,
    templateKey: CONSISTENCY_RESET_TEMPLATE_KEY,
    name: CONSISTENCY_RESET_NAME,
    journeyKey: "20-day-reset",
    journeyType: "20-day-reset",
    selectedBooks: [],
    description: CONSISTENCY_RESET_DESCRIPTION,
    startDate,
    endDate: assignments[assignments.length - 1].date,
    readingTime: "07:00",
    readingMode: "preset",
    paceMode: "time",
    dailyMinutes: Math.round(totalMinutes / assignments.length),
    journeyDays: assignments.length,
    durationDays: assignments.length,
    totalDays: assignments.length,
    totalChapters,
    totalMinutes,
    color: "from-[#D4A017] to-[#8A6414]",
    assignments,
    completed: {},
    resetInstanceId: id,
  };
}

export function isConsistencyResetPlan(plan: any) {
  return isCurrentConsistencyResetPlan(plan);
}

export function isRetiredConsistencyResetPlan(plan: any) {
  const name = typeof plan?.name === "string" ? plan.name.trim() : "";
  return (
    RETIRED_CONSISTENCY_RESET_TEMPLATE_KEYS.has(plan?.templateKey) ||
    RETIRED_CONSISTENCY_RESET_NAMES.has(name) ||
    RETIRED_CONSISTENCY_RESET_IDS.has(plan?.id)
  );
}

export function isCurrentConsistencyResetPlan(plan: any) {
  const name = typeof plan?.name === "string" ? plan.name.trim() : "";
  return (
    plan?.templateKey === CONSISTENCY_RESET_TEMPLATE_KEY ||
    plan?.templateKey === LEGACY_CONSISTENCY_RESET_TEMPLATE_KEY ||
    name === CONSISTENCY_RESET_NAME ||
    LEGACY_CONSISTENCY_RESET_NAMES.has(name)
  );
}

export function normalizeConsistencyResetPlan(plan: any) {
  if (isCurrentConsistencyResetPlan(plan)) {
    return {
      ...plan,
      name: CONSISTENCY_RESET_NAME,
      templateKey: CONSISTENCY_RESET_TEMPLATE_KEY,
    };
  }
  return plan;
}

export function isConsistencyResetComplete(plan: any) {
  if (!isConsistencyResetPlan(plan)) return false;
  const completed =
    plan?.completed && typeof plan.completed === "object" && !Array.isArray(plan.completed)
      ? plan.completed
      : new Set(Array.isArray(plan?.completedChapterKeys) ? plan.completedChapterKeys : []);
  const assignments = Array.isArray(plan?.assignments) ? plan.assignments : [];

  return (
    assignments.length > 0 &&
    assignments.every(
      (assignment: any) =>
        Array.isArray(assignment.readings) &&
        assignment.readings.length > 0 &&
        assignment.readings.every((reading: any) =>
          completed instanceof Set ? completed.has(reading.key) : completed[reading.key] === true,
        ),
    )
  );
}

export function findActiveConsistencyReset(plans: any[]) {
  return (
    plans.find(
      (plan) =>
        isCurrentConsistencyResetPlan(plan) &&
        !isConsistencyResetComplete(plan),
    ) || null
  );
}

export function resolveSelectedPlanId(
  plans: any[],
  preferredPlanId?: string | null,
) {
  if (
    preferredPlanId &&
    plans.some((plan) => plan?.id === preferredPlanId)
  ) {
    return preferredPlanId;
  }

  return findActiveConsistencyReset(plans)?.id || plans[0]?.id || null;
}

export async function activateConsistencyResetPlan({
  plans,
  plan,
  savePlan,
  commitPlan,
}: {
  plans: any[];
  plan: ConsistencyResetPlan;
  savePlan: (plan: ConsistencyResetPlan) => Promise<void>;
  commitPlan: (plan: ConsistencyResetPlan) => void;
}): Promise<
  | { outcome: "existing"; plan: any }
  | { outcome: "activated"; plan: ConsistencyResetPlan }
  | { outcome: "failed"; plan: ConsistencyResetPlan; error: unknown }
> {
  const existing = findActiveConsistencyReset(plans);
  if (existing) return { outcome: "existing", plan: existing };

  try {
    await savePlan(plan);
    commitPlan(plan);
    return { outcome: "activated", plan };
  } catch (error) {
    return { outcome: "failed", plan, error };
  }
}
