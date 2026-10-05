export const STRUCTURED_PLAN_DAYS = {
  "7-day-climb": 7,
  "20-day-reset": 20,
  "40-day-climb": 40,
} as const;

export type StructuredPlanKind = keyof typeof STRUCTURED_PLAN_DAYS;
export type StructuredPlanLifecycle = "active" | "completed" | "expired" | "invalid";

export const DEFAULT_PLAN_TIME_ZONE = "America/New_York";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type PlanRecord = Record<string, any>;

function asPlanRecord(plan: unknown): PlanRecord | null {
  return plan && typeof plan === "object" && !Array.isArray(plan)
    ? (plan as PlanRecord)
    : null;
}

function isISODate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizeIdentity(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[–—]/g, "-").replace(/[_\s]+/g, "-")
    : "";
}

export function getStructuredPlanKind(plan: unknown): StructuredPlanKind | null {
  const record = asPlanRecord(plan);
  if (!record) return null;

  const identity = [
    record.journeyKey,
    record.journeyType,
    record.templateKey,
    record.name,
  ]
    .map(normalizeIdentity)
    .filter(Boolean)
    .join(" ");

  if (/\b7-day-climb\b/.test(identity) || /\b7day-climb\b/.test(identity)) {
    return "7-day-climb";
  }
  if (
    /\b20-day-reset\b/.test(identity) ||
    /\b20-day-consistency-reset\b/.test(identity) ||
    /\b20day-reset\b/.test(identity)
  ) {
    return "20-day-reset";
  }
  if (/\b40-day-climb\b/.test(identity) || /\b40day-climb\b/.test(identity)) {
    return "40-day-climb";
  }
  return null;
}

export function isStructuredPlan(plan: unknown): boolean {
  return getStructuredPlanKind(plan) !== null;
}

function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function getLocalPlanTimeZone(): string {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimeZone(timeZone) ? timeZone : DEFAULT_PLAN_TIME_ZONE;
  } catch {
    return DEFAULT_PLAN_TIME_ZONE;
  }
}

function getPlanTimeZone(plan: PlanRecord): string {
  return isValidTimeZone(plan.timeZone) ? plan.timeZone : DEFAULT_PLAN_TIME_ZONE;
}

export function getPlanDateInTimeZone(
  timeZone: string,
  now: Date = new Date(),
): string {
  const safeTimeZone = isValidTimeZone(timeZone)
    ? timeZone
    : DEFAULT_PLAN_TIME_ZONE;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(date: string, amount: number): string | null {
  if (!isISODate(date)) return null;
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function planAssignments(plan: PlanRecord) {
  return Array.isArray(plan.assignments)
    ? plan.assignments.filter(
        (assignment: any) => assignment && typeof assignment === "object",
      )
    : [];
}

function getScheduledDates(assignments: any[]) {
  return [
    ...new Set(
      assignments
        .map((assignment) => assignment.date)
        .filter(isISODate),
    ),
  ].sort();
}

function getCompletedMap(plan: PlanRecord): Record<string, boolean> {
  if (
    plan.completed &&
    typeof plan.completed === "object" &&
    !Array.isArray(plan.completed)
  ) {
    return plan.completed;
  }
  return Array.isArray(plan.completedChapterKeys)
    ? Object.fromEntries(
        plan.completedChapterKeys
          .filter((key: unknown) => typeof key === "string")
          .map((key: string) => [key, true]),
      )
    : {};
}

function getHistoricalCompletionDates(plan: PlanRecord) {
  const dates = new Set<string>();
  if (Array.isArray(plan.earnedDayKeys)) {
    for (const day of plan.earnedDayKeys) {
      if (isISODate(day)) dates.add(day);
    }
  }
  if (
    plan.dayCompletionDates &&
    typeof plan.dayCompletionDates === "object" &&
    !Array.isArray(plan.dayCompletionDates)
  ) {
    for (const [day, completedOn] of Object.entries(plan.dayCompletionDates)) {
      if (isISODate(day) && isISODate(completedOn)) dates.add(day);
    }
  }
  return dates;
}

function isEveryScheduledDayComplete(
  assignments: any[],
  dates: string[],
  completed: Record<string, boolean>,
) {
  if (dates.length === 0) return false;
  return dates.every((date) => {
    const readings = assignments
      .filter((assignment) => assignment.date === date)
      .flatMap((assignment) =>
        Array.isArray(assignment.readings) ? assignment.readings : [],
      );
    return (
      readings.length > 0 &&
      readings.every(
        (reading) =>
          typeof reading?.key === "string" && completed[reading.key] === true,
      )
    );
  });
}

function getPlanEndDate(plan: PlanRecord, assignments: any[]): string | null {
  if (isISODate(plan.endDate)) return plan.endDate;

  const scheduledDates = getScheduledDates(assignments);
  if (scheduledDates.length > 0) return scheduledDates[scheduledDates.length - 1];

  if (isISODate(plan.startDate)) {
    const kind = getStructuredPlanKind(plan);
    if (kind) return addDays(plan.startDate, STRUCTURED_PLAN_DAYS[kind] - 1);
  }
  return null;
}

/**
 * Structured lifecycle is separate from the live reading-progress display:
 * completed-day history keeps a climb historical even if readings are later
 * reopened, and an incomplete route stops blocking a new climb after its end
 * date. Ordinary plans are deliberately outside this lifecycle.
 */
export function getStructuredPlanLifecycle(
  plan: unknown,
  today?: string,
): StructuredPlanLifecycle | null {
  const record = asPlanRecord(plan);
  const kind = getStructuredPlanKind(record);
  if (!record || !kind) return null;

  const assignments = planAssignments(record);
  const scheduledDates = getScheduledDates(assignments);
  const requiredDays = STRUCTURED_PLAN_DAYS[kind];
  const routeDates = scheduledDates.slice(0, requiredDays);
  const history = getHistoricalCompletionDates(record);
  const allDaysHistoricallyEarned =
    routeDates.length === requiredDays &&
    routeDates.every((date) => history.has(date));
  const allDaysCurrentlyComplete =
    scheduledDates.length >= requiredDays &&
    isEveryScheduledDayComplete(
      assignments,
      routeDates,
      getCompletedMap(record),
    );

  if (
    record.structuredLifecycle === "completed" ||
    isISODate(record.completedAt) ||
    allDaysHistoricallyEarned ||
    allDaysCurrentlyComplete
  ) {
    return "completed";
  }

  const currentDate = isISODate(today)
    ? today
    : getPlanDateInTimeZone(getPlanTimeZone(record));
  const endDate = getPlanEndDate(record, assignments);
  if (endDate && endDate < currentDate) return "expired";

  if (routeDates.length < requiredDays || assignments.length === 0) {
    return "invalid";
  }
  return "active";
}

export function isActiveStructuredPlan(plan: unknown, today?: string): boolean {
  return getStructuredPlanLifecycle(plan, today) === "active";
}

export function findActiveStructuredPlan<T extends { id?: unknown }>(
  plans: T[] = [],
  today?: string,
): T | null {
  return (
    plans
      .filter((plan) => isActiveStructuredPlan(plan, today))
      .sort((a: any, b: any) => {
        const aStart = isISODate(a.startDate) ? a.startDate : "";
        const bStart = isISODate(b.startDate) ? b.startDate : "";
        const startOrder = bStart.localeCompare(aStart);
        if (startOrder !== 0) return startOrder;
        const aUpdated = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bUpdated - aUpdated || String(a.id || "").localeCompare(String(b.id || ""));
      })[0] || null
  );
}
