import { describe, expect, it } from "vitest";
import { estimateChapterMinutes, VERSE_COUNTS } from "../../discipleos/src/bible-data";
import {
  buildBudgetedReadingJourneySchedule,
  buildReadingJourneySchedule,
  buildReadingSchedule,
  getJourneyEndDate,
  getReadingJourney,
  READING_JOURNEYS,
  summarizeReadingSchedule,
} from "../../discipleos/src/lib/reading-schedule";
import {
  addDaysISO,
  dateISOInTimeZone,
  diffDaysInclusive,
  formatLocalDate,
  todayISO,
} from "../../discipleos/src/lib/local-date";

const catalog = [
  { name: "Psalms", chapters: 150 },
  { name: "Proverbs", chapters: 31 },
];

const input = {
  selectedBooks: ["Psalms", "Proverbs"],
  startDate: "2026-08-27",
  endDate: "2026-08-27",
  paceMode: "time" as const,
  dailyMinutes: 20,
  readingMode: "consecutive" as const,
  bookCatalog: catalog,
  estimateChapterMinutes,
};

describe("structured journey routes", () => {
  it("starts the short route in Genesis and the long route in 1 Samuel", () => {
    expect(getReadingJourney("7-day-climb")?.defaultBooks).toEqual(["Genesis"]);

    const longJourney = getReadingJourney("40-day-climb");
    expect(longJourney?.defaultBooks[0]).toBe("1 Samuel");
    expect(longJourney?.defaultBooks.at(-1)).toBe("Nehemiah");

    const assignments = buildBudgetedReadingJourneySchedule({
      journeyKey: "40-day-climb",
      selectedBooks: [...(longJourney?.defaultBooks || [])],
      startDate: "2026-08-27",
      dailyMinutes: 20,
      bookCatalog: Object.entries(VERSE_COUNTS).map(([name, counts]) => ({
        name,
        chapters: counts.length,
      })),
      estimateChapterMinutes,
    });
    const readings = assignments.flatMap((assignment) => assignment.readings);

    expect(assignments).toHaveLength(40);
    expect(readings[0]).toMatchObject({ book: "1 Samuel", chapter: 1 });
    expect(new Set(readings.map((reading) => reading.key)).size).toBe(readings.length);
  });
});

describe("shared custom-plan scheduling", () => {
  it("uses the same chapter stream, minutes, and finish date for preview and saved plans", () => {
    const preview = summarizeReadingSchedule(input);
    const saved = buildReadingSchedule(input);

    expect(preview.assignments).toEqual(saved);
    expect(preview.totalChapters).toBe(181);
    expect(preview.totalMinutes).toBe(
      saved.reduce((sum, day) => sum + day.estimatedMinutes, 0),
    );
    expect(preview.actualEndDate).toBe(saved.at(-1)?.date);
    expect(preview.totalDays).toBe(saved.length);
  });

  it("never schedules chapters beyond the catalog, including Psalms", () => {
    const schedule = buildReadingSchedule(input);
    const readings = schedule.flatMap((day) => day.readings);

    expect(readings).toHaveLength(181);
    expect(readings.filter((reading) => reading.book === "Psalms")).toHaveLength(150);
    expect(Math.max(...readings.filter((reading) => reading.book === "Psalms").map((reading) => reading.chapter))).toBe(150);
  });

  it("fits fewer chapters into the same time budget for a slower reader", () => {
    const slowSchedule = buildReadingSchedule({
      ...input,
      selectedBooks: ["Psalms"],
      dailyMinutes: 30,
      estimateChapterMinutes: () => 12,
    });
    const fastSchedule = buildReadingSchedule({
      ...input,
      selectedBooks: ["Psalms"],
      dailyMinutes: 30,
      estimateChapterMinutes: () => 6,
    });

    expect(slowSchedule[0].chapterCount).toBe(2);
    expect(fastSchedule[0].chapterCount).toBe(5);
    expect(slowSchedule[0].estimatedMinutes).toBeLessThanOrEqual(30 * 1.25);
    expect(fastSchedule[0].estimatedMinutes).toBeLessThanOrEqual(30 * 1.25);
  });
});

describe("local calendar date handling", () => {
  it("keeps an Eastern user's date on August 29 before the UTC rollover", () => {
    const lateEastern = new Date("2026-08-30T02:31:00.000Z");

    expect(dateISOInTimeZone(lateEastern, "America/New_York")).toBe("2026-08-29");
    expect(todayISO(lateEastern, "America/New_York")).toBe("2026-08-29");
  });

  it("uses the same date arithmetic for fields, summaries, and day labels", () => {
    const start = "2026-08-29";
    const end = addDaysISO(start, 45);

    expect(end).toBe("2026-10-13");
    expect(diffDaysInclusive(start, end)).toBe(46);
    expect(formatLocalDate(end, "en-US")).toBe("Oct 13, 2026");
  });
});

describe("named reading journeys", () => {
  it("exposes stable keys and fixed durations for both climbs", () => {
    expect(READING_JOURNEYS.map((journey) => journey.key)).toEqual([
      "7-day-climb",
      "40-day-climb",
    ]);
    expect(getReadingJourney("7-day-climb")?.durationDays).toBe(7);
    expect(getReadingJourney("40-day-climb")?.durationDays).toBe(40);
    expect(getJourneyEndDate("2026-08-27", 7)).toBe("2026-09-02");
    expect(getJourneyEndDate("2026-08-27", 40)).toBe("2026-10-05");
  });

  it("creates exactly the selected journey duration with no chapters dropped", () => {
    const sevenDay = buildReadingJourneySchedule({
      journeyKey: "7-day-climb",
      selectedBooks: ["Psalms"],
      startDate: "2026-08-27",
      bookCatalog: catalog,
      estimateChapterMinutes,
    });
    const fortyDay = buildReadingJourneySchedule({
      journeyKey: "40-day-climb",
      selectedBooks: ["Psalms"],
      startDate: "2026-08-27",
      bookCatalog: catalog,
      estimateChapterMinutes,
    });

    expect(sevenDay).toHaveLength(7);
    expect(sevenDay.at(-1)?.date).toBe("2026-09-02");
    expect(sevenDay.flatMap((day) => day.readings)).toHaveLength(150);
    expect(fortyDay).toHaveLength(40);
    expect(fortyDay.at(-1)?.date).toBe("2026-10-05");
    expect(fortyDay.flatMap((day) => day.readings)).toHaveLength(150);
  });

  it("keeps a seven-day climb within the reader's daily budget", () => {
    const schedule = buildBudgetedReadingJourneySchedule({
      journeyKey: "7-day-climb",
      selectedBooks: ["Psalms"],
      startDate: "2026-08-27",
      dailyMinutes: 24,
      bookCatalog: catalog,
      estimateChapterMinutes,
    });

    expect(schedule).toHaveLength(7);
    expect(schedule.at(-1)?.date).toBe("2026-09-02");
    expect(schedule.flatMap((day) => day.readings).length).toBeLessThan(150);
    expect(schedule.every((day) => day.estimatedMinutes <= 24)).toBe(true);
  });
});