import { and, eq, gte, lte } from "drizzle-orm";
import {
  db,
  eventCompletionsTable,
  eventsTable,
  readingPlansTable,
} from "@workspace/db";
import type { RhythmAccessTier } from "../auth/capabilities";

export const RHYTHM_COPY =
  "Your elevation reflects consistency with your active reading climb—not your spiritual worth.";
export const EMPTY_RHYTHM_COPY =
  "Choose the 7-Day Climb to begin.";
export const RECENT_RHYTHM_DAYS = 7;

export const RHYTHM_LEVELS = [
  { min: 0, max: 24, name: "Basecamp" },
  { min: 25, max: 49, name: "On the Trail" },
  { min: 50, max: 69, name: "Gaining Elevation" },
  { min: 70, max: 84, name: "Ridgeline" },
  { min: 85, max: 100, name: "Summit Rhythm" },
] as const;

export type RhythmCategory =
  | "scripture"
  | "prayer"
  | "fasting"
  | "church"
  | "faithEvents";

export type RhythmDayStatus =
  | "complete"
  | "partial"
  | "missed"
  | "future"
  | "unscheduled";

export type RhythmTrailPoint = {
  date: string;
  status: RhythmDayStatus;
  planned: number;
  completed: number;
  completion: number;
  elevationPercent: number;
  earnedPercent: number;
  rhythmPercent: number;
};

export type RhythmPlan = {
  id: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  assignments?: Array<{ date: string; readings?: Array<{ key: string }> }>;
  completed?: Record<string, boolean>;
  completedChapterKeys?: string[];
  earnedDayKeys?: string[];
  dayCompletionDates?: Record<string, string>;
  journeyType?: string;
  journeyKey?: string;
  templateKey?: string;
  journeyDays?: number;
  durationDays?: number;
  totalDays?: number;
  updatedAt?: Date | string | null;
};

export type RhythmEvent = {
  id: string;
  title?: string;
  type?: string;
  date: string;
  repeat?: string;
  repeatWeekdays?: number[];
  repeatUntil?: string | null;
  countsTowardRhythm?: boolean;
  timeZone?: string;
};

export type RhythmEventCompletion = {
  eventId: string;
  occurrenceDate: string;
  completed: boolean;
};

export type RhythmCommitment = {
  id: string;
  date: string;
  category: RhythmCategory;
  title: string;
  completed: boolean;
  planId?: string;
  eventId?: string;
};

export type MountainRhythmResult = {
  level: string;
  percentage: number;
  rawPercentage: number;
  todayPercentage: number;
  todayPlanned: number;
  todayCompleted: number;
  rhythmProgress: number;
  recordedDays: number;
  maturityDays: number;
  completed: number;
  planned: number;
  journeyDays: number;
  completedDays: number;
  journeyProgress: number;
  earnedProgress: number;
  earnedAscent: number;
  totalAscent: number;
  currentElevationPercent: number;
  currentTrend: string;
  journeyType: string | null;
  journeyLabel: string | null;
  journeyComplete: boolean;
  mountainScale: number;
  windowStart: string;
  windowEnd: string;
  message?: string;
  copy: string;
  categories: Record<RhythmCategory, { completed: number; planned: number }>;
  commitments: RhythmCommitment[];
  trail: RhythmTrailPoint[];
  eventCompletions?: RhythmEventCompletion[];
};

function addDays(dateISO: string, amount: number) {
  const date = new Date(`${dateISO}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function getDateWindow(today: string) {
  return {
    start: addDays(today, -6),
    end: today,
    dates: Array.from({ length: 7 }, (_, index) => addDays(today, index - 6)),
  };
}

export function getLocalDate(timeZone: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

function normalizeWeekdays(value: unknown) {
  return Array.isArray(value)
    ? value.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];
}

export function eventOccursOnDate(event: RhythmEvent, dateISO: string) {
  if (!event.repeat || event.repeat === "none") return event.date === dateISO;
  if (dateISO < event.date) return false;
  if (event.repeatUntil && dateISO > event.repeatUntil) return false;

  if (event.repeat === "daily") return true;
  if (event.repeat === "weekly") {
    const weekday = new Date(`${dateISO}T12:00:00Z`).getUTCDay();
    return normalizeWeekdays(event.repeatWeekdays).includes(weekday);
  }
  return false;
}

function getCompletedMap(plan: RhythmPlan): Record<string, boolean> {
  if (plan.completed && typeof plan.completed === "object") return plan.completed;
  return (plan.completedChapterKeys ?? []).reduce<Record<string, boolean>>((map, key) => {
    map[key] = true;
    return map;
  }, {});
}

function getDayCompletionDates(plan: RhythmPlan): Record<string, string> {
  if (
    !plan.dayCompletionDates ||
    typeof plan.dayCompletionDates !== "object" ||
    Array.isArray(plan.dayCompletionDates)
  ) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(plan.dayCompletionDates).filter(
      ([day, completedOn]) =>
        /^\d{4}-\d{2}-\d{2}$/.test(day) &&
        typeof completedOn === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(completedOn),
    ),
  );
}

function getEarnedDayCompletionDates(
  plan: RhythmPlan,
  completedMap: Record<string, boolean>,
) {
  const hasExplicitCompletionState =
    plan.completed &&
    typeof plan.completed === "object" &&
    !Array.isArray(plan.completed);
  if (
    hasExplicitCompletionState &&
    !Object.values(completedMap).some(Boolean)
  ) {
    return new Map<string, string>();
  }
  const completionDates = getDayCompletionDates(plan);
  const earnedDayKeys = Array.isArray(plan.earnedDayKeys)
    ? plan.earnedDayKeys.filter((date): date is string => typeof date === "string")
    : [];
  const hasExplicitHistory = Object.keys(completionDates).length > 0;
  const result = new Map<string, string>();

  Object.entries(completionDates).forEach(([day, completedOn]) => {
    result.set(day, completedOn);
  });
  earnedDayKeys.forEach((day) => {
    if (!result.has(day)) result.set(day, day);
  });

  if (!hasExplicitHistory && earnedDayKeys.length === 0) {
    for (const assignment of plan.assignments ?? []) {
      if (
        assignment.date &&
        assignment.readings?.length &&
        assignment.readings.every((reading) => Boolean(completedMap[reading.key]))
      ) {
        result.set(assignment.date, assignment.date);
      }
    }
  }

  return result;
}

function getCompletedDaySetThroughDate(
  plan: RhythmPlan,
  completedMap: Record<string, boolean>,
  scheduledDateSet: Set<string>,
  asOfDate: string,
) {
  const earnedCompletionDates = getEarnedDayCompletionDates(plan, completedMap);
  return new Set(
    [...earnedCompletionDates]
      .filter(
        ([date, completedOn]) =>
          scheduledDateSet.has(date) &&
          date <= asOfDate &&
          completedOn <= asOfDate,
      )
      .map(([date]) => date),
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function sortedPlans(plans: RhythmPlan[]) {
  return plans
    .filter((plan) =>
      Array.isArray(plan.assignments) &&
      plan.assignments.some((assignment) => assignment.readings?.length),
    )
    .sort((left, right) => {
      const leftDate = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
      const rightDate = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
      return rightDate - leftDate || String(left.id).localeCompare(String(right.id));
    });
}

function getJourneyProfile(plan: RhythmPlan) {
  const assignments = (plan.assignments ?? [])
    .filter((assignment) => assignment.date && assignment.readings?.length)
    .sort((left, right) => left.date.localeCompare(right.date));
  const scheduledDates = [
    ...new Set<string>(assignments.map((assignment) => String(assignment.date))),
  ];
  const descriptor = [
    plan.journeyType,
    plan.journeyKey,
    plan.templateKey,
    plan.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const explicitDays = [plan.journeyDays, plan.durationDays, plan.totalDays]
    .map(Number)
    .find((value) => Number.isInteger(value) && value > 0);
  const namedJourney =
    descriptor.includes("7-day") || descriptor.includes("7 day") || descriptor.includes("7day")
      ? { type: "7-day-climb", label: "7-Day Climb", days: 7 }
      : descriptor.includes("40-day") || descriptor.includes("40 day") || descriptor.includes("40day")
        ? { type: "40-day-climb", label: "40-Day Climb", days: 40 }
        : descriptor.includes("20-day") ||
            descriptor.includes("20 day") ||
            descriptor.includes("20day") ||
            descriptor.includes("consistency reset")
          ? { type: "20-day-reset", label: "20-Day Reset", days: 20 }
          : null;
  const journeyDays = Math.max(
    1,
    explicitDays || namedJourney?.days || scheduledDates.length,
  );
  const type = namedJourney?.type || plan.journeyType || "custom";
  const label = namedJourney?.label || plan.name || "Reading journey";
  const mountainScale = clamp(0.72 + ((journeyDays - 7) / 33) * 0.28, 0.64, 1.2);

  return {
    assignments,
    scheduledDates,
    startDate: scheduledDates[0] || plan.startDate,
    endDate: scheduledDates.at(-1) || plan.endDate,
    journeyDays,
    type,
    label,
    mountainScale,
  };
}

const STRUCTURED_CLIMB_DAYS = {
  "7-day-climb": 7,
  "20-day-reset": 20,
  "40-day-climb": 40,
} as const;

function getStructuredClimbType(plan: RhythmPlan) {
  const identity = [
    plan.journeyKey,
    plan.journeyType,
    plan.templateKey,
    plan.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[–—]/g, "-");

  if (identity.includes("7-day-climb") || identity.includes("7 day climb")) {
    return "7-day-climb" as const;
  }
  if (
    identity.includes("20-day-reset") ||
    identity.includes("20 day reset") ||
    identity.includes("20-day-consistency-reset") ||
    identity.includes("20 day consistency reset")
  ) {
    return "20-day-reset" as const;
  }
  if (identity.includes("40-day-climb") || identity.includes("40 day climb")) {
    return "40-day-climb" as const;
  }
  return null;
}

function getStructuredClimbProfile(plan: RhythmPlan) {
  const type = getStructuredClimbType(plan);
  if (!type) return null;
  const profile = getJourneyProfile(plan);
  const journeyDays = STRUCTURED_CLIMB_DAYS[type];
  return {
    ...profile,
    type,
    label:
      type === "7-day-climb"
        ? "7-Day Climb"
        : type === "20-day-reset"
          ? "20-Day Reset"
          : "40-Day Climb",
    journeyDays,
    mountainScale: clamp(0.72 + ((journeyDays - 7) / 33) * 0.28, 0.64, 1.2),
  };
}

function getAssignmentCompletion(
  assignment: NonNullable<RhythmPlan["assignments"]>[number],
  completedMap: Record<string, boolean>,
) {
  const readings = assignment.readings ?? [];
  const completed = readings.filter((reading) => Boolean(completedMap[reading.key])).length;
  return {
    planned: readings.length,
    completed,
    fraction: readings.length === 0 ? 0 : completed / readings.length,
    complete: readings.length > 0 && completed === readings.length,
  };
}

function emptyCategories() {
  return {
    scripture: { completed: 0, planned: 0 },
    prayer: { completed: 0, planned: 0 },
    fasting: { completed: 0, planned: 0 },
    church: { completed: 0, planned: 0 },
    faithEvents: { completed: 0, planned: 0 },
  } satisfies Record<RhythmCategory, { completed: number; planned: number }>;
}

export function calculateMountainRhythm(input: {
  today: string;
  plans: RhythmPlan[];
  events: RhythmEvent[];
  completions?: RhythmEventCompletion[] | Record<string, boolean>;
  accessTier?: RhythmAccessTier;
  selectedPlanId?: string | null;
}): MountainRhythmResult {
  const window = getDateWindow(input.today);
  const categories = emptyCategories();
  const commitments: RhythmCommitment[] = [];

  const orderedPlans = sortedPlans(input.plans ?? []);
  const selectedPlan =
    input.selectedPlanId &&
    orderedPlans.find((plan) => plan.id === input.selectedPlanId);
  const profile = selectedPlan ? getStructuredClimbProfile(selectedPlan) : null;
  const selectedCompletedMap = selectedPlan ? getCompletedMap(selectedPlan) : {};
  const assignmentByDate = new Map<string, NonNullable<RhythmPlan["assignments"]>[number]>();
  const assignmentCompletionByDate = new Map<
    string,
    ReturnType<typeof getAssignmentCompletion>
  >();

  if (selectedPlan && profile) {
    for (const assignment of profile.assignments) {
      assignmentByDate.set(assignment.date, assignment);
      const completion = getAssignmentCompletion(assignment, selectedCompletedMap);
      assignmentCompletionByDate.set(assignment.date, completion);
      if (assignment.date >= window.start && assignment.date <= window.end) {
        commitments.push({
          id: `plan:${selectedPlan.id}:${assignment.date}`,
          date: assignment.date,
          category: "scripture",
          title: selectedPlan.name || "Reading plan",
          completed: completion.complete,
          planId: selectedPlan.id,
        });
        categories.scripture.planned += 1;
        if (completion.complete) categories.scripture.completed += 1;
      }
    }
  }

  const planned = profile?.journeyDays || 0;
  const scheduledDateSet = new Set(profile?.scheduledDates || []);
  const earnedCompletionDates = selectedPlan
    ? getEarnedDayCompletionDates(selectedPlan, selectedCompletedMap)
    : new Map<string, string>();
  const completedDaySet = new Set(
    selectedPlan
      ? getCompletedDaySetThroughDate(
          selectedPlan,
          selectedCompletedMap,
          scheduledDateSet,
          input.today,
        )
      : [],
  );
  const completed = Math.min(planned, completedDaySet.size);
  const journeyProgress =
    planned === 0 ? 0 : roundPercent((completed / planned) * 100);
  const todayAssignment = assignmentCompletionByDate.get(input.today);
  const todayPlanned = todayAssignment ? 1 : 0;
  const todayCompleted = todayAssignment?.fraction || 0;
  const todayPercentage =
    todayPlanned === 0
      ? 0
      : Math.round((todayCompleted / todayPlanned) * 100);
  const trail: RhythmTrailPoint[] = [];
  let earnedDays = 0;
  let previousEarnedDays = 0;
  let consecutiveMissedDays = 0;
  let rhythmElevation = 0;
  const getDayCompletion = (date: string) => {
    const assignment = assignmentByDate.get(date);
    const assignmentCompletion = assignmentCompletionByDate.get(date);
    const plannedUnits = assignment ? 1 : 0;
    const completedUnits = assignment ? assignmentCompletion?.fraction || 0 : 0;
    return {
      assignment,
      assignmentCompletion,
      plannedUnits,
      completedUnits,
      completion: plannedUnits === 0 ? 0 : completedUnits / plannedUnits,
    };
  };
  const recentDays = window.dates
    .map((date) => ({ date, ...getDayCompletion(date) }))
    .filter((day) => day.date <= input.today && day.plannedUnits > 0);

  for (const date of profile?.scheduledDates || []) {
    const {
      assignment,
      assignmentCompletion,
      plannedUnits,
      completedUnits,
      completion,
    } = getDayCompletion(date);
    const status: RhythmDayStatus =
      date > input.today
        ? "future"
        : plannedUnits === 0
          ? "unscheduled"
          : completion >= 1
            ? "complete"
            : completion > 0
              ? "partial"
              : "missed";

    earnedDays = [...completedDaySet].filter((day) => {
      const completedOn = earnedCompletionDates.get(day);
      return Boolean(
        completedOn && completedOn <= date && completedOn <= input.today,
      );
    }).length;
    const completionOccurred = [...earnedCompletionDates.values()].some(
      (completedOn) => completedOn === date,
    );
    const completionDateForDay = earnedCompletionDates.get(date);
    const wasCompletedLate =
      status === "complete" &&
      Boolean(completionDateForDay && completionDateForDay > date);
    const rhythmStatus = wasCompletedLate ? "missed" : status;
    const ascentPercent =
      planned === 0 ? 0 : roundPercent((earnedDays / planned) * 100);
    if (date > input.today) {
      trail.push({
        date,
        status,
        planned: plannedUnits,
        completed: completedUnits,
        completion: Math.round(completion * 100),
        elevationPercent: roundPercent(clamp(rhythmElevation, 0, 100)),
        earnedPercent: ascentPercent,
        rhythmPercent: roundPercent(clamp(rhythmElevation, 0, 100)),
      });
      previousEarnedDays = earnedDays;
      continue;
    }
    if (completionOccurred || earnedDays > previousEarnedDays) {
      rhythmElevation = Math.max(rhythmElevation, ascentPercent);
      consecutiveMissedDays = 0;
    } else if (rhythmStatus === "partial") {
      rhythmElevation = Math.max(
        rhythmElevation,
        ascentPercent - (1 - completion) * (100 / Math.max(1, planned)) * 0.35,
      );
      if (date === input.today) consecutiveMissedDays = 0;
    } else if (rhythmStatus === "missed") {
      consecutiveMissedDays += 1;
      if (consecutiveMissedDays > 1) {
        rhythmElevation = Math.max(
          0,
          rhythmElevation - (100 / Math.max(1, planned)) * 0.45,
        );
      } else {
        rhythmElevation = Math.max(rhythmElevation, ascentPercent);
      }
    } else if (rhythmStatus === "complete") {
      rhythmElevation = Math.max(rhythmElevation, ascentPercent);
    } else {
      consecutiveMissedDays = 0;
      rhythmElevation = Math.max(rhythmElevation, ascentPercent);
    }
    const rhythmPercent = roundPercent(
      clamp(rhythmElevation, 0, 100),
    );
    previousEarnedDays = earnedDays;
    trail.push({
      date,
      status,
      planned: plannedUnits,
      completed: completedUnits,
      completion: Math.round(completion * 100),
      elevationPercent: rhythmPercent,
      earnedPercent: ascentPercent,
      rhythmPercent,
    });
  }

  const recentScore =
    recentDays.length === 0
      ? null
      : Math.round(
          recentDays.reduce((sum, day) => sum + day.completion * 100, 0) /
            recentDays.length,
        );
  const rhythmProgress =
    planned === 0
      ? 0
      : recentScore === null
        ? 0
        : recentScore;
  const currentTrailPoint = [...trail]
    .reverse()
    .find((point) => point.date <= input.today && point.status !== "future");
  const currentElevationPercent = currentTrailPoint?.elevationPercent || 0;
  const percentage = journeyProgress;
  const level =
    RHYTHM_LEVELS.find(
      (entry) =>
        currentElevationPercent >= entry.min &&
        currentElevationPercent <= entry.max,
    )?.name ||
    "Basecamp";
  const recordedDays = recentDays.length;
  const journeyComplete = Boolean(profile && completed >= profile.journeyDays);
  const currentTrend =
    recentScore === null || recentScore >= 80
      ? "Steady"
      : recentScore >= 45
        ? "Recovering"
        : "Needs a next step";

  return {
    level,
    percentage,
    rawPercentage: journeyProgress,
    todayPercentage,
    todayPlanned,
    todayCompleted,
    rhythmProgress,
    recordedDays,
    maturityDays: profile?.journeyDays || 0,
    completed,
    planned,
    journeyDays: profile?.journeyDays || 0,
    completedDays: completed,
    journeyProgress,
    earnedProgress: journeyProgress,
    earnedAscent: Math.round(completed * (profile?.mountainScale || 0) * 10) / 10,
    totalAscent: Math.round((profile?.journeyDays || 0) * (profile?.mountainScale || 0) * 10) / 10,
    currentElevationPercent,
    currentTrend,
    journeyType: profile?.type || null,
    journeyLabel: profile?.label || null,
    journeyComplete,
    mountainScale: profile?.mountainScale || 0,
    windowStart: window.start,
    windowEnd: window.end,
    message:
      !profile
        ? EMPTY_RHYTHM_COPY
        : journeyComplete
          ? `Your ${profile.label} is complete. Your earned ascent stays with you.`
          : `${completed} of ${profile.journeyDays} planned days completed.`,
    copy: RHYTHM_COPY,
    categories,
    commitments,
    trail,
  };
}

export async function loadMountainRhythm(
  userId: string,
  timeZone: string,
  accessTier: RhythmAccessTier,
  selectedPlanId?: string | null,
): Promise<MountainRhythmResult> {
  const today = getLocalDate(timeZone);
  const window = getDateWindow(today);
  const [planRows, eventRows, completionRows] = await Promise.all([
    db
      .select()
      .from(readingPlansTable)
      .where(eq(readingPlansTable.userId, userId)),
    db
      .select({ id: eventsTable.id })
      .from(eventsTable)
      .where(eq(eventsTable.userId, userId)),
    db
      .select()
      .from(eventCompletionsTable)
      .where(
        and(
          gte(eventCompletionsTable.occurrenceDate, window.start),
          lte(eventCompletionsTable.occurrenceDate, window.end),
        ),
      ),
  ]);

  const result = calculateMountainRhythm({
    today,
    accessTier,
    plans: planRows.map((row) => ({
      ...(row.data as RhythmPlan),
      id: row.id,
      updatedAt: row.updatedAt,
    })),
    events: [],
    completions: [],
    selectedPlanId,
  });
  const ownedEventIds = new Set(eventRows.map((event) => event.id));
  return {
    ...result,
    eventCompletions: completionRows
      .filter((completion) => ownedEventIds.has(completion.eventId))
      .map((completion) => ({
        eventId: completion.eventId,
        occurrenceDate: completion.occurrenceDate,
        completed: completion.completed,
      })),
  };
}