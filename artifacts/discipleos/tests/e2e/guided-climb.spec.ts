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

async function stubAppApi(
  page: Page,
  initialPlans: any[] = [],
  options: {
    authenticated?: boolean;
    initialEvents?: any[];
    eventCalls?: { saved: any[]; deletedIds: string[] };
    failFirstEventDelete?: boolean;
    planCalls?: { deletedIds: string[] };
    failFirstPlanDelete?: boolean;
  } = {},
) {
  const savedPlans: any[] = [];
  const serverPlans = [...initialPlans];
  const serverEvents = [...(options.initialEvents || [])];
  let eventDeleteAttempts = 0;
  let planDeleteAttempts = 0;
  await page.addInitScript(() => {
    if (sessionStorage.getItem("guided-climb-e2e-initialized")) return;
    localStorage.clear();
    sessionStorage.setItem("guided-climb-e2e-initialized", "1");
  });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname.endsWith("/auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          authenticated: Boolean(options.authenticated),
          user: options.authenticated
            ? { id: "guided-climb-test-user", email: "climb@example.test" }
            : null,
        }),
      });
      return;
    }

    if (pathname.endsWith("/session/info")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          established: initialPlans.length > 0 || Boolean(options.authenticated),
          authenticated: Boolean(options.authenticated),
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
      if (request.method() === "DELETE") {
        const { id } = request.postDataJSON();
        options.planCalls?.deletedIds.push(id);
        const failThisDelete =
          options.failFirstPlanDelete && planDeleteAttempts++ === 0;
        if (!failThisDelete) {
          const index = serverPlans.findIndex((plan) => plan.id === id);
          if (index >= 0) serverPlans.splice(index, 1);
        }
        await route.fulfill({
          status: failThisDelete ? 503 : 200,
          contentType: "application/json",
          body: JSON.stringify({ success: !failThisDelete }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, plans: serverPlans }),
      });
      return;
    }

    if (pathname.endsWith("/events")) {
      if (request.method() === "POST") {
        const event = request.postDataJSON();
        options.eventCalls?.saved.push(event);
        const index = serverEvents.findIndex((item) => item.id === event.id);
        if (index >= 0) serverEvents[index] = event;
        else serverEvents.push(event);
      } else if (request.method() === "DELETE") {
        const { id } = request.postDataJSON();
        options.eventCalls?.deletedIds.push(id);
        const failThisDelete =
          options.failFirstEventDelete && eventDeleteAttempts++ === 0;
        if (!failThisDelete) {
          const index = serverEvents.findIndex((item) => item.id === id);
          if (index >= 0) serverEvents.splice(index, 1);
        }
        await route.fulfill({
          status: failThisDelete ? 503 : 200,
          contentType: "application/json",
          body: JSON.stringify({ success: !failThisDelete }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, events: serverEvents }),
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
  await page.setViewportSize({ width: 390, height: 600 });
  const startReading = page.getByRole("button", { name: "Start Reading" });
  const mobileLayout = await intro.evaluate((element) => {
    const scrollContainers = [element, ...element.querySelectorAll("*")]
      .filter((node) => {
        const style = getComputedStyle(node);
        return ["auto", "scroll"].includes(style.overflowY) &&
          node.scrollHeight > node.clientHeight + 1;
      })
      .length;
    const pageContent = document.querySelector(".discipleos-app-content");
    return {
      overflowY: getComputedStyle(element).overflowY,
      maxHeight: getComputedStyle(element).maxHeight,
      scrollContainers,
      pageScrolls: pageContent.scrollHeight > pageContent.clientHeight,
    };
  });
  expect(mobileLayout).toEqual({
    overflowY: "visible",
    maxHeight: "none",
    scrollContainers: 0,
    pageScrolls: true,
  });
  await startReading.scrollIntoViewIfNeeded();
  const startBounds = await startReading.boundingBox();
  const pageContentBounds = await page.locator(".discipleos-app-content").boundingBox();
  expect(startBounds).not.toBeNull();
  expect(pageContentBounds).not.toBeNull();
  expect(startBounds!.y).toBeGreaterThanOrEqual(pageContentBounds!.y);
  expect(startBounds!.y + startBounds!.height).toBeLessThanOrEqual(
    pageContentBounds!.y + pageContentBounds!.height + 1,
  );

  await page.setViewportSize({ width: 1280, height: 420 });
  const desktopLayout = await intro.evaluate((element) => ({
    overflowY: getComputedStyle(element).overflowY,
    maxHeight: getComputedStyle(element).maxHeight,
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
    mobileScrollerOverflow: getComputedStyle(
      document.querySelector(".discipleos-app-content"),
    ).overflowY,
  }));
  expect(desktopLayout.overflowY).toBe("visible");
  expect(desktopLayout.maxHeight).toBe("none");
  expect(desktopLayout.scrollHeight).toBeGreaterThan(desktopLayout.viewportHeight);
  expect(desktopLayout.mobileScrollerOverflow).not.toBe("auto");
  await startReading.scrollIntoViewIfNeeded();
  const desktopStartBounds = await startReading.boundingBox();
  expect(desktopStartBounds).not.toBeNull();
  expect(desktopStartBounds!.y).toBeGreaterThanOrEqual(0);
  expect(desktopStartBounds!.y + desktopStartBounds!.height).toBeLessThanOrEqual(420);

  await page.setViewportSize({ width: 600, height: 460 });
  await intro.getByTestId("guided-climb-reading-time").fill("08:15");
  await startReading.click();

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
  const guidedClimbAction = page.getByTestId("plans-guided-climb-button");
  await expect(guidedClimbAction).toHaveText("Start Guided Climb");
  await guidedClimbAction.click();
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

test("signed-in readers get a daily reminder only after permission and subscription succeed", async ({
  page,
}) => {
  const eventCalls = { saved: [] as any[], deletedIds: [] as string[] };
  const savedPlans = await stubAppApi(page, [], {
    authenticated: true,
    eventCalls,
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        permission: "default",
        requestPermission: async () => "granted",
      },
    });
    const applicationServerKey = new Uint8Array(65).fill(1);
    const subscription = {
      endpoint: "https://push.example.test/subscription",
      expirationTime: null,
      options: { applicationServerKey },
      toJSON: () => ({
        endpoint: "https://push.example.test/subscription",
        expirationTime: null,
        keys: { p256dh: "cHVi", auth: "YXV0aA" },
      }),
      unsubscribe: async () => true,
    };
    const registration = {
      pushManager: {
        getSubscription: async () => null,
        subscribe: async () => subscription,
      },
      showNotification: async () => undefined,
    };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register: async () => registration,
        ready: Promise.resolve(registration),
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });
  });

  await page.goto("/");
  await page.getByTestId("reading-path-guided-action").click();
  const intro = page.getByTestId("guided-climb-preview");
  await intro.getByTestId("guided-climb-reading-time").fill("08:15");
  await intro.getByTestId("guided-climb-reminder-toggle").check();
  await intro.getByTestId("guided-climb-start").click();

  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  await expect.poll(() => savedPlans.length).toBe(1);
  await expect.poll(() => eventCalls.saved.length).toBe(1);
  expect(savedPlans[0].readingTime).toBe("08:15");
  expect(eventCalls.saved[0]).toMatchObject({
    id: `guided-climb-reminder:${savedPlans[0].id}`,
    title: "Discover Scripture reading",
    date: savedPlans[0].startDate,
    time: "08:15",
    remind: true,
    reminderMinutes: 0,
    repeat: "daily",
    repeatUntil: savedPlans[0].endDate,
    countsTowardRhythm: false,
  });
});

