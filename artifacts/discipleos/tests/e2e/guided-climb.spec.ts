import { expect, test, type Page } from "@playwright/test";
import {
  buildGuidedClimbSetOnePlan,
  validateGuidedClimbSetOneDraft,
} from "../../src/lib/guided-climb";
import { addDaysISO, todayISO } from "../../src/lib/local-date";

const GUIDED_BOOK_CATALOG = [
  { name: "Genesis", chapters: 50 },
  { name: "Matthew", chapters: 28 },
  { name: "Psalms", chapters: 150 },
  { name: "Proverbs", chapters: 31 },
] as any;

const EXPECTED_DAILY_RANGES = [
  ["Genesis 1"],
  ["Genesis 2", "Matthew 1"],
  ["Genesis 3", "Matthew 2"],
  ["Genesis 4-5", "Matthew 3"],
  ["Genesis 6-7", "Matthew 4"],
  ["Genesis 8-9", "Matthew 5", "Psalms 1"],
  ["Genesis 10-11", "Matthew 6"],
  ["Genesis 12-13", "Matthew 7"],
  ["Genesis 14-15", "Matthew 8"],
  ["Genesis 16-17", "Matthew 9", "Proverbs 1"],
  ["Genesis 18-19", "Matthew 10"],
  ["Genesis 20-21", "Matthew 11"],
  ["Genesis 22-23", "Matthew 12"],
  ["Genesis 24-25", "Matthew 13", "Psalms 23"],
  ["Genesis 26-27", "Matthew 14"],
  ["Genesis 28-29", "Matthew 15"],
  ["Genesis 30-31", "Matthew 16"],
  ["Genesis 32-33", "Matthew 17", "Proverbs 3"],
  ["Genesis 34-35", "Matthew 18"],
  ["Genesis 36-37", "Matthew 19-20"],
  ["Genesis 38-39", "Matthew 21"],
  ["Genesis 40-41", "Matthew 22", "Psalms 121"],
  ["Genesis 42-43", "Matthew 23"],
  ["Genesis 44-45", "Matthew 24"],
  ["Genesis 46-47", "Matthew 25"],
  ["Genesis 48-49", "Matthew 26", "Proverbs 4"],
  ["Genesis 50", "Matthew 27-28"],
];

function expandRange(range: string) {
  const match = /^(.+?) (\d+)(?:[-–](\d+))?$/.exec(range);
  if (!match) throw new Error(`Invalid test reference: ${range}`);
  const [, book, fromText, toText] = match;
  const from = Number(fromText);
  const to = Number(toText || fromText);
  return Array.from({ length: to - from + 1 }, (_, index) => `${book} ${from + index}`);
}

function makeGuidedPlan(startDate = todayISO()) {
  return buildGuidedClimbSetOnePlan({
    id: "guided-climb-set-one",
    startDate,
    bookCatalog: GUIDED_BOOK_CATALOG,
    readingTime: "07:00",
    readingWpm: 200,
    dailyMinutes: 20,
    estimateChapterMinutes: () => 1,
  });
}

async function stubAppApi(page: Page, initialPlans: any[] = []) {
  const savedPlans: any[] = [];
  await page.addInitScript(() => localStorage.clear());
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname.endsWith("/auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ authenticated: false, user: null }),
      });
      return;
    }

    if (pathname.endsWith("/session/info")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          established: initialPlans.length > 0,
          authenticated: false,
          userId: "guided-climb-test-user",
        }),
      });
      return;
    }

    if (pathname.endsWith("/reading/plans")) {
      if (request.method() === "POST") {
        savedPlans.push(request.postDataJSON());
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, plans: initialPlans }),
      });
      return;
    }

    if (pathname.endsWith("/events")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, events: [] }),
      });
      return;
    }

    if (pathname.endsWith("/rhythm/score")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, eventCompletions: [] }),
      });
      return;
    }

    if (pathname.endsWith("/verse")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reference: "Psalm 1:1",
          text: "Blessed is the one who walks not in step with the wicked.",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
  return savedPlans;
}

test("Set 1 retains the exact 27-day schedule and is complete without a continuation", () => {
  expect(validateGuidedClimbSetOneDraft(GUIDED_BOOK_CATALOG)).toEqual([]);

  const plan = makeGuidedPlan();
  const expectedAssignments = EXPECTED_DAILY_RANGES.map((ranges) =>
    ranges.flatMap(expandRange),
  );
  const actualAssignments = plan.assignments.map((day) =>
    day.readings.map((reading) => reading.label),
  );

  expect(actualAssignments).toEqual(expectedAssignments);
  expect(plan.assignments).toHaveLength(27);
  expect(plan.assignments.flatMap((day) => day.readings)).toHaveLength(84);
  expect(
    new Set(plan.assignments.flatMap((day) => day.readings.map((reading) => reading.key))).size,
  ).toBe(84);
  expect(plan.assignments.map((day, index) => day.guidedLoad ? index + 1 : null).filter(Boolean))
    .toEqual([6, 10, 14, 18, 20, 22, 26]);
  expect(plan.guidedClimb).toEqual({
    series: "Guided Climb",
    set: 1,
    slug: "find-your-footing",
  });
  expect(plan).not.toHaveProperty("journeyKey");
  expect(plan.assignments[0].date).toBe(plan.startDate);
  expect(plan.assignments[26].date).toBe(plan.endDate);
});

