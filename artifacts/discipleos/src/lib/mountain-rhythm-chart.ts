import { eventOccursOnDate } from "./mountain-rhythm";

export type RhythmChartSeries = {
  key: "scripture" | "prayer" | "fasting" | "combined";
  label: string;
  color: string;
  description: string;
  values: Array<number | null>;
};

const SERIES_META = {
  scripture: {
    label: "Scripture",
    color: "#86EFAC",
    description: "Cumulative completed scheduled reading days",
  },
  prayer: {
    label: "Prayer",
    color: "#F4D77A",
    description: "Cumulative completed scheduled prayer occurrences",
  },
  fasting: {
    label: "Fasting",
    color: "#72C9C0",
    description: "Cumulative completed scheduled fasting occurrences",
  },
  combined: {
    label: "Combined Rhythm",
    color: "#E7E5C8",
    description: "Cumulative completion of scheduled Scripture, Prayer, and Fasting commitments",
  },
} as const;

export function buildMountainRhythmTerrainPoints(length: number) {
  const count = Math.max(2, Math.floor(length) || 2);
  return Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1);
    const undulation = Math.sin(progress * Math.PI * 6) * 11 +
      Math.sin(progress * Math.PI * 13) * 4;
    return {
      x: 16 + progress * 328,
      y: Math.max(62, Math.min(238, 232 - progress * 145 + undulation)),
    };
  });
}

function progress(completed: number, planned: number) {
  return planned > 0 ? Math.round((completed / planned) * 100) : null;
}

function selectedEvents(
  plan: any,
  events: any[],
  discipline: "prayer" | "fasting",
) {
  const choice = plan?.disciplineTracking?.[discipline];
  if (choice?.enabled !== true || !Array.isArray(choice.eventIds)) return [];
  const ids = new Set(choice.eventIds.filter((id: unknown) => typeof id === "string"));
  return [...new Map(
    events
      .filter((event) => ids.has(event?.id))
      .filter((event) => discipline === "prayer"
        ? String(event?.type || "").toLowerCase() === "prayer"
        : ["fast", "fasting"].includes(String(event?.type || "").toLowerCase()))
      .map((event) => [event.id, event]),
  ).values()];
}

export function buildMountainRhythmChartSeries({
  plan,
  trail,
  events = [],
  eventCompletions = {},
  today,
}: {
  plan: any;
  trail: any[];
  events?: any[];
  eventCompletions?: Record<string, boolean>;
  today: string;
}): RhythmChartSeries[] {
  const points = Array.isArray(trail) ? trail : [];
  const dates = points.map((point) => String(point.date || ""));
  const scriptureTotals = dates.map((date, index) => {
    const point = points[index];
    return {
      planned: date && date <= today && Number(point?.planned) > 0 ? Number(point.planned) : 0,
      completed: date && date <= today && Number(point?.planned) > 0
        ? Math.min(Number(point.planned), Math.max(0, Number(point.completed) || 0))
        : 0,
    };
  });
  const scriptureRangePlanned = points.reduce(
    (sum, point) => sum + (Number(point?.planned) > 0 ? Number(point.planned) : 0),
    0,
  );
  const scripture: RhythmChartSeries = {
    key: "scripture",
    ...SERIES_META.scripture,
    values: [],
  };
  let scripturePlanned = 0;
  let scriptureCompleted = 0;
  const prayerOccurrences = dates.map((date) =>
    selectedEvents(plan, events, "prayer")
      .filter((event) => date && eventOccursOnDate(event, date))
      .map((event) => ({
        completed: eventCompletions[`${event.id}:${date}`] === true,
      })),
  );
  const fastingOccurrences = dates.map((date) =>
    selectedEvents(plan, events, "fasting")
      .filter((event) => date && eventOccursOnDate(event, date))
      .map((event) => ({
        completed: eventCompletions[`${event.id}:${date}`] === true,
      })),
  );
  const prayerRangePlanned = prayerOccurrences.reduce((sum, occurrences) => sum + occurrences.length, 0);
  const fastingRangePlanned = fastingOccurrences.reduce((sum, occurrences) => sum + occurrences.length, 0);
  const prayerValues: Array<number | null> = [];
  const fastingValues: Array<number | null> = [];
  const combinedValues: Array<number | null> = [];
  let prayerPlanned = 0;
  let prayerCompleted = 0;
  let fastingPlanned = 0;
  let fastingCompleted = 0;
  let combinedPlanned = 0;
  let combinedCompleted = 0;

  points.forEach((point, index) => {
    const date = dates[index];
    const isPastOrToday = Boolean(date && date <= today);
    const reading = scriptureTotals[index];
    if (isPastOrToday) {
      scripturePlanned += reading.planned;
      scriptureCompleted += reading.completed;
      prayerPlanned += prayerOccurrences[index].length;
      prayerCompleted += prayerOccurrences[index].filter((item) => item.completed).length;
      fastingPlanned += fastingOccurrences[index].length;
      fastingCompleted += fastingOccurrences[index].filter((item) => item.completed).length;
      combinedPlanned += reading.planned + prayerOccurrences[index].length + fastingOccurrences[index].length;
      combinedCompleted += reading.completed +
        prayerOccurrences[index].filter((item) => item.completed).length +
        fastingOccurrences[index].filter((item) => item.completed).length;
    }
    scripture.values.push(isPastOrToday ? progress(scriptureCompleted, scripturePlanned) : null);
    prayerValues.push(isPastOrToday ? progress(prayerCompleted, prayerPlanned) : null);
    fastingValues.push(isPastOrToday ? progress(fastingCompleted, fastingPlanned) : null);
    combinedValues.push(isPastOrToday ? progress(combinedCompleted, combinedPlanned) : null);
  });

  const series: RhythmChartSeries[] = scriptureRangePlanned > 0 ? [scripture] : [];
  if (prayerRangePlanned > 0) {
    series.push({ key: "prayer", ...SERIES_META.prayer, values: prayerValues });
  }
  if (fastingRangePlanned > 0) {
    series.push({ key: "fasting", ...SERIES_META.fasting, values: fastingValues });
  }
  if (series.length > 1) {
    series.push({ key: "combined", ...SERIES_META.combined, values: combinedValues });
  }
  return series;
}