test("denied notification permission does not create a Guided Climb reminder", async ({
  page,
}) => {
  const eventCalls = { saved: [] as any[], deletedIds: [] as string[] };
  const savedPlans = await stubAppApi(page, [], {
    authenticated: true,
    eventCalls,
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        permission: "denied",
        requestPermission: async () => "denied",
      },
    });
  });

  await page.goto("/");
  await page.getByTestId("reading-path-guided-action").click();
  const intro = page.getByTestId("guided-climb-preview");
  await intro.getByTestId("guided-climb-reading-time").fill("06:30");
  await intro.getByTestId("guided-climb-reminder-toggle").check();
  await intro.getByTestId("guided-climb-start").click();

  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  await expect.poll(() => savedPlans.length).toBe(1);
  expect(savedPlans[0].readingTime).toBe("06:30");
  expect(eventCalls.saved).toHaveLength(0);
});

test("removing Guided Climb locally deletes its plan-linked reminder only", async ({ page }) => {
  const plan = makeGuidedPlan();
  const guidedReminder = {
    id: `guided-climb-reminder:${plan.id}`,
    title: "Discover Scripture reading",
    type: "event",
    date: plan.startDate,
    time: plan.readingTime,
    notes: "Daily reading reminder for Guided Climb: Discover Scripture.",
    remind: true,
    reminderMinutes: 0,
    repeat: "daily",
    repeatWeekdays: [0, 1, 2, 3, 4, 5, 6],
    repeatUntil: plan.endDate,
    countsTowardRhythm: false,
  };
  const legacyGuidedReminder = {
    ...guidedReminder,
    id: "legacy-guided-reminder",
  };
  const unrelatedEvent = {
    ...guidedReminder,
    id: "unrelated-event",
    title: "Morning prayer",
    notes: "Personal prayer reminder",
  };
  const deletedIds: string[] = [];
  await stubAppApi(page, [plan], {
    initialEvents: [guidedReminder, legacyGuidedReminder, unrelatedEvent],
    eventCalls: { saved: [], deletedIds },
  });

  await page.goto("/");
  await page.getByTestId("dashboard-navigation-row").getByText("Plans", { exact: true }).click();
  await page.getByTestId(`plan-delete-${plan.id}`).click();
  await expect.poll(() => deletedIds.length).toBe(2);
  expect(deletedIds).toEqual([
    `guided-climb-reminder:${plan.id}`,
    "legacy-guided-reminder",
  ]);
  await page.getByTestId("dashboard-navigation-row").getByText("Calendar", { exact: true }).click();
  await expect(page.getByText("Morning prayer", { exact: true })).toBeVisible();
  await expect(page.getByText("Discover Scripture reading", { exact: true })).toHaveCount(0);
});

