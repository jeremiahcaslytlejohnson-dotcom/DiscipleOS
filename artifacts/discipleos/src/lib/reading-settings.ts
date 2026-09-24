export type ReadingPaceMode = "relaxed" | "standard" | "fast" | "custom";
export type ReadingOrder = "consecutive" | "randomized";

export const DEFAULT_READING_WPM = 200;
export const READING_WPM_BY_MODE = {
  relaxed: 140,
  standard: DEFAULT_READING_WPM,
  fast: 275,
} as const;

export interface ReadingDefaults {
  paceMode: ReadingPaceMode;
  customMinutesPerChapter: number;
  dailyReadingBudget: number;
  preferredReadingTime: string;
  readingOrder: ReadingOrder;
}

export const DEFAULT_READING_DEFAULTS: ReadingDefaults = {
  paceMode: "standard",
  customMinutesPerChapter: 5,
  dailyReadingBudget: 20,
  preferredReadingTime: "07:00",
  readingOrder: "consecutive",
};

export const READING_SETTINGS_KEY = "discipleos:reading-defaults";

function settingsKey(ownerId?: string | null) {
  return ownerId ? `${READING_SETTINGS_KEY}:${ownerId}` : READING_SETTINGS_KEY;
}

const PACE_MODES = new Set<ReadingPaceMode>(["relaxed", "standard", "fast", "custom"]);
const READING_ORDERS = new Set<ReadingOrder>(["consecutive", "randomized"]);

export function normalizeReadingDefaults(value: unknown): ReadingDefaults {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const paceMode = PACE_MODES.has(candidate.paceMode as ReadingPaceMode)
    ? candidate.paceMode as ReadingPaceMode
    : DEFAULT_READING_DEFAULTS.paceMode;
  const readingOrder = READING_ORDERS.has(candidate.readingOrder as ReadingOrder)
    ? candidate.readingOrder as ReadingOrder
    : DEFAULT_READING_DEFAULTS.readingOrder;
  const customMinutesPerChapter = Number(candidate.customMinutesPerChapter);
  const dailyReadingBudget = Number(candidate.dailyReadingBudget);
  const preferredReadingTime =
    typeof candidate.preferredReadingTime === "string" &&
    /^\d{2}:\d{2}$/.test(candidate.preferredReadingTime)
      ? candidate.preferredReadingTime
      : DEFAULT_READING_DEFAULTS.preferredReadingTime;

  return {
    paceMode,
    customMinutesPerChapter: Number.isFinite(customMinutesPerChapter)
      ? Math.min(60, Math.max(1, Math.round(customMinutesPerChapter)))
      : DEFAULT_READING_DEFAULTS.customMinutesPerChapter,
    dailyReadingBudget: Number.isFinite(dailyReadingBudget)
      ? Math.min(240, Math.max(5, Math.round(dailyReadingBudget)))
      : DEFAULT_READING_DEFAULTS.dailyReadingBudget,
    preferredReadingTime,
    readingOrder,
  };
}

export function loadReadingDefaults(ownerId?: string | null): ReadingDefaults {
  if (typeof window === "undefined") return { ...DEFAULT_READING_DEFAULTS };
  try {
    const raw = window.localStorage.getItem(settingsKey(ownerId));
    return raw ? normalizeReadingDefaults(JSON.parse(raw)) : { ...DEFAULT_READING_DEFAULTS };
  } catch {
    return { ...DEFAULT_READING_DEFAULTS };
  }
}

export function saveReadingDefaults(value: unknown, ownerId?: string | null): ReadingDefaults {
  const normalized = normalizeReadingDefaults(value);
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(settingsKey(ownerId), JSON.stringify(normalized));
    }
  } catch {
    // The API remains the source of truth for signed-in users when storage is unavailable.
  }
  return normalized;
}

export function getReadingWpm(defaults: ReadingDefaults) {
  if (defaults.paceMode === "custom") {
    return Math.max(40, Math.round(676 / defaults.customMinutesPerChapter));
  }
  return READING_WPM_BY_MODE[defaults.paceMode];
}

export function applyReadingDefaultsToPlanForm(defaults: ReadingDefaults) {
  const paceMode = defaults.paceMode === "custom" ? "chapters" : "time";
  const dailyMinutes = defaults.dailyReadingBudget;

  return {
    paceMode,
    readingPaceMode: defaults.paceMode,
    readingCustomMinutesPerChapter: defaults.customMinutesPerChapter,
    dailyMinutes,
    targetChaptersPerDay: defaults.paceMode === "custom"
      ? Math.max(0.5, Math.round((dailyMinutes / defaults.customMinutesPerChapter) * 2) / 2)
      : 2.5,
    readingWpm: getReadingWpm(defaults),
    readingTime: defaults.preferredReadingTime,
    readingMode: defaults.readingOrder === "randomized" ? "random" : "consecutive",
  };
}