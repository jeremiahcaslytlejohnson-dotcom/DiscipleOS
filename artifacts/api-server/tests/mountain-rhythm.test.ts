import { describe, expect, it } from "vitest";
import {
  calculateMountainRhythm,
  getLocalDate,
} from "../src/services/mountainRhythm";
import {
  calculateMountainRhythm as calculateLocalMountainRhythm,
  findActiveStructuredClimb,
  isStructuredClimbComplete,
  MOUNTAIN_RHYTHM_ROUTES,
} from "../../discipleos/src/lib/mountain-rhythm";

function addDays(dateISO: string, amount: number) {
  const date = new Date(`${dateISO}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function journey(
  id: string,
  days: number,
  options: {
    start?: string;
    name?: string;
    templateKey?: string;
    completedDays?: number[];
    partialDays?: number[];
  } = {},
) {
  const start = options.start || "2026-08-21";
  const assignments = Array.from({ length: days }, (_, index) => ({
    date: addDays(start, index),
    readings: [
      { key: `${id}-${index}-a` },
      { key: `${id}-${index}-b` },
    ],
  }));
  const completed: Record<string, boolean> = {};
  for (const index of options.completedDays || []) {
    completed[`${id}-${index}-a`] = true;
    completed[`${id}-${index}-b`] = true;
  }
  for (const index of options.partialDays || []) {
    completed[`${id}-${index}-a`] = true;
  }
  return {
    id,
    name: options.name || id,
    templateKey: options.templateKey,
    journeyKey:
      days === 7
        ? "7-day-climb"
        : days === 20
          ? "20-day-reset"
          : days === 40
            ? "40-day-climb"
            : undefined,
    journeyType:
      days === 7
        ? "7-day-climb"
        : days === 20
          ? "20-day-reset"
          : days === 40
            ? "40-day-climb"
            : undefined,
    journeyDays: days,
    assignments,
    completed,
  };
}

function event(
  id: string,
  type: string,
  date = "2026-08-27",
  extra: Record<string, unknown> = {},
) {
  return { id, title: id, type, date, repeat: "none", ...extra };
}

const ROUTES = [
  ["7-day-climb", 7, 14.3],
  ["20-day-reset", 20, 5],
  ["40-day-climb", 40, 2.5],
] as const;

function calculatePair(input: {
  today: string;
  plans: any[];
  events?: any[];
  completions?: Record<string, boolean>;
  selectedPlanId?: string;
}) {
  return {
    server: calculateMountainRhythm({
      today: input.today,
      plans: input.plans,
      events: input.events || [],
      completions: input.completions || {},
      selectedPlanId: input.selectedPlanId,
    }),
    local: calculateLocalMountainRhythm({
      today: input.today,
      plans: input.plans,
      events: input.events || [],
      eventCompletions: input.completions || {},
      selectedPlanId: input.selectedPlanId,
    }),
  };
}

function expectPairParity(pair: ReturnType<typeof calculatePair>) {
  expect(pair.local.trail).toEqual(pair.server.trail);
  expect(pair.local).toMatchObject({
    completedDays: pair.server.completedDays,
    journeyProgress: pair.server.journeyProgress,
    earnedProgress: pair.server.earnedProgress,
    currentElevationPercent: pair.server.currentElevationPercent,
  });
}

describe("Mountain Rhythm journey calculation", () => {
  it("keeps the released route order and exact labels", () => {
    expect(MOUNTAIN_RHYTHM_ROUTES.map((route) => route.kind)).toEqual([
      "7-day-climb",
      "20-day-reset",
      "40-day-climb",
    ]);
    expect(MOUNTAIN_RHYTHM_ROUTES.map((route) => route.label)).toEqual([
      "7-Day Climb",
      "20-Day Reset",
      "40-Day Climb",
    ]);
    expect(MOUNTAIN_RHYTHM_ROUTES[2].comingLater).toBe(true);
    expect(MOUNTAIN_RHYTHM_ROUTES[1].locked).toBe(true);
  });

  it("uses the user's Eastern calendar date on both sides of the UTC rollover", () => {
    expect(
      getLocalDate("America/New_York", new Date("2026-08-30T02:31:00.000Z")),
    ).toBe("2026-08-29");
    expect(
      getLocalDate("America/New_York", new Date("2026-08-30T04:31:00.000Z")),
    ).toBe("2026-08-30");
  });

  it("shows no elevation and ignores activities until a structured climb is selected", () => {
    const result = calculateMountainRhythm({
      today: "2026-08-27",
      plans: [],
      events: [event("prayer", "prayer")],
      completions: { "prayer:2026-08-27": true },
    });

    expect(result).toMatchObject({
      level: "Basecamp",
      journeyLabel: null,
      journeyDays: 0,
      completedDays: 0,
      currentElevationPercent: 0,
      message: "Choose the 7-Day Climb to begin.",
    });
    expect(result.trail).toEqual([]);
    expect(result.categories.prayer).toEqual({ planned: 0, completed: 0 });
  });

  it("keeps multiple ordinary plans intact while selecting only one structured climb", () => {
    const ordinaryA = journey("ordinary-a", 12, { completedDays: [0, 1] });
    const ordinaryB = journey("ordinary-b", 30, { completedDays: [0, 1, 2] });
    const climb = journey("climb", 7, { name: "7-Day Climb", completedDays: [0] });

    const active = findActiveStructuredClimb([ordinaryA, ordinaryB, climb]);

    expect(active?.id).toBe(climb.id);
    expect(isStructuredClimbComplete(climb)).toBe(false);
    expect([ordinaryA, ordinaryB].map((plan) => plan.id)).toEqual([
      "ordinary-a",
      "ordinary-b",
    ]);
    expect(
      calculateLocalMountainRhythm({
        today: "2026-08-21",
        plans: [ordinaryA, ordinaryB, climb],
        selectedPlanId: climb.id,
      }),
    ).toMatchObject({
      journeyLabel: "7-Day Climb",
      completedDays: 1,
      journeyProgress: 14.3,
    });
  });

  it("requires every reading before a planned day becomes permanently complete", () => {
    const plan = journey("seven", 7, {
      completedDays: [0],
      partialDays: [1],
    });
    const result = calculateMountainRhythm({
      today: "2026-08-22",
      plans: [plan],
      events: [],
      selectedPlanId: "seven",
    });

    expect(result).toMatchObject({
      journeyDays: 7,
      completedDays: 1,
      journeyProgress: 14.3,
      todayPlanned: 1,
      todayCompleted: 0.5,
      todayPercentage: 50,
    });
    expect(result.trail.slice(0, 3).map((point) => point.status)).toEqual([
      "complete",
      "partial",
      "future",
    ]);
  });

  it.each(ROUTES)(
    "keeps %s ascent proportional from zero to one completed day",
    (journeyType, days, oneDayProgress) => {
      const plan = journey(journeyType, days, { completedDays: [0] });
      const empty = calculateMountainRhythm({
        today: "2026-08-21",
        plans: [journey(journeyType, days)],
        events: [],
        selectedPlanId: journeyType,
      });
      const oneDay = calculateMountainRhythm({
        today: "2026-08-21",
        plans: [plan],
        events: [],
        selectedPlanId: journeyType,
      });
      const localOneDay = calculateLocalMountainRhythm({
        today: "2026-08-21",
        plans: [plan],
        events: [],
        eventCompletions: {},
        selectedPlanId: journeyType,
      });

      expect(empty).toMatchObject({
        completedDays: 0,
        journeyProgress: 0,
        earnedProgress: 0,
        currentElevationPercent: 0,
      });
      expect(oneDay).toMatchObject({
        completedDays: 1,
        journeyProgress: oneDayProgress,
        earnedProgress: oneDayProgress,
        currentElevationPercent: oneDayProgress,
        percentage: oneDayProgress,
      });
      expect(localOneDay).toMatchObject({
        completedDays: oneDay.completedDays,
        journeyProgress: oneDay.journeyProgress,
        earnedProgress: oneDay.earnedProgress,
        currentElevationPercent: oneDay.currentElevationPercent,
        todayPercentage: oneDay.todayPercentage,
        rhythmProgress: oneDay.rhythmProgress,
      });
      expect(localOneDay.trail).toEqual(oneDay.trail);
    },
  );

  it.each(ROUTES)(
    "keeps a partial %s day out of permanent ascent",
    (journeyType, days) => {
      const result = calculateMountainRhythm({
        today: "2026-08-21",
        plans: [journey(journeyType, days, { partialDays: [0] })],
        events: [],
        selectedPlanId: journeyType,
      });

      expect(result).toMatchObject({
        completedDays: 0,
        journeyProgress: 0,
        earnedProgress: 0,
        currentElevationPercent: 0,
        todayPercentage: 50,
      });
      expect(result.trail[0]).toMatchObject({
        status: "partial",
        completion: 50,
        elevationPercent: 0,
        earnedPercent: 0,
      });
    },
  );

  it.each(ROUTES)(
    "keeps a missed %s day out of ascent and preserves progress when resumed",
    (journeyType, days, oneDayProgress) => {
      const result = calculateMountainRhythm({
        today: addDays("2026-08-21", 2),
        plans: [
          journey(journeyType, days, {
            completedDays: [0, 2],
          }),
        ],
        events: [],
        selectedPlanId: journeyType,
      });

      const twoDayProgress = days === 7 ? 28.6 : days === 20 ? 10 : 5;
      expect(result).toMatchObject({
        completedDays: 2,
        journeyProgress: twoDayProgress,
        earnedProgress: twoDayProgress,
        currentElevationPercent: twoDayProgress,
      });
      expect(result.trail[0]).toMatchObject({
        status: "complete",
        elevationPercent: oneDayProgress,
        earnedPercent: oneDayProgress,
      });
      expect(result.trail[1]).toMatchObject({
        status: "missed",
        elevationPercent: oneDayProgress,
        earnedPercent: oneDayProgress,
        rhythmPercent: oneDayProgress,
      });
      expect(result.trail[2].status).toBe("complete");
      expect(result.trail[2].elevationPercent).toBe(result.journeyProgress);
      expect(result.trail[2].rhythmPercent).toBeGreaterThan(
        result.trail[1].rhythmPercent,
      );
    },
  );

  it.each(ROUTES)(
    "reaches 100%% on the final completed day of the %s",
    (journeyType, days) => {
      const result = calculateMountainRhythm({
        today: addDays("2026-08-21", days - 1),
        plans: [
          journey(journeyType, days, {
            completedDays: Array.from({ length: days }, (_, index) => index),
          }),
        ],
        events: [],
        selectedPlanId: journeyType,
      });

      expect(result).toMatchObject({
        completedDays: days,
        journeyProgress: 100,
        earnedProgress: 100,
        currentElevationPercent: 100,
        percentage: 100,
        journeyComplete: true,
        level: "Summit Rhythm",
      });
      expect(result.trail.at(-1)).toMatchObject({
        status: "complete",
        elevationPercent: 100,
        earnedPercent: 100,
      });
    },
  );

  it("lets each named journey reach its own summit while longer journeys earn more ascent", () => {
    const seven = calculateMountainRhythm({
      today: "2026-08-27",
      plans: [
        journey("seven", 7, {
          name: "7-Day Climb",
          completedDays: Array.from({ length: 7 }, (_, index) => index),
        }),
      ],
      events: [],
      selectedPlanId: "seven",
    });
    const twenty = calculateMountainRhythm({
      today: "2026-09-09",
      plans: [
        journey("twenty", 20, {
          name: "20-Day Consistency Reset",
          completedDays: Array.from({ length: 20 }, (_, index) => index),
        }),
      ],
      events: [],
      selectedPlanId: "twenty",
    });
    const forty = calculateMountainRhythm({
      today: "2026-09-29",
      plans: [
        journey("forty", 40, {
          name: "40-Day Climb",
          completedDays: Array.from({ length: 40 }, (_, index) => index),
        }),
      ],
      events: [],
      selectedPlanId: "forty",
    });

    for (const result of [seven, twenty, forty]) {
      expect(result).toMatchObject({
        journeyProgress: 100,
        currentElevationPercent: 100,
        level: "Summit Rhythm",
        journeyComplete: true,
      });
    }
    expect(seven.journeyDays).toBe(7);
    expect(twenty.journeyDays).toBe(20);
    expect(forty.journeyDays).toBe(40);
    expect(twenty.totalAscent).toBeGreaterThan(seven.totalAscent);
    expect(forty.totalAscent).toBeGreaterThan(twenty.totalAscent);
    expect(twenty.mountainScale).toBeGreaterThan(seven.mountainScale);
    expect(forty.mountainScale).toBeGreaterThan(twenty.mountainScale);
  });

  it("does not promote an ordinary plan into a mountain climb", () => {
    const result = calculateMountainRhythm({
      today: "2026-08-26",
      plans: [journey("custom-study", 12, { completedDays: [0, 1, 2, 3, 4, 5] })],
      events: [],
      selectedPlanId: "custom-study",
    });

    expect(result).toMatchObject({
      journeyType: null,
      journeyLabel: null,
      journeyDays: 0,
      completedDays: 0,
      journeyProgress: 0,
    });
    expect(result.trail).toEqual([]);
  });

  it("shows a missed-day dip without awarding the missed day back", () => {
    const result = calculateMountainRhythm({
      today: "2026-08-25",
      plans: [
        journey("recovery", 7, {
          completedDays: [0, 2, 3, 4],
        }),
      ],
      events: [],
      selectedPlanId: "recovery",
    });

    expect(result.completedDays).toBe(4);
    expect(result.earnedProgress).toBe(57.1);
    expect(result.trail[1].status).toBe("missed");
    expect(result.trail[1].earnedPercent).toBe(result.trail[0].earnedPercent);
    expect(result.trail[1].elevationPercent).toBe(
      result.trail[0].elevationPercent,
    );
    expect(result.trail[4].rhythmPercent).toBeGreaterThan(
      result.trail[1].elevationPercent,
    );
    expect(result.trail[4].elevationPercent).toBe(result.earnedProgress);
    expect(result.trail.slice(5).every((point) => point.status === "future")).toBe(true);
  });

  it("holds the first missed day flat and dips again for each later miss", () => {
    const result = calculateMountainRhythm({
      today: "2026-08-25",
      plans: [
        journey("multiple-misses", 7, {
          completedDays: [0, 1, 4],
        }),
      ],
      events: [],
      selectedPlanId: "multiple-misses",
    });

    expect(result.trail[2].status).toBe("missed");
    expect(result.trail[2].rhythmPercent).toBe(
      result.trail[1].rhythmPercent,
    );
    expect(result.trail[3].status).toBe("missed");
    expect(result.trail[3].rhythmPercent).toBeLessThan(
      result.trail[2].rhythmPercent,
    );
    expect(result.trail[3].rhythmPercent).toBeLessThan(25);
  });

  it("keeps the climb started while repeated misses can regress the current trail", () => {
    const result = calculateMountainRhythm({
      today: "2026-08-24",
      plans: [
        journey("trail-floor", 7, {
          completedDays: [0, 1, 3],
        }),
      ],
      events: [],
      selectedPlanId: "trail-floor",
    });

    expect(result.trail[2].status).toBe("missed");
    expect(result.trail[2].elevationPercent).toBeGreaterThanOrEqual(25);
    expect(result.trail[2].elevationPercent).toBeLessThanOrEqual(
      result.trail[1].elevationPercent,
    );
    expect(result.currentElevationPercent).toBeGreaterThanOrEqual(25);
    expect(result.level).toBe("On the Trail");
  });

  it("ignores stale earned ascent when every reading is reopened", () => {
    const plan = journey("reopened", 7, {
      name: "7-Day Climb",
    });
    const earnedDate = plan.assignments[0].date;
    const result = calculateMountainRhythm({
      today: earnedDate,
      plans: [{ ...plan, earnedDayKeys: [earnedDate] }],
      events: [],
      selectedPlanId: "reopened",
    });

    expect(result).toMatchObject({
      completedDays: 0,
      earnedProgress: 0,
      journeyComplete: false,
    });
    expect(result.trail[0]).toMatchObject({
      status: "missed",
      earnedPercent: 0,
    });
  });

  it("keeps Day 1 at Basecamp and begins the trail after that preparation day", () => {
    const dayOne = calculateMountainRhythm({
      today: "2026-08-21",
      plans: [journey("seven", 7, { completedDays: [0] })],
      events: [],
      selectedPlanId: "seven",
    });
    const dayTwo = calculateMountainRhythm({
      today: "2026-08-22",
      plans: [journey("seven", 7, { completedDays: [0, 1] })],
      events: [],
      selectedPlanId: "seven",
    });

    expect(dayOne.level).toBe("Basecamp");
    expect(dayOne.currentElevationPercent).toBeLessThanOrEqual(24);
    expect(dayTwo.level).toBe("On the Trail");
    expect(dayTwo.currentElevationPercent).toBeGreaterThanOrEqual(25);
  });

  it("keeps future journey days neutral and out of the recent score", () => {
    const result = calculateMountainRhythm({
      today: "2026-08-20",
      plans: [journey("future", 7, { name: "7-Day Climb" })],
      events: [],
      selectedPlanId: "future",
    });

    expect(result).toMatchObject({
      completedDays: 0,
      recordedDays: 0,
      currentElevationPercent: 0,
      level: "Basecamp",
    });
    expect(result.trail.every((point) => point.status === "future")).toBe(true);
  });

  it("holds an August 31 climb flat through September 2 with no earned reading day", () => {
    const pair = calculatePair({
      today: "2026-09-02",
      plans: [
        journey("aug31-empty", 7, {
          start: "2026-08-31",
          name: "7-Day Climb",
        }),
      ],
      selectedPlanId: "aug31-empty",
    });

    expectPairParity(pair);
    for (const result of [pair.server, pair.local]) {
      expect(result).toMatchObject({
        completedDays: 0,
        journeyProgress: 0,
        earnedProgress: 0,
        percentage: 0,
        currentElevationPercent: 0,
        level: "Basecamp",
      });
      expect(result.trail.slice(0, 3).every((point) =>
        point.elevationPercent === 0 &&
        point.earnedPercent === 0 &&
        point.rhythmPercent === 0,
      )).toBe(true);
    }
  });

  it("creates one earned rise when only August 31 is completed", () => {
    const pair = calculatePair({
      today: "2026-09-02",
      plans: [
        journey("aug31-one", 7, {
          start: "2026-08-31",
          name: "7-Day Climb",
          completedDays: [0],
        }),
      ],
      selectedPlanId: "aug31-one",
    });

    expectPairParity(pair);
    for (const result of [pair.server, pair.local]) {
      expect(result).toMatchObject({
        completedDays: 1,
        journeyProgress: 14.3,
        earnedProgress: 14.3,
      });
      expect(result.trail[0]).toMatchObject({
        date: "2026-08-31",
        status: "complete",
        elevationPercent: 14.3,
        earnedPercent: 14.3,
      });
      expect(result.trail[1].elevationPercent).toBe(result.trail[0].elevationPercent);
      expect(result.trail[2].elevationPercent).toBeLessThanOrEqual(result.trail[1].elevationPercent);
      expect(result.trail.slice(3).every((point) =>
        point.status === "future" &&
        point.elevationPercent === result.trail[2].elevationPercent,
      )).toBe(true);
    }
  });

  it("raises the graph again when August 31 and September 2 are completed", () => {
    const pair = calculatePair({
      today: "2026-09-02",
      plans: [
        journey("aug31-two", 7, {
          start: "2026-08-31",
          name: "7-Day Climb",
          completedDays: [0, 2],
        }),
      ],
      selectedPlanId: "aug31-two",
    });

    expectPairParity(pair);
    for (const result of [pair.server, pair.local]) {
      expect(result).toMatchObject({
        completedDays: 2,
        journeyProgress: 28.6,
        earnedProgress: 28.6,
      });
      expect(result.trail[0].elevationPercent).toBe(14.3);
      expect(result.trail[1]).toMatchObject({
        status: "missed",
        elevationPercent: 14.3,
      });
      expect(result.trail[2]).toMatchObject({
        date: "2026-09-02",
        status: "complete",
        elevationPercent: 28.6,
        earnedPercent: 28.6,
      });
    }
  });

  it("does not credit readings completed on future scheduled days", () => {
    const pair = calculatePair({
      today: "2026-09-02",
      plans: [
        journey("future-readings", 7, {
          start: "2026-08-31",
          name: "7-Day Climb",
          completedDays: [3, 4, 5, 6],
        }),
      ],
      selectedPlanId: "future-readings",
    });

    expectPairParity(pair);
    for (const result of [pair.server, pair.local]) {
      expect(result).toMatchObject({
        completedDays: 0,
        journeyProgress: 0,
        earnedProgress: 0,
        percentage: 0,
        currentElevationPercent: 0,
        level: "Basecamp",
      });
      expect(result.trail.every((point) =>
        point.elevationPercent === 0 &&
        point.earnedPercent === 0 &&
        point.rhythmPercent === 0,
      )).toBe(true);
      expect(result.trail.slice(3).every((point) => point.status === "future")).toBe(true);
    }
  });

  it("excludes ordinary-plan and calendar completions from climb progress", () => {
    const climb = journey("active-climb", 7, {
      start: "2026-08-31",
      name: "7-Day Climb",
    });
    const ordinaryPlan = journey("ordinary-only", 12, {
      name: "Ordinary reading plan",
      completedDays: [0, 1, 2, 3],
    });
    const events = [
      event("prayer", "prayer", "2026-09-02"),
      event("fasting", "fasting", "2026-09-02"),
      event("church", "church", "2026-09-02"),
    ];
    const pair = calculatePair({
      today: "2026-09-02",
      plans: [climb, ordinaryPlan],
      events,
      completions: {
        "prayer:2026-09-02": true,
        "fasting:2026-09-02": true,
        "church:2026-09-02": true,
      },
      selectedPlanId: "active-climb",
    });

    expectPairParity(pair);
    for (const result of [pair.server, pair.local]) {
      expect(result).toMatchObject({
        journeyType: "7-day-climb",
        journeyProgress: 0,
        earnedProgress: 0,
        currentElevationPercent: 0,
        level: "Basecamp",
      });
      expect(result.trail.every((point) => point.elevationPercent === 0)).toBe(true);
      expect(result.categories.prayer).toEqual({ planned: 0, completed: 0 });
      expect(result.categories.fasting).toEqual({ planned: 0, completed: 0 });
      expect(result.categories.church).toEqual({ planned: 0, completed: 0 });
    }
  });

  it("uses the selected structured climb without aggregating ordinary plans", () => {
    const seven = journey("seven", 7, {
      name: "7-Day Climb",
      completedDays: [0, 1, 2],
    });
    const twenty = journey("twenty", 20, {
      name: "20-Day Consistency Reset",
      completedDays: [0, 1],
    });
    const ordinary = journey("ordinary", 12, {
      name: "Ordinary reading plan",
      completedDays: [0, 1, 2, 3, 4, 5],
    });

    const result = calculateMountainRhythm({
      today: "2026-08-23",
      plans: [ordinary, seven, twenty],
      events: [],
      selectedPlanId: "twenty",
      accessTier: "full",
    });

    expect(result).toMatchObject({
      journeyLabel: "20-Day Reset",
      journeyDays: 20,
      completedDays: 2,
      journeyProgress: 10,
    });
  });

  it("does not auto-promote another climb when an ordinary plan is selected", () => {
    const ordinary = journey("ordinary", 12, {
      name: "Ordinary reading plan",
      completedDays: [0, 1, 2, 3],
    });
    const seven = journey("seven", 7, {
      name: "7-Day Climb",
      completedDays: [0, 1, 2],
    });

    const result = calculateMountainRhythm({
      today: "2026-08-23",
      plans: [seven, ordinary],
      events: [],
      selectedPlanId: "ordinary",
    });

    expect(result).toMatchObject({
      journeyLabel: null,
      journeyDays: 0,
      completedDays: 0,
      currentElevationPercent: 0,
    });
    expect(result.trail).toEqual([]);
  });

  it("keeps prayer, fasting, church, birthdays, and custom events out of Mountain Rhythm", () => {
    const plan = journey("seven", 7, {
      name: "7-Day Climb",
      completedDays: [0, 1, 2],
    });
    const events = [
      event("prayer", "prayer"),
      event("fasting", "fasting"),
      event("church", "church"),
      event("birthday", "birthday", "2026-08-27", { countsTowardRhythm: true }),
      event("faith", "event", "2026-08-26", { countsTowardRhythm: true }),
    ];
    const completions = {
      "prayer:2026-08-27": false,
      "fasting:2026-08-27": true,
      "church:2026-08-27": true,
      "birthday:2026-08-27": true,
      "faith:2026-08-26": true,
    };

    const withoutEvents = calculateMountainRhythm({
      today: "2026-08-27",
      plans: [plan],
      events: [],
      selectedPlanId: "seven",
    });
    const withEvents = calculateMountainRhythm({
      today: "2026-08-27",
      plans: [plan],
      events,
      completions,
      accessTier: "full",
      selectedPlanId: "seven",
    });

    expect(withEvents).toMatchObject({
      todayPlanned: withoutEvents.todayPlanned,
      todayCompleted: withoutEvents.todayCompleted,
      todayPercentage: withoutEvents.todayPercentage,
      currentElevationPercent: withoutEvents.currentElevationPercent,
      journeyProgress: withoutEvents.journeyProgress,
      earnedAscent: withoutEvents.earnedAscent,
    });
    expect(withEvents.categories.prayer).toEqual({ planned: 0, completed: 0 });
    expect(withEvents.categories.fasting).toEqual({ planned: 0, completed: 0 });
    expect(withEvents.categories.church).toEqual({ planned: 0, completed: 0 });
    expect(withEvents.categories.faithEvents).toEqual({ planned: 0, completed: 0 });
    expect(withEvents.commitments.every((commitment) => !commitment.eventId)).toBe(true);
    expect(withEvents.trail).toEqual(withoutEvents.trail);
  });

  it("does not classify retired 30-day records as structured ascent", () => {
    const plan = journey("legacy", 30, {
      name: "30-Day Consistency Reset",
    });
    const completedChapterKeys = plan.assignments
      .slice(0, 3)
      .flatMap((assignment) => assignment.readings.map((reading) => reading.key));

    const result = calculateMountainRhythm({
      today: "2026-08-23",
      plans: [{ ...plan, completed: undefined, completedChapterKeys }],
      events: [],
      selectedPlanId: "legacy",
    });

    expect(result).toMatchObject({
      journeyType: null,
      journeyLabel: null,
      journeyDays: 0,
      completedDays: 0,
      journeyProgress: 0,
    });
    expect(completedChapterKeys).toHaveLength(6);
  });
});