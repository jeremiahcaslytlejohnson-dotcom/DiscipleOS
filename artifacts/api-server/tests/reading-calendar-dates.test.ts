import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  dateISOInTimeZone,
  diffDaysInclusive,
  todayISO,
} from "../../discipleos/src/lib/local-date";
import { mergeLocalCompletionHistory } from "../../discipleos/src/lib/mountain-rhythm";

describe("reading calendar date integrity", () => {
  it("keeps local calendar dates stable across the spring DST transition", () => {
    const beforeMidnightInLosAngeles = new Date("2026-03-08T07:30:00.000Z");
    const afterMidnightInLosAngeles = new Date("2026-03-08T08:30:00.000Z");

    expect(dateISOInTimeZone(beforeMidnightInLosAngeles, "America/Los_Angeles"))
      .toBe("2026-03-07");
    expect(dateISOInTimeZone(afterMidnightInLosAngeles, "America/Los_Angeles"))
      .toBe("2026-03-08");
    expect(addDaysISO("2026-03-07", 1)).toBe("2026-03-08");
    expect(diffDaysInclusive("2026-03-07", "2026-03-09")).toBe(3);
  });

  it("uses the current local date after travel without shifting date-only plan dates", () => {
    const sameInstant = new Date("2026-03-08T07:30:00.000Z");

    expect(todayISO(sameInstant, "America/Los_Angeles")).toBe("2026-03-07");
    expect(todayISO(sameInstant, "America/New_York")).toBe("2026-03-08");
    expect(addDaysISO("2026-03-07", 0)).toBe("2026-03-07");
  });

  it("keeps the server's first completion date while filling missing local history", () => {
    const merged = mergeLocalCompletionHistory(
      {
        id: "plan",
        earnedDayKeys: ["2026-09-01"],
        dayCompletionDates: { "2026-09-01": "2026-09-03" },
      },
      {
        id: "plan",
        earnedDayKeys: ["2026-09-01", "2026-09-02"],
        dayCompletionDates: {
          "2026-09-01": "2026-09-09",
          "2026-09-02": "2026-09-04",
        },
      },
    );

    expect(merged.earnedDayKeys).toEqual(["2026-09-01", "2026-09-02"]);
    expect(merged.dayCompletionDates).toEqual({
      "2026-09-01": "2026-09-03",
      "2026-09-02": "2026-09-04",
    });
  });
});
