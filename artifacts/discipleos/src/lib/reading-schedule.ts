import {
  addDaysISO,
  diffDaysInclusive,
} from "./local-date";

export type ScheduleBook = {
  name: string;
  chapters: number;
};

export type ScheduleChapter = {
  book: string;
  chapter: number;
  key: string;
  label?: string;
  estimatedMinutes?: number;
};

export type ScheduleAssignment = {
  date: string;
  readings: ScheduleChapter[];
  chapterCount: number;
  estimatedMinutes: number;
};

export const READING_JOURNEYS = [
  {
    key: "7-day-climb",
    type: "7-day-climb",
    name: "7-Day Climb",
    durationDays: 7,
    description: "A focused week in Genesis, shaped to your daily reading budget.",
    defaultBooks: ["Genesis"],
    color: "from-sky-400 via-cyan-400 to-teal-500",
  },
  {
    key: "40-day-climb",
    type: "40-day-climb",
    name: "40-Day Climb",
    durationDays: 40,
    description: "A 40-day route from 1 Samuel through Nehemiah.",
    defaultBooks: [
      "1 Samuel",
      "2 Samuel",
      "1 Kings",
      "2 Kings",
      "1 Chronicles",
      "2 Chronicles",
      "Ezra",
      "Nehemiah",
    ],
    color: "from-amber-400 via-orange-400 to-rose-500",
  },
] as const;

export type ReadingJourney = (typeof READING_JOURNEYS)[number];
export type ReadingJourneyKey = ReadingJourney["key"];

export function getReadingJourney(key: string | null | undefined) {
  return READING_JOURNEYS.find((journey) => journey.key === key) || null;
}

type BuildScheduleInput = {
  selectedBooks: string[];
  startDate: string;
  endDate?: string;
  paceMode?: "time" | "chapters";
  dailyMinutes?: number;
  targetChaptersPerDay?: number;
  readingMode?: "consecutive" | "random";
  bookCatalog: ScheduleBook[];
  estimateChapterMinutes: (book: string, chapter: number) => number;
};

export function getJourneyEndDate(startDate: string, durationDays: number) {
  return addDaysISO(startDate, Math.max(1, durationDays) - 1);
}

function seededShuffle<T>(items: T[], seedString: string) {
  const arr = [...items];
  let seed = Array.from(seedString).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) || 1;

  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let index = arr.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(next() * (index + 1));
    [arr[index], arr[swapIndex]] = [arr[swapIndex], arr[index]];
  }

  return arr;
}

export function expandScheduledChapters(
  selectedBooks: string[],
  bookCatalog: ScheduleBook[],
  estimateChapterMinutes: (book: string, chapter: number) => number,
): ScheduleChapter[] {
  return selectedBooks.flatMap((bookName) => {
    const book = bookCatalog.find((candidate) => candidate.name === bookName);
    if (!book) return [];

    return Array.from({ length: book.chapters }, (_, index) => {
      const chapter = index + 1;
      return {
        book: book.name,
        chapter,
        key: `${book.name}-${chapter}`,
        label: `${book.name} ${chapter}`,
        estimatedMinutes: estimateChapterMinutes(book.name, chapter),
      };
    });
  });
}

function chapterBasedSchedule(
  chapters: ScheduleChapter[],
  input: BuildScheduleInput,
): ScheduleAssignment[] {
  const days = diffDaysInclusive(input.startDate, input.endDate || input.startDate);
  const assignments = Array.from({ length: days }, (_, index) => ({
    date: addDaysISO(input.startDate, index),
    readings: [] as ScheduleChapter[],
    chapterCount: 0,
    estimatedMinutes: 0,
  }));
  const basePerDay = Math.floor(chapters.length / days);
  const remainder = chapters.length % days;
  let cursor = 0;

  assignments.forEach((assignment, index) => {
    const readings = chapters.slice(cursor, cursor + basePerDay + (index < remainder ? 1 : 0));
    cursor += readings.length;
    assignment.readings = readings;
    assignment.chapterCount = readings.length;
    assignment.estimatedMinutes = readings.reduce(
      (sum, reading) => sum + (reading.estimatedMinutes || 0),
      0,
    );
  });

  return assignments;
}

