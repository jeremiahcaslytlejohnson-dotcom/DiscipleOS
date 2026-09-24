import { describe, expect, it } from "vitest";
import {
  applyReadingDefaultsToPlanForm,
  normalizeReadingDefaults,
} from "../../discipleos/src/lib/reading-settings";

describe("reading defaults", () => {
  it("normalizes invalid values without allowing unsafe budgets", () => {
    expect(normalizeReadingDefaults({
      paceMode: "unknown",
      customMinutesPerChapter: 999,
      dailyReadingBudget: 0,
      preferredReadingTime: "not-a-time",
      readingOrder: "sideways",
    })).toEqual({
      paceMode: "standard",
      customMinutesPerChapter: 60,
      dailyReadingBudget: 5,
      preferredReadingTime: "07:00",
      readingOrder: "consecutive",
    });
  });

  it("maps defaults into a new ordinary plan draft", () => {
    expect(applyReadingDefaultsToPlanForm({
      paceMode: "custom",
      customMinutesPerChapter: 5,
      dailyReadingBudget: 20,
      preferredReadingTime: "06:30",
      readingOrder: "randomized",
    })).toEqual({
      paceMode: "chapters",
      readingPaceMode: "custom",
      readingCustomMinutesPerChapter: 5,
      dailyMinutes: 20,
      targetChaptersPerDay: 4,
      readingWpm: 135,
      readingTime: "06:30",
      readingMode: "random",
    });
  });

  it("keeps the daily budget independent from the selected reading speed", () => {
    expect(applyReadingDefaultsToPlanForm({
      paceMode: "relaxed",
      customMinutesPerChapter: 5,
      dailyReadingBudget: 30,
      preferredReadingTime: "07:00",
      readingOrder: "consecutive",
    })).toMatchObject({
      paceMode: "time",
      dailyMinutes: 30,
      readingWpm: 140,
    });

    expect(applyReadingDefaultsToPlanForm({
      paceMode: "fast",
      customMinutesPerChapter: 5,
      dailyReadingBudget: 30,
      preferredReadingTime: "07:00",
      readingOrder: "consecutive",
    })).toMatchObject({
      paceMode: "time",
      dailyMinutes: 30,
      readingWpm: 275,
    });
  });
});