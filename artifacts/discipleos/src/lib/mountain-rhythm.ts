import { addDaysISO, getLocalWeekday } from "./local-date";

export const RHYTHM_COPY =
  "Mountain Rhythm reflects consistency with your active reading climb—not spiritual worth—and calendar activities remain separate.";
export const EMPTY_RHYTHM_COPY =
  "Choose the 7-Day Climb to begin.";
export const RECENT_RHYTHM_DAYS = 7;

export const RHYTHM_LEVELS = [
  { min: 0, max: 24, name: "Basecamp" },
  { min: 25, max: 49, name: "On the Trail" },
  { min: 50, max: 69, name: "Gaining Elevation" },
  { min: 70, max: 84, name: "Ridgeline" },
  { min: 85, max: 100, name: "Summit Rhythm" },
];

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

export const RHYTHM_CATEGORIES = [
  ["scripture", "Scripture"],
  ["prayer", "Prayer"],
  ["fasting", "Fasting"],
  ["church", "Church"],
  ["faithEvents", "Faith events"],
] as const;

function getWindow(today: string) {
  return {
    start: addDaysISO(today, -6),
    end: today,
    dates: Array.from({ length: 7 }, (_, index) => addDaysISO(today, index - 6)),
  };
}

function normalizeWeekdays(value: any) {
  return Array.isArray(value)
    ? value.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];
}

export function eventOccursOnDate(event: any, dateISO: string) {
  if (!event?.repeat || event.repeat === "none") return event.date === dateISO;
  if (dateISO < event.date) return false;
  if (event.repeatUntil && dateISO > event.repeatUntil) return false;
  if (event.repeat === "daily") return true;
  if (event.repeat === "weekly") {
    return normalizeWeekdays(event.repeatWeekdays).includes(getLocalWeekday(dateISO));
  }
  return false;
}

export function rhythmEventCategory(event: any) {
  const type = String(event?.type || "").trim().toLowerCase();
  if (type === "birthday" || type === "birthdays") return null;
  if (type === "prayer") return "prayer";
  if (type === "fast" || type === "fasting") return "fasting";
  if (type === "church") return "church";
  return event?.countsTowardRhythm ? "faithEvents" : null;
}

function getCompletedMap(plan: any) {
  if (plan?.completed && typeof plan.completed === "object" && !Array.isArray(plan.completed)) {
    return plan.completed;
  }
  return (Array.isArray(plan?.completedChapterKeys) ? plan.completedChapterKeys : []).reduce(
    (map: any, key: string) => ({ ...map, [key]: true }),
    {},
  );
}

function getDayCompletionDates(plan: any): Record<string, string> {
  if (
    !plan?.dayCompletionDates ||
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
  ) as Record<string, string>;
}

export function mergeLocalCompletionHistory(serverPlan: any, localPlan: any) {
  if (!localPlan) return serverPlan;

  const earnedDayKeys = [
    ...new Set([
      ...(Array.isArray(localPlan.earnedDayKeys) ? localPlan.earnedDayKeys : []),
      ...(Array.isArray(serverPlan.earnedDayKeys) ? serverPlan.earnedDayKeys : []),
    ]),
  ];
  const dayCompletionDates = {
    ...(serverPlan.dayCompletionDates || {}),
    ...(localPlan.dayCompletionDates || {}),
  };

  return {
    ...serverPlan,
    ...(earnedDayKeys.length > 0 ? { earnedDayKeys } : {}),
    ...(Object.keys(dayCompletionDates).length > 0 ? { dayCompletionDates } : {}),
  };
}

function getEarnedDayCompletionDates(
  plan: any,
  completedMap: Record<string, boolean>,
) {
  const hasExplicitCompletionState =
    plan?.completed &&
    typeof plan.completed === "object" &&
    !Array.isArray(plan.completed);
  if (
    hasExplicitCompletionState &&
    !Object.values(completedMap).some(Boolean)
  ) {
    return new Map<string, string>();
  }
  const completionDates = getDayCompletionDates(plan);
  const earnedDayKeys = Array.isArray(plan?.earnedDayKeys)
    ? plan.earnedDayKeys.filter((date: unknown): date is string => typeof date === "string")
    : [];
  const hasExplicitHistory = Object.keys(completionDates).length > 0;
  const result = new Map<string, string>();

  Object.entries(completionDates).forEach(([day, completedOn]) => {
    result.set(day, completedOn);
  });
  earnedDayKeys.forEach((day: string) => {
    if (!result.has(day)) result.set(day, day);
  });

  // Older plans have no timing history. Preserve their earned days, but only
  // infer a completed day when there is no explicit history to consult.
  if (!hasExplicitHistory && earnedDayKeys.length === 0) {
    for (const assignment of plan?.assignments || []) {
      if (
        assignment?.date &&
        assignment?.readings?.length &&
        assignment.readings.every((reading: any) => Boolean(completedMap[reading.key]))
      ) {
        result.set(String(assignment.date), String(assignment.date));
      }
    }
  }

  return result;
}

