import { addDaysISO } from "./local-date";
import type { ScheduleBook, ScheduleAssignment } from "./reading-schedule";

export type GuidedClimbReadingRange = {
  book: string;
  from: number;
  to: number;
};

export type GuidedClimbDraftDay = {
  day: number;
  readings: GuidedClimbReadingRange[];
};

export const GUIDED_CLIMB_SET_ONE = {
  series: "Guided Climb",
  set: 1,
  slug: "find-your-footing",
  name: "Find Your Footing",
  durationDays: 27,
  selectedBooks: ["Genesis", "Matthew", "Psalms", "Proverbs"],
  days: [
    { day: 1, readings: [{ book: "Genesis", from: 1, to: 1 }] },
    { day: 2, readings: [{ book: "Genesis", from: 2, to: 2 }, { book: "Matthew", from: 1, to: 1 }] },
    { day: 3, readings: [{ book: "Genesis", from: 3, to: 3 }, { book: "Matthew", from: 2, to: 2 }] },
    { day: 4, readings: [{ book: "Genesis", from: 4, to: 5 }, { book: "Matthew", from: 3, to: 3 }] },
    { day: 5, readings: [{ book: "Genesis", from: 6, to: 7 }, { book: "Matthew", from: 4, to: 4 }] },
    { day: 6, readings: [{ book: "Genesis", from: 8, to: 9 }, { book: "Matthew", from: 5, to: 5 }, { book: "Psalms", from: 1, to: 1 }] },
    { day: 7, readings: [{ book: "Genesis", from: 10, to: 11 }, { book: "Matthew", from: 6, to: 6 }] },
    { day: 8, readings: [{ book: "Genesis", from: 12, to: 13 }, { book: "Matthew", from: 7, to: 7 }] },
    { day: 9, readings: [{ book: "Genesis", from: 14, to: 15 }, { book: "Matthew", from: 8, to: 8 }] },
    { day: 10, readings: [{ book: "Genesis", from: 16, to: 17 }, { book: "Matthew", from: 9, to: 9 }, { book: "Proverbs", from: 1, to: 1 }] },
    { day: 11, readings: [{ book: "Genesis", from: 18, to: 19 }, { book: "Matthew", from: 10, to: 10 }] },
    { day: 12, readings: [{ book: "Genesis", from: 20, to: 21 }, { book: "Matthew", from: 11, to: 11 }] },
    { day: 13, readings: [{ book: "Genesis", from: 22, to: 23 }, { book: "Matthew", from: 12, to: 12 }] },
    { day: 14, readings: [{ book: "Genesis", from: 24, to: 25 }, { book: "Matthew", from: 13, to: 13 }, { book: "Psalms", from: 23, to: 23 }] },
    { day: 15, readings: [{ book: "Genesis", from: 26, to: 27 }, { book: "Matthew", from: 14, to: 14 }] },
    { day: 16, readings: [{ book: "Genesis", from: 28, to: 29 }, { book: "Matthew", from: 15, to: 15 }] },
    { day: 17, readings: [{ book: "Genesis", from: 30, to: 31 }, { book: "Matthew", from: 16, to: 16 }] },
    { day: 18, readings: [{ book: "Genesis", from: 32, to: 33 }, { book: "Matthew", from: 17, to: 17 }, { book: "Proverbs", from: 3, to: 3 }] },
    { day: 19, readings: [{ book: "Genesis", from: 34, to: 35 }, { book: "Matthew", from: 18, to: 18 }] },
    { day: 20, readings: [{ book: "Genesis", from: 36, to: 37 }, { book: "Matthew", from: 19, to: 20 }] },
    { day: 21, readings: [{ book: "Genesis", from: 38, to: 39 }, { book: "Matthew", from: 21, to: 21 }] },
    { day: 22, readings: [{ book: "Genesis", from: 40, to: 41 }, { book: "Matthew", from: 22, to: 22 }, { book: "Psalms", from: 121, to: 121 }] },
    { day: 23, readings: [{ book: "Genesis", from: 42, to: 43 }, { book: "Matthew", from: 23, to: 23 }] },
    { day: 24, readings: [{ book: "Genesis", from: 44, to: 45 }, { book: "Matthew", from: 24, to: 24 }] },
    { day: 25, readings: [{ book: "Genesis", from: 46, to: 47 }, { book: "Matthew", from: 25, to: 25 }] },
    { day: 26, readings: [{ book: "Genesis", from: 48, to: 49 }, { book: "Matthew", from: 26, to: 26 }, { book: "Proverbs", from: 4, to: 4 }] },
    { day: 27, readings: [{ book: "Genesis", from: 50, to: 50 }, { book: "Matthew", from: 27, to: 28 }] },
  ] satisfies GuidedClimbDraftDay[],
} as const;