test("new readers see the introduction before starting Discover Scripture", async ({ page }) => {
  const savedPlans = await stubAppApi(page);
  await page.setViewportSize({ width: 600, height: 460 });
  await page.goto("/");

  await expect(page.getByTestId("first-plan-onboarding")).toBeVisible();
  await expect(page.getByTestId("reading-path-guided")).toContainText("27-day");
  await page.getByTestId("reading-path-guided-action").click();
  const intro = page.getByTestId("guided-climb-preview");
  await expect(intro).toBeVisible();
  await expect(intro).toContainText("Start gently, then add a little more reading as you go.");
  for (const book of ["Genesis", "Matthew", "Psalms", "Proverbs"]) {
    await expect(intro).toContainText(book);
  }
  await expect(intro).toContainText("doesn’t include the full Bible text");
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 600 });
    const bounds = await intro.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  }
  await page.setViewportSize({ width: 600, height: 460 });
  await intro.getByTestId("guided-climb-reading-time").fill("08:15");
  await intro.getByTestId("guided-climb-start").click();

  await expect(page.getByTestId("first-plan-onboarding")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  await expect(page.getByTestId("dashboard-assigned-reading")).toContainText(
    "Genesis",
  );
  await expect.poll(() => savedPlans.length).toBe(1);

  const savedPlan = savedPlans[0];
  expect(savedPlan.name).toBe("Discover Scripture");
  expect(savedPlan.selectedBooks).toEqual([
    "Genesis",
    "Matthew",
    "Psalms",
    "Proverbs",
  ]);
  expect(savedPlan.guidedClimb.set).toBe(1);
  expect(savedPlan.readingTime).toBe("08:15");
  expect(savedPlan.assignments).toHaveLength(27);
  expect(
    savedPlan.assignments.map((day: any) =>
      day.readings.map((reading: any) => reading.label),
    ),
  ).toEqual(EXPECTED_DAILY_RANGES.map((ranges) => ranges.flatMap(expandRange)));
});