function timeBasedSchedule(
  chapters: ScheduleChapter[],
  input: BuildScheduleInput,
): ScheduleAssignment[] {
  const dailyMinutes = Math.max(1, Number(input.dailyMinutes) || 1);
  const assignments: ScheduleAssignment[] = [];
  let readings: ScheduleChapter[] = [];
  let minutes = 0;

  for (const chapter of chapters) {
    const chapterMinutes = chapter.estimatedMinutes || 0;
    if (readings.length > 0 && minutes + chapterMinutes > dailyMinutes) {
      assignments.push({
        date: addDaysISO(input.startDate, assignments.length),
        readings,
        chapterCount: readings.length,
        estimatedMinutes: minutes,
      });
      readings = [];
      minutes = 0;
    }

    readings.push(chapter);
    minutes += chapterMinutes;
  }

  if (readings.length > 0) {
    assignments.push({
      date: addDaysISO(input.startDate, assignments.length),
      readings,
      chapterCount: readings.length,
      estimatedMinutes: minutes,
    });
  }

  return assignments;
}

export function buildReadingSchedule(input: BuildScheduleInput): ScheduleAssignment[] {
  const rawChapters = expandScheduledChapters(
    input.selectedBooks,
    input.bookCatalog,
    input.estimateChapterMinutes,
  );
  const chapters =
    input.readingMode === "random"
      ? seededShuffle(
          rawChapters,
          `${input.selectedBooks.join("|")}-${input.startDate}-${input.paceMode === "time" ? "time" : input.endDate}`,
        )
      : rawChapters;

  return input.paceMode === "time"
    ? timeBasedSchedule(chapters, input)
    : chapterBasedSchedule(chapters, input);
}

export function buildReadingJourneySchedule({
  journeyKey,
  selectedBooks,
  startDate,
  bookCatalog,
  estimateChapterMinutes,
}: {
  journeyKey: string;
  selectedBooks: string[];
  startDate: string;
  bookCatalog: ScheduleBook[];
  estimateChapterMinutes: (book: string, chapter: number) => number;
}) {
  const journey = getReadingJourney(journeyKey);
  if (!journey) throw new Error(`Unknown reading journey: ${journeyKey}`);

  return buildReadingSchedule({
    selectedBooks,
    startDate,
    endDate: getJourneyEndDate(startDate, journey.durationDays),
    paceMode: "chapters",
    readingMode: "consecutive",
    bookCatalog,
    estimateChapterMinutes,
  });
}