const EXPECTED_CHAPTERS = new Map<string, number[]>([
  ["Genesis", Array.from({ length: 50 }, (_, index) => index + 1)],
  ["Matthew", Array.from({ length: 28 }, (_, index) => index + 1)],
  ["Psalms", [1, 23, 121]],
  ["Proverbs", [1, 3, 4]],
]);

export function validateGuidedClimbSetOneDraft(bookCatalog: ScheduleBook[]) {
  const errors: string[] = [];
  const actualChapters = new Map<string, Set<number>>();
  const seenDays = new Set<number>();

  if (GUIDED_CLIMB_SET_ONE.days.length !== GUIDED_CLIMB_SET_ONE.durationDays) {
    errors.push("The draft does not contain exactly 27 days.");
  }

  for (const draftDay of GUIDED_CLIMB_SET_ONE.days) {
    if (
      !Number.isInteger(draftDay.day) ||
      draftDay.day < 1 ||
      draftDay.day > GUIDED_CLIMB_SET_ONE.durationDays ||
      seenDays.has(draftDay.day)
    ) {
      errors.push(`Invalid or duplicate draft day: ${draftDay.day}.`);
    }
    seenDays.add(draftDay.day);

    if (draftDay.readings.length === 0) {
      errors.push(`Day ${draftDay.day} has no readings.`);
    }

    for (const range of draftDay.readings) {
      const book = bookCatalog.find((candidate) => candidate.name === range.book);
      if (!book) {
        errors.push(`Day ${draftDay.day} uses unknown book ${range.book}.`);
        continue;
      }
      if (
        !Number.isInteger(range.from) ||
        !Number.isInteger(range.to) ||
        range.from < 1 ||
        range.to < range.from ||
        range.to > book.chapters
      ) {
        errors.push(
          `Day ${draftDay.day} has an invalid ${range.book} ${range.from}–${range.to} range.`,
        );
        continue;
      }

      const chapters = actualChapters.get(range.book) || new Set<number>();
      for (let chapter = range.from; chapter <= range.to; chapter += 1) {
        if (chapters.has(chapter)) {
          errors.push(`Duplicate reading: ${range.book} ${chapter}.`);
        }
        chapters.add(chapter);
      }
      actualChapters.set(range.book, chapters);
    }
  }

  for (let day = 1; day <= GUIDED_CLIMB_SET_ONE.durationDays; day += 1) {
    if (!seenDays.has(day)) errors.push(`Day ${day} is missing.`);
  }

  for (const [book, expected] of EXPECTED_CHAPTERS) {
    const actual = [...(actualChapters.get(book) || new Set<number>())].sort(
      (left, right) => left - right,
    );
    if (actual.length !== expected.length || actual.some((chapter, index) => chapter !== expected[index])) {
      errors.push(
        `${book} coverage does not exactly match the requested chapters.`,
      );
    }
  }

  for (const book of actualChapters.keys()) {
    if (!EXPECTED_CHAPTERS.has(book)) {
      errors.push(`Unexpected book in the draft: ${book}.`);
    }
  }

  return errors;
}

export function formatGuidedClimbReadingRange(range: GuidedClimbReadingRange) {
  return `${range.book} ${range.from}${range.to === range.from ? "" : `–${range.to}`}`;
}

export function formatGuidedClimbDay(draftDay: GuidedClimbDraftDay) {
  return draftDay.readings.map(formatGuidedClimbReadingRange).join(" · ");
}

export function getGuidedClimbDayChapterCount(draftDay: GuidedClimbDraftDay) {
  return draftDay.readings.reduce(
    (sum, range) => sum + range.to - range.from + 1,
    0,
  );
}

export function buildGuidedClimbSetOnePlan({
  id,
  startDate,
  bookCatalog,
  readingTime,
  readingWpm,
  dailyMinutes,
  estimateChapterMinutes,
}: {
  id: string;
  startDate: string;
  bookCatalog: ScheduleBook[];
  readingTime: string;
  readingWpm: number;
  dailyMinutes: number;
  estimateChapterMinutes: (book: string, chapter: number) => number;
}) {
  const validationErrors = validateGuidedClimbSetOneDraft(bookCatalog);
  if (validationErrors.length > 0) {
    throw new Error(
      `Guided Climb Set 1 draft is invalid: ${validationErrors.join(" ")}`,
    );
  }

  const assignments: ScheduleAssignment[] = GUIDED_CLIMB_SET_ONE.days.map(
    (draftDay) => {
      const readings = draftDay.readings.flatMap((range) =>
        Array.from(
          { length: range.to - range.from + 1 },
          (_, offset) => {
            const chapter = range.from + offset;
            return {
              book: range.book,
              chapter,
              key: `${range.book}-${chapter}`,
              label: `${range.book} ${chapter}`,
              estimatedMinutes: estimateChapterMinutes(range.book, chapter),
            };
          },
        ),
      );

      return {
        date: addDaysISO(startDate, draftDay.day - 1),
        readings,
        chapterCount: readings.length,
        estimatedMinutes: readings.reduce(
          (sum, reading) => sum + (reading.estimatedMinutes || 0),
          0,
        ),
        ...(readings.length >= 4 ? { guidedLoad: "heavier" as const } : {}),
      };
    },
  );

  return {
    id,
    name: GUIDED_CLIMB_SET_ONE.name,
    selectedBooks: [...GUIDED_CLIMB_SET_ONE.selectedBooks],
    startDate,
    endDate: addDaysISO(startDate, GUIDED_CLIMB_SET_ONE.durationDays - 1),
    color: "from-[#F4D77A] via-[#D4A017] to-[#8A6414]",
    readingMode: "consecutive",
    readingTime,
    paceMode: "chapters",
    readingPaceMode: "standard",
    dailyMinutes,
    readingWpm,
    durationDays: GUIDED_CLIMB_SET_ONE.durationDays,
    totalDays: GUIDED_CLIMB_SET_ONE.durationDays,
    guidedClimb: {
      series: GUIDED_CLIMB_SET_ONE.series,
      set: GUIDED_CLIMB_SET_ONE.set,
      slug: GUIDED_CLIMB_SET_ONE.slug,
    },
    assignments,
    completed: {},
  };
}

export function isGuidedClimbSetOnePlan(plan: any) {
  return (
    plan?.guidedClimb?.series === GUIDED_CLIMB_SET_ONE.series &&
    plan?.guidedClimb?.set === GUIDED_CLIMB_SET_ONE.set &&
    plan?.guidedClimb?.slug === GUIDED_CLIMB_SET_ONE.slug
  );
}

export function isGuidedClimbSetOneComplete(
  plan: any,
  completedMap: Record<string, boolean> = plan?.completed || {},
) {
  return (
    isGuidedClimbSetOnePlan(plan) &&
    Array.isArray(plan.assignments) &&
    plan.assignments.length === GUIDED_CLIMB_SET_ONE.durationDays &&
    plan.assignments.every(
      (day: any) =>
        Array.isArray(day.readings) &&
        day.readings.length > 0 &&
        day.readings.every((reading: any) => completedMap[reading.key] === true),
    )
  );
}