test("server-sync retry removes the reminder and plan without changing Mountain Rhythm progress", async ({
  page,
}) => {
  const plan = makeGuidedPlan();
  const unrelatedPlan = {
    ...plan,
    id: "unrelated-reading-plan",
    name: "Personal reading plan",
    guidedClimb: undefined,
    completed: { ...plan.completed, [plan.assignments[0].readings[0].key]: true },
  };
  const mountainStartDate = todayISO();
  const mountainAssignments = Array.from({ length: 7 }, (_, dayIndex) => ({
    date: addDaysISO(mountainStartDate, dayIndex),
    readings: [
      { key: `unrelated-mountain-plan-${dayIndex}-a`, label: `Reading ${dayIndex + 1}A` },
      { key: `unrelated-mountain-plan-${dayIndex}-b`, label: `Reading ${dayIndex + 1}B` },
    ],
  }));
  const mountainPlan = {
    id: "unrelated-mountain-plan",
    name: "Seven-day reading climb",
    journeyKey: "7-day-climb",
    journeyType: "7-day-climb",
    journeyDays: 7,
    durationDays: 7,
    totalDays: 7,
    startDate: mountainStartDate,
    endDate: addDaysISO(mountainStartDate, 6),
    assignments: mountainAssignments,
    completed: Object.fromEntries(
      mountainAssignments[0].readings.map((reading) => [reading.key, true]),
    ),
    earnedDayKeys: [mountainAssignments[0].date],
    dayCompletionDates: {
      [mountainAssignments[0].date]: mountainAssignments[0].date,
    },
  };
  const guidedReminder = {
    id: `guided-climb-reminder:${plan.id}`,
    title: "Discover Scripture reading",
    type: "event",
    date: plan.startDate,
    time: plan.readingTime,
    notes: "Daily reading reminder for Guided Climb: Discover Scripture.",
    remind: true,
    reminderMinutes: 0,
    repeat: "daily",
    repeatWeekdays: [0, 1, 2, 3, 4, 5, 6],
    repeatUntil: plan.endDate,
    countsTowardRhythm: false,
  };
  const unrelatedEvent = {
    ...guidedReminder,
    id: "unrelated-event",
    title: "Morning prayer",
    notes: "Personal prayer reminder",
  };
  const deletedEventIds: string[] = [];
  const deletedPlanIds: string[] = [];
  await stubAppApi(page, [plan, unrelatedPlan, mountainPlan], {
    // Keep an ordinary plan in the visible Plans list as well as a structured
    // climb whose append-only history backs Mountain Rhythm.
    initialEvents: [guidedReminder, unrelatedEvent],
    eventCalls: { saved: [], deletedIds: deletedEventIds },
    failFirstEventDelete: true,
    planCalls: { deletedIds: deletedPlanIds },
    failFirstPlanDelete: true,
  });

  await page.goto("/");
  await page.getByTestId("dashboard-navigation-row").getByText("Plans", { exact: true }).click();
  await page.getByTestId(`plan-delete-${plan.id}`).click();
  await expect.poll(() => deletedEventIds.length).toBe(1);
  await expect.poll(() => deletedPlanIds.length).toBe(1);
  await expect.poll(() =>
    page.evaluate(({ planId, reminderId }) => {
      const state = JSON.parse(localStorage.getItem("discipleos:pendingOps") || "{}");
      return ["delete-event", "delete-plan"].every((type) =>
        state.ops?.some((op: any) =>
          type === "delete-event"
            ? op.type === type && op.id === reminderId
            : op.type === type && op.id === planId,
        ),
      );
    }, { planId: plan.id, reminderId: `guided-climb-reminder:${plan.id}` }),
  ).toBe(true);

  await page.reload();
  await expect.poll(() => deletedEventIds.length).toBe(2);
  await expect.poll(() => deletedPlanIds.length).toBe(2);
  expect(deletedEventIds).toEqual([
    `guided-climb-reminder:${plan.id}`,
    `guided-climb-reminder:${plan.id}`,
  ]);
  expect(deletedPlanIds).toEqual([plan.id, plan.id]);

  await page.getByTestId("dashboard-navigation-row").getByText("Plans", { exact: true }).click();
  await expect(page.getByTestId(`planned-reading-card-${plan.id}`)).toHaveCount(0);
  await expect(page.getByTestId(`planned-reading-card-${unrelatedPlan.id}`)).toBeVisible();
  const openMountainRhythm = page
    .getByTestId("dashboard-active-climb")
    .getByRole("link", { name: "Open Mountain Rhythm" });
  await expect(openMountainRhythm).toBeVisible();
  await openMountainRhythm.click();
  await expect(page).toHaveURL(/\/mountain-rhythm$/);
  await expect(page.getByRole("heading", { name: "Mountain Rhythm" })).toBeVisible();
  await page.getByTestId("button-back-mountain-rhythm").click();
  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  const storedData = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("discipleos-data") || "{}"),
  );
  expect(storedData.plans).toHaveLength(2);
  const storedUnrelatedPlan = storedData.plans.find((item: any) => item.id === unrelatedPlan.id);
  expect(storedUnrelatedPlan?.completed).toMatchObject(unrelatedPlan.completed);
  const storedMountainPlan = storedData.plans.find((item: any) => item.id === mountainPlan.id);
  expect(storedMountainPlan).toMatchObject({
    id: mountainPlan.id,
    completed: mountainPlan.completed,
    earnedDayKeys: mountainPlan.earnedDayKeys,
    dayCompletionDates: mountainPlan.dayCompletionDates,
  });

  await page.getByTestId("dashboard-navigation-row").getByText("Calendar", { exact: true }).click();
  await expect(page.getByText("Morning prayer", { exact: true })).toBeVisible();
  await expect(page.getByText("Discover Scripture reading", { exact: true })).toHaveCount(0);
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