function partitionJourneyChapters(
  chapters: ScheduleChapter[],
  startDate: string,
  dayCount: number,
  dailyMinutes: number,
): ScheduleAssignment[] {
  const targetMinutes = chapters.reduce(
    (sum, chapter) => sum + (chapter.estimatedMinutes || 0),
    0,
  ) / dayCount;
  const prefix = [0];
  for (const chapter of chapters) {
    prefix.push(prefix[prefix.length - 1] + (chapter.estimatedMinutes || 0));
  }

  const costs = Array.from({ length: dayCount + 1 }, () =>
    Array<number>(chapters.length + 1).fill(Number.POSITIVE_INFINITY),
  );
  const previousCuts = Array.from({ length: dayCount + 1 }, () =>
    Array<number>(chapters.length + 1).fill(-1),
  );
  costs[0][0] = 0;

  for (let day = 1; day <= dayCount; day += 1) {
    for (let end = day; end <= chapters.length; end += 1) {
      for (let start = day - 1; start < end; start += 1) {
        if (!Number.isFinite(costs[day - 1][start])) continue;
        const minutes = prefix[end] - prefix[start];
        const chapterCount = end - start;
        if (chapterCount > 1 && minutes > dailyMinutes) continue;
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

  if (!Number.isFinite(costs[dayCount][chapters.length])) {
    return [];
  }

  const ranges: Array<[number, number]> = [];
  let end = chapters.length;
  for (let day = dayCount; day > 0; day -= 1) {
    const start = previousCuts[day][end];
    if (start < 0) return [];
    ranges.unshift([start, end]);
    end = start;
  }

  return ranges.map(([start, rangeEnd], index) => {
    const readings = chapters.slice(start, rangeEnd);
    return {
      date: addDaysISO(startDate, index),
      readings,
      chapterCount: readings.length,
      estimatedMinutes: readings.reduce(
        (sum, reading) => sum + (reading.estimatedMinutes || 0),
        0,
      ),
    };
  });
}

/**
 * Builds a fixed-duration journey around a reader's daily time budget.
 * The route stays the same number of days, but only includes the consecutive
 * chapters that can fit across those days. Chapters remain intact.
 */
export function buildBudgetedReadingJourneySchedule({
  journeyKey,
  selectedBooks,
  startDate,
  dailyMinutes,
  bookCatalog,
  estimateChapterMinutes,
}: {
  journeyKey: string;
  selectedBooks: string[];
  startDate: string;
  dailyMinutes: number;
  bookCatalog: ScheduleBook[];
  estimateChapterMinutes: (book: string, chapter: number) => number;
}) {
  const journey = getReadingJourney(journeyKey);
  if (!journey) throw new Error(`Unknown reading journey: ${journeyKey}`);

  const dayCount = journey.durationDays;
  const budget = Math.max(1, Number(dailyMinutes) || 1);
  const chapters = expandScheduledChapters(
    selectedBooks,
    bookCatalog,
    estimateChapterMinutes,
  );
  const selectedChapters: ScheduleChapter[] = [];
  const totalBudget = budget * dayCount;
  let selectedMinutes = 0;

  for (const chapter of chapters) {
    const chapterMinutes = chapter.estimatedMinutes || 0;
    if (
      selectedChapters.length >= dayCount &&
      selectedMinutes + chapterMinutes > totalBudget
    ) {
      break;
    }
    selectedChapters.push(chapter);
    selectedMinutes += chapterMinutes;
  }

  let assignments = partitionJourneyChapters(
    selectedChapters,
    startDate,
    dayCount,
    budget,
  );
  while (assignments.length === 0 && selectedChapters.length > dayCount) {
    selectedChapters.pop();
    assignments = partitionJourneyChapters(
      selectedChapters,
      startDate,
      dayCount,
      budget,
    );
  }
  if (assignments.length === dayCount) return assignments;

  return chapterBasedSchedule(selectedChapters, {
    selectedBooks,
    startDate,
    endDate: getJourneyEndDate(startDate, dayCount),
    paceMode: "chapters",
    bookCatalog,
    estimateChapterMinutes,
  });
}

export function normalizeReadingJourneyPlan(
  plan: any,
  bookCatalog: ScheduleBook[],
  estimateChapterMinutes: (book: string, chapter: number) => number,
) {
  const journey = getReadingJourney(plan?.journeyKey);
  if (!journey) return plan;

  const expectedAssignments = buildReadingJourneySchedule({
    journeyKey: journey.key,
    selectedBooks: [...journey.defaultBooks],
    startDate: String(plan.startDate || ""),
    bookCatalog,
    estimateChapterMinutes,
  });
  const existingAssignments = Array.isArray(plan.assignments) ? plan.assignments : [];
  const expectedReadings = expectedAssignments.flatMap((assignment) => assignment.readings);
  const existingReadings = existingAssignments.flatMap((assignment: any) =>
    Array.isArray(assignment?.readings) ? assignment.readings : [],
  );
  const expectedKeys = new Set(expectedReadings.map((reading) => reading.key));
  const expectedDates = new Set(expectedAssignments.map((assignment) => assignment.date));
  const scheduleMatches =
    existingAssignments.length === expectedAssignments.length &&
    existingReadings.length === expectedReadings.length &&
    existingReadings.every((reading: any) => expectedKeys.has(reading.key));
  const scheduleIsOversized =
    existingAssignments.length > expectedAssignments.length ||
    existingReadings.length > expectedReadings.length;

  if (scheduleMatches || !scheduleIsOversized) return plan;

  const existingCompleted =
    plan.completed && typeof plan.completed === "object" && !Array.isArray(plan.completed)
      ? plan.completed
      : Object.fromEntries(
          Array.isArray(plan.completedChapterKeys)
            ? plan.completedChapterKeys.map((key: string) => [key, true])
            : [],
        );
  const completed = Object.fromEntries(
    Object.entries(existingCompleted).filter(
      ([key, value]) => expectedKeys.has(key) && Boolean(value),
    ),
  );

  return {
    ...plan,
    selectedBooks: [...journey.defaultBooks],
    endDate: expectedAssignments.at(-1)?.date || plan.endDate,
    readingMode: "consecutive",
    paceMode: "chapters",
    journeyDays: journey.durationDays,
    durationDays: journey.durationDays,
    totalDays: journey.durationDays,
    assignments: expectedAssignments,
    completed,
    ...(Array.isArray(plan.earnedDayKeys)
      ? { earnedDayKeys: plan.earnedDayKeys.filter((date: string) => expectedDates.has(date)) }
      : {}),
  };
}

export function isOversizedReadingJourneyPlan(
  plan: any,
  bookCatalog: ScheduleBook[],
  estimateChapterMinutes: (book: string, chapter: number) => number,
) {
  const journey = getReadingJourney(plan?.journeyKey);
  if (!journey) return false;

  const expectedAssignments = buildReadingJourneySchedule({
    journeyKey: journey.key,
    selectedBooks: [...journey.defaultBooks],
    startDate: String(plan.startDate || ""),
    bookCatalog,
    estimateChapterMinutes,
  });
  const existingAssignments = Array.isArray(plan.assignments) ? plan.assignments : [];
  const expectedReadings = expectedAssignments.flatMap((assignment) => assignment.readings);
  const existingReadings = existingAssignments.flatMap((assignment: any) =>
    Array.isArray(assignment?.readings) ? assignment.readings : [],
  );
  const expectedKeys = new Set(expectedReadings.map((reading) => reading.key));
  const scheduleMatches =
    existingAssignments.length === expectedAssignments.length &&
    existingReadings.length === expectedReadings.length &&
    existingReadings.every((reading: any) => expectedKeys.has(reading.key));

  return (
    !scheduleMatches &&
    (
      existingAssignments.length > expectedAssignments.length ||
      existingReadings.length > expectedReadings.length
    )
  );
}

export function summarizeReadingSchedule(input: BuildScheduleInput) {
  const assignments = buildReadingSchedule(input);
  const totalChapters = assignments.reduce((sum, day) => sum + day.chapterCount, 0);
  const totalMinutes = assignments.reduce((sum, day) => sum + day.estimatedMinutes, 0);
  const totalDays = Math.max(1, assignments.length);
  const minutesPerDay = totalMinutes / totalDays;
  const chapterCounts = assignments.map((day) => day.chapterCount);

  return {
    assignments,
    totalChapters,
    totalDays,
    totalMinutes,
    minsPerDay: Math.round(minutesPerDay),
    chaptersPerDayExact: totalChapters / totalDays,
    minPerDay: chapterCounts.length ? Math.min(...chapterCounts) : 0,
    maxPerDay: chapterCounts.length ? Math.max(...chapterCounts) : 0,
    actualEndDate: assignments.at(-1)?.date || input.startDate,
    finishable: totalChapters > 0 && assignments.length > 0,
  };
}