test("a plan-less user with an active Mountain Rhythm keeps it and sees all paths", async ({
  page,
}) => {
  const startDate = todayISO();
  const activeClimb = {
    id: "active-mountain-rhythm",
    name: "7-Day Climb",
    journeyKey: "7-day-climb",
    journeyType: "7-day-climb",
    journeyDays: 7,
    durationDays: 7,
    totalDays: 7,
    startDate,
    endDate: addDaysISO(startDate, 6),
    assignments: Array.from({ length: 7 }, (_, index) => ({
      date: addDaysISO(startDate, index),
      readings: [{ key: `active-climb-${index}`, label: `Genesis ${index + 1}` }],
    })),
    completed: {},
    earnedDayKeys: [],
  };
  const savedPlans = await stubAppApi(page, [activeClimb]);
  await page.goto("/");

  await expect(page.getByTestId("first-plan-onboarding")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  await page.getByTestId("dashboard-navigation-row").getByText("Plans", { exact: true }).click();

  await expect(page.getByTestId("dashboard-plans-empty-state")).toBeVisible();
  await expect(page.getByTestId("active-mountain-rhythm-note")).toContainText(
    "Your 7-Day Climb in Mountain Rhythm is still in progress",
  );
  await expect(page.getByTestId("reading-path-guided")).toBeVisible();
  await expect(page.getByTestId("reading-path-mountain-rhythm")).toBeVisible();
  await expect(page.getByTestId("reading-path-free-climb")).toBeVisible();
  await expect(page.getByTestId("reading-path-mountain-rhythm-action")).toHaveAttribute(
    "href",
    "/mountain-rhythm",
  );
  expect(savedPlans).toHaveLength(0);
  await page.getByTestId("reading-path-mountain-rhythm-action").click();
  await expect(page).toHaveURL(/\/mountain-rhythm$/);
  await expect(page.getByRole("heading", { name: "Mountain Rhythm" })).toBeVisible();
  expect(savedPlans).toHaveLength(0);
});

test("returning readers can add Guided Climb without replacing an existing plan", async ({ page }) => {
  const today = todayISO();
  const existingPlan = {
    id: "existing-reading-plan",
    name: "My Existing Plan",
    selectedBooks: ["Genesis"],
    startDate: today,
    endDate: today,
    readingMode: "consecutive",
    readingTime: "07:00",
    paceMode: "chapters",
    dailyMinutes: 20,
    readingWpm: 200,
    assignments: [
      {
        date: today,
        readings: [
          {
            key: "Genesis-1",
            label: "Genesis 1",
            book: "Genesis",
            chapter: 1,
            estimatedMinutes: 3,
          },
        ],
        chapterCount: 1,
        estimatedMinutes: 3,
      },
    ],
    completed: {},
  };
  const savedPlans = await stubAppApi(page, [existingPlan]);
  await page.goto("/");

  await expect(page.getByTestId("first-plan-onboarding")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  await page.getByTestId("dashboard-navigation-row").getByText("Plans", { exact: true }).click();
  await expect(page.getByTestId("planned-reading-card-existing-reading-plan")).toBeVisible();
  await page.getByTestId("plans-guided-climb-button").click();
  await expect(page.getByTestId("guided-climb-preview")).toBeVisible();
  await page.getByTestId("guided-climb-start").click();

  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  await expect.poll(() => savedPlans.length).toBe(1);
  expect(savedPlans[0].name).toBe("Discover Scripture");
  expect(savedPlans[0].id).not.toBe(existingPlan.id);

  await page.getByTestId("dashboard-navigation-row").getByText("Plans", { exact: true }).click();
  await expect(page.getByTestId("planned-reading-card-existing-reading-plan")).toBeVisible();
  await expect(page.getByTestId("planned-reading-card-existing-reading-plan")).toContainText(
    "My Existing Plan",
  );
  await expect(
    page.getByTestId(`planned-reading-card-${savedPlans[0].id}`),
  ).toBeVisible();
});

test("returning Guided Climb readers can reopen the introduction without restarting", async ({ page }) => {
  const existingPlan = makeGuidedPlan();
  const savedPlans = await stubAppApi(page, [existingPlan]);
  await page.goto("/");
  await page.getByTestId("dashboard-navigation-row").getByText("Plans", { exact: true }).click();
  await page.getByTestId(`guided-climb-introduction-${existingPlan.id}`).click();
  const intro = page.getByTestId("guided-climb-preview");
  await expect(intro).toContainText("Your journey and progress are saved.");
  await expect(intro.getByTestId("guided-climb-reading-time")).toHaveCount(0);
  await intro.getByTestId("guided-climb-start").click();
  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  expect(savedPlans).toHaveLength(0);
});

test("read time can be set while reminder opt-in remains optional", async ({ page }) => {
  const savedPlans = await stubAppApi(page);
  await page.goto("/");
  await page.getByTestId("reading-path-guided-action").click();
  const intro = page.getByTestId("guided-climb-preview");
  await expect(intro.getByTestId("guided-climb-reminder-toggle")).not.toBeChecked();
  await intro.getByTestId("guided-climb-reading-time").fill("06:45");
  await intro.getByTestId("guided-climb-reminder-toggle").check();
  await expect(intro).toContainText("Push reminders require you to be signed in");
  await intro.getByTestId("guided-climb-start").click();
  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  expect(savedPlans[0].readingTime).toBe("06:45");
});

test("Day 27 completion offers Mountain Rhythm or a Free Climb, with no required next set", async ({ page }) => {
  const completedPlan = makeGuidedPlan();
  completedPlan.completed = Object.fromEntries(
    completedPlan.assignments.flatMap((day) =>
      day.readings.map((reading) => [reading.key, true] as const),
    ),
  );
  const savedPlans = await stubAppApi(page, [completedPlan]);
  await page.goto("/");

  await page.getByTestId("dashboard-navigation-row").getByText("Plans", { exact: true }).click();
  await page.getByTestId("planned-reading-card-guided-climb-set-one").click();
  await page.getByTestId("dashboard-navigation-row").getByText("Today", { exact: true }).click();

  const completion = page.getByTestId("guided-climb-complete");
  await expect(completion).toBeVisible();
  await expect(completion).toContainText("You finished all 27 days");
  await expect(completion.getByTestId("guided-climb-choice-mountain-rhythm")).toHaveAttribute(
    "href",
    "/mountain-rhythm",
  );
  await expect(completion.getByTestId("guided-climb-choice-free-climb")).toBeVisible();
  await expect(completion.getByText("Set 2", { exact: true })).toHaveCount(0);

  await completion.getByTestId("guided-climb-choice-free-climb").click();
  await expect(page.getByTestId("plan-create-step-1")).toBeVisible();
  expect(savedPlans).toHaveLength(0);
});