function getCompletedDaySetThroughDate(
  plan: any,
  completedMap: Record<string, boolean>,
  scheduledDateSet: Set<string>,
  asOfDate?: string,
) {
  const earnedCompletionDates = getEarnedDayCompletionDates(plan, completedMap);
  return new Set(
    [...earnedCompletionDates].filter(([date, completedOn]) =>
      scheduledDateSet.has(date) &&
      (!asOfDate || (date <= asOfDate && completedOn <= asOfDate)),
    ).map(([date]) => date),
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function sortedPlans(plans: any[]) {
  return plans
    .filter((plan) =>
      Array.isArray(plan?.assignments) &&
      plan.assignments.some((assignment: any) => assignment?.readings?.length),
    )
    .sort((a, b) => {
      const aUpdated = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bUpdated - aUpdated || String(a.id).localeCompare(String(b.id));
    });
}

function getJourneyProfile(plan: any) {
  const assignments = (plan?.assignments || [])
    .filter((assignment: any) => assignment?.date && assignment?.readings?.length)
    .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));
  const scheduledDates = [
    ...new Set<string>(assignments.map((assignment: any) => String(assignment.date))),
  ];
  const descriptor = [
    plan?.journeyType,
    plan?.journeyKey,
    plan?.templateKey,
    plan?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const explicitDays = [plan?.journeyDays, plan?.durationDays, plan?.totalDays]
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
  const type = namedJourney?.type || String(plan?.journeyType || "custom");
  const label = namedJourney?.label || String(plan?.name || "Reading journey");
  const mountainScale = clamp(0.72 + ((journeyDays - 7) / 33) * 0.28, 0.64, 1.2);

  return {
    assignments,
    scheduledDates,
    startDate: scheduledDates[0] || plan?.startDate,
    endDate: scheduledDates.at(-1) || plan?.endDate,
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

export const MOUNTAIN_RHYTHM_ROUTES = [
  {
    kind: "7-day-climb",
    label: "7-Day Climb",
    description: "A focused week in Genesis.",
    days: 7,
    comingLater: false,
  },
  {
    kind: "20-day-reset",
    label: "20-Day Reset",
    description: "The four Gospels and Acts over 20 days. Currently locked.",
    days: 20,
    locked: true,
  },
  {
    kind: "40-day-climb",
    label: "40-Day Climb",
    description: "A 40-day route from 1 Samuel through Nehemiah.",
    days: 40,
    comingLater: true,
  },
] as const;

export function getStructuredClimbType(plan: any) {
  const identity = [
    plan?.journeyKey,
    plan?.journeyType,
    plan?.templateKey,
    plan?.name,
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

export function isStructuredClimbPlan(plan: any) {
  return Boolean(getStructuredClimbType(plan));
}

function getStructuredClimbProfile(plan: any) {
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

function hasStructuredClimbAssignments(plan: any) {
  return (
    Array.isArray(plan?.assignments) &&
    plan.assignments.some((assignment: any) => assignment?.readings?.length)
  );
}

export function isStructuredClimbComplete(plan: any) {
  const profile = getStructuredClimbProfile(plan);
  if (!profile || !hasStructuredClimbAssignments(plan)) return false;
  const scheduledDates = new Set(profile.scheduledDates);
  return (
    [...getEarnedDayCompletionDates(plan, getCompletedMap(plan)).keys()].filter((date) =>
      scheduledDates.has(date),
    ).length >= profile.journeyDays
  );
}

export function getCompletedStructuredClimb(plan: any) {
  const profile = getStructuredClimbProfile(plan);
  if (!profile || !hasStructuredClimbAssignments(plan)) return null;

  const completedMap = getCompletedMap(plan);
  const scheduledDates = new Set(profile.scheduledDates);
  const completedDays = [...getEarnedDayCompletionDates(plan, completedMap).keys()].filter((date) =>
    scheduledDates.has(date),
  ).length;
  if (completedDays < profile.journeyDays) return null;

  const mountainScale = profile.mountainScale;
  return {
    planId: plan.id,
    type: profile.type,
    label: profile.label,
    completedDays: profile.journeyDays,
    journeyDays: profile.journeyDays,
    journeyProgress: 100,
    earnedAscent: Math.round(profile.journeyDays * mountainScale * 10) / 10,
  };
}

export function findActiveStructuredClimb(plans: any[] = []) {
  return (
    sortedPlans(plans).find(
      (plan) => isStructuredClimbPlan(plan) && !isStructuredClimbComplete(plan),
    ) || null
  );
}

export function resolveStructuredClimbPlanId(
  plans: any[] = [],
  preferredPlanId?: string | null,
) {
  const preferredPlan = plans.find((plan) => plan?.id === preferredPlanId);
  if (
    preferredPlan &&
    isStructuredClimbPlan(preferredPlan) &&
    hasStructuredClimbAssignments(preferredPlan)
  ) {
    return preferredPlan.id;
  }
  return findActiveStructuredClimb(plans)?.id || null;
}

function getAssignmentCompletion(assignment: any, completedMap: Record<string, boolean>) {
  const readings = assignment?.readings || [];
  const completed = readings.filter((reading: any) => Boolean(completedMap[reading.key])).length;
  return {
    planned: readings.length,
    completed,
    fraction: readings.length === 0 ? 0 : completed / readings.length,
    complete: readings.length > 0 && completed === readings.length,
  };
}

export function calculateMountainRhythm({
  today,
  plans = [],
  events = [],
  eventCompletions = {},
  accessTier = "full",
  selectedPlanId,
}: {
  today: string;
  plans?: any[];
  events?: any[];
  eventCompletions?: Record<string, boolean>;
  accessTier?: "basic" | "full";
  selectedPlanId?: string | null;
}) {
  const window = getWindow(today);
  const categories: any = {
    scripture: { completed: 0, planned: 0 },
    prayer: { completed: 0, planned: 0 },
    fasting: { completed: 0, planned: 0 },
    church: { completed: 0, planned: 0 },
    faithEvents: { completed: 0, planned: 0 },
  };
  const commitments: any[] = [];

  const orderedPlans = sortedPlans(plans);
  const selectedPlan =
    selectedPlanId && orderedPlans.find((plan) => plan.id === selectedPlanId);
  const profile = selectedPlan ? getStructuredClimbProfile(selectedPlan) : null;
  const selectedCompletedMap = selectedPlan ? getCompletedMap(selectedPlan) : {};
  const assignmentByDate = new Map<string, any>();
  const assignmentCompletionByDate = new Map<string, ReturnType<typeof getAssignmentCompletion>>();

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
  const completedDaySet = selectedPlan
    ? getCompletedDaySetThroughDate(
        selectedPlan,
        selectedCompletedMap,
        scheduledDateSet,
        today,
      )
    : new Set<string>();
  const completed = Math.min(planned, completedDaySet.size);
  const journeyProgress =
    planned === 0 ? 0 : roundPercent((completed / planned) * 100);
  const todayAssignment = assignmentCompletionByDate.get(today);
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
    .filter((day) => day.date <= today && day.plannedUnits > 0);

  for (const date of profile?.scheduledDates || []) {
    const {
      assignment,
      assignmentCompletion,
      plannedUnits,
      completedUnits,
      completion,
    } = getDayCompletion(date);
    const status: RhythmDayStatus =
      date > today
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
      return Boolean(completedOn && completedOn <= date && completedOn <= today);
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
    if (date > today) {
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
      if (date === today) consecutiveMissedDays = 0;
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
      // A late make-up changes the current day, not the old scheduled anchor.
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
          (recentDays.reduce((sum, day) => sum + day.completion * 100, 0) /
            recentDays.length),
        );
  const rhythmProgress =
    planned === 0
      ? 0
      : recentScore === null
        ? 0
        : recentScore;
  const currentTrailPoint = [...trail]
    .reverse()
    .find((point) => point.date <= today && point.status !== "future");
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