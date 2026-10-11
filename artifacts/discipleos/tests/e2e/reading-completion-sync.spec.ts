import { expect, test, type Page } from "@playwright/test";

const OWNER_ID = "reading-sync-owner";
const OTHER_OWNER_ID = "other-reading-sync-owner";
const PLAN_ID = "reading-sync-plan";
const PENDING_OPS_KEY = "discipleos:pendingOps";
const COMPLETION_KEYS = ["today-psalm-1", "today-psalm-2"];

test.use({ timezoneId: "UTC" });

test("Home and Mountain Rhythm reject plan hydration when auth and server owners differ", async ({
  page,
}) => {
  const cachedPlan = makeActiveClimbPlan();
  const foreignPlan = {
    ...makeActiveClimbPlan(),
    id: "foreign-session-climb",
    name: "Foreign Session Climb",
  };
  const requests = { claims: 0, planReads: 0 };

  await page.addInitScript(({ cachedPlan }) => {
    localStorage.setItem(
      "discipleos-data",
      JSON.stringify({
        ownerId: "auth-owner",
        plans: [cachedPlan],
        events: [],
        eventCompletions: {},
        selectedPlanId: cachedPlan.id,
      }),
    );
  }, { cachedPlan });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith("/auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          authenticated: true,
          user: { id: "auth-owner", email: "fixture@example.test" },
        }),
      });
      return;
    }
    if (pathname.endsWith("/session/info")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          userId: "different-session-owner",
          authenticated: true,
          established: true,
        }),
      });
      return;
    }
    if (pathname.endsWith("/account/claim")) {
      requests.claims += 1;
      await route.fulfill({ status: 200, json: { success: true } });
      return;
    }
    if (pathname.endsWith("/reading/plans") && request.method() === "GET") {
      requests.planReads += 1;
      await route.fulfill({
        status: 200,
        json: { success: true, plans: [foreignPlan] },
      });
      return;
    }
    if (pathname.endsWith("/events") && request.method() === "GET") {
      await route.fulfill({ status: 200, json: { success: true, events: [] } });
      return;
    }
    if (pathname.endsWith("/rhythm/score")) {
      await route.fulfill({
        status: 200,
        json: { success: true, commitments: [], eventCompletions: [] },
      });
      return;
    }
    if (pathname.endsWith("/settings")) {
      await route.fulfill({ status: 200, json: { success: true, settings: {} } });
      return;
    }
    await route.fulfill({ status: 200, json: { success: true } });
  });

  await page.goto("/");
  await expect(page.getByText("Climb reading 1")).toBeVisible();
  await expect(page.getByText("Foreign Session Climb")).toHaveCount(0);

  await page.goto("/mountain-rhythm");
  await expect(page.getByText("Climb reading 1")).toBeVisible();
  await expect(page.getByText("Foreign Session Climb")).toHaveCount(0);
  expect(requests).toEqual({ claims: 0, planReads: 0 });
  await expect.poll(() =>
    page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
      return { ownerId: data.ownerId, planId: data.plans?.[0]?.id };
    }),
  ).toEqual({ ownerId: "auth-owner", planId: cachedPlan.id });
});

test("Mountain Rhythm keeps its owner-scoped cache when account claim fails", async ({
  page,
}) => {
  const cachedPlan = makeActiveClimbPlan();
  const requests = { claims: 0, planReads: 0 };
  await page.addInitScript(({ cachedPlan }) => {
    localStorage.setItem(
      "discipleos-data",
      JSON.stringify({
        ownerId: "previous-anonymous-owner",
        plans: [cachedPlan],
        events: [],
        eventCompletions: {},
        selectedPlanId: cachedPlan.id,
      }),
    );
  }, { cachedPlan });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith("/auth/me")) {
      await route.fulfill({
        status: 200,
        json: {
          authenticated: true,
          user: { id: "account-owner", email: "fixture@example.test" },
        },
      });
      return;
    }
    if (pathname.endsWith("/session/info")) {
      await route.fulfill({
        status: 200,
        json: { userId: "account-owner", authenticated: true, established: true },
      });
      return;
    }
    if (pathname.endsWith("/account/claim")) {
      requests.claims += 1;
      await route.fulfill({ status: 409, json: { success: false } });
      return;
    }
    if (pathname.endsWith("/reading/plans") && request.method() === "GET") {
      requests.planReads += 1;
      await route.fulfill({ status: 200, json: { success: true, plans: [] } });
      return;
    }
    if (pathname.endsWith("/events") && request.method() === "GET") {
      await route.fulfill({ status: 200, json: { success: true, events: [] } });
      return;
    }
    if (pathname.endsWith("/rhythm/score")) {
      await route.fulfill({
        status: 200,
        json: { success: true, commitments: [], eventCompletions: [] },
      });
      return;
    }
    await route.fulfill({ status: 200, json: { success: true, settings: {} } });
  });

  await page.goto("/mountain-rhythm");
  await expect(
    page.getByText("Account data could not be claimed. Your saved reading data remains on this device."),
  ).toBeVisible();
  await expect(page.getByText("Climb reading 1")).toHaveCount(0);
  expect(requests).toEqual({ claims: 1, planReads: 0 });
  await expect.poll(() =>
    page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
      return { ownerId: data.ownerId, planId: data.plans?.[0]?.id };
    }),
  ).toEqual({ ownerId: "previous-anonymous-owner", planId: cachedPlan.id });
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function makePlan(readingKeys = COMPLETION_KEYS) {
  return {
    id: PLAN_ID,
    name: "Reading Sync Plan",
    journeyKey: "custom",
    journeyType: "custom",
    selectedBooks: ["Psalms"],
    startDate: todayISO(),
    endDate: todayISO(),
    durationDays: 1,
    totalDays: 1,
    dailyMinutes: 15,
    readingTime: "07:00",
    readingMode: "consecutive",
    color: "from-[#D4A017] to-[#8A6414]",
    assignments: [
      {
        date: todayISO(),
        readings: readingKeys.map((key, index) => ({
          key,
          label: `Psalm ${index + 1}`,
          book: "Psalms",
          chapter: index + 1,
          estimatedMinutes: 5,
        })),
      },
    ],
    completed: {},
    earnedDayKeys: [],
  };
}

function makeActiveClimbPlan() {
  const startDate = todayISO();
  const addDays = (amount: number) => {
    const date = new Date(`${startDate}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
  };
  const id = "offline-active-climb";

  return {
    id,
    name: "7-Day Climb",
    journeyKey: "7-day-climb",
    journeyType: "7-day-climb",
    journeyDays: 7,
    selectedBooks: ["Psalms"],
    startDate,
    endDate: addDays(6),
    durationDays: 7,
    totalDays: 7,
    dailyMinutes: 15,
    readingTime: "07:00",
    readingMode: "consecutive",
    color: "from-[#D4A017] to-[#8A6414]",
    assignments: Array.from({ length: 7 }, (_, index) => ({
      date: addDays(index),
      readings: [
        {
          key: `${id}-day-${index + 1}`,
          label: `Climb reading ${index + 1}`,
          book: "Psalms",
          chapter: index + 1,
          estimatedMinutes: 5,
        },
      ],
    })),
    completed: {},
    earnedDayKeys: [],
    dayCompletionDates: {},
  };
}

function makeFiveOfSevenClimb() {
  const today = todayISO();
  const addDays = (amount: number) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
  };
  const assignments = Array.from({ length: 7 }, (_, index) => ({
    date: addDays(index - 4),
    readings: [{
      key: `synthetic-climb-day-${index + 1}`,
      label: `Synthetic reading ${index + 1}`,
      book: "Psalms",
      chapter: index + 1,
      estimatedMinutes: 5,
    }],
  }));
  const earnedDayKeys = assignments.slice(0, 5).map((assignment) => assignment.date);
  const completed = Object.fromEntries(
    assignments.slice(0, 5).flatMap((assignment) =>
      assignment.readings.map((reading) => [reading.key, true]),
    ),
  );
  const dayCompletionDates = Object.fromEntries(
    earnedDayKeys.map((date, index) => [date, index === 0 || index === 4 ? date : today]),
  );

  return {
    id: "synthetic-seven-day-climb",
    name: "Synthetic 7-Day Climb",
    journeyKey: "7-day-climb",
    journeyType: "7-day-climb",
    journeyDays: 7,
    selectedBooks: ["Psalms"],
    startDate: addDays(-4),
    endDate: addDays(2),
    durationDays: 7,
    totalDays: 7,
    dailyMinutes: 15,
    readingTime: "07:00",
    readingMode: "consecutive",
    color: "from-[#D4A017] to-[#8A6414]",
    assignments,
    completed,
    earnedDayKeys,
    dayCompletionDates,
  };
}

async function stubAuthenticatedPlanApi(
  page: Page,
  ownerId: string,
  getPlans: () => any[],
  getEvents: () => any[] = () => [],
) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith("/auth/me")) {
      await route.fulfill({
        status: 200,
        json: { authenticated: true, user: { id: ownerId, email: "fixture@example.test" } },
      });
      return;
    }
    if (pathname.endsWith("/session/info")) {
      await route.fulfill({
        status: 200,
        json: {
          authenticated: true,
          established: true,
          userId: ownerId,
          capabilities: { mountainRhythm: "full", namedJourneys: true },
        },
      });
      return;
    }
    if (pathname.endsWith("/account/claim")) {
      await route.fulfill({ status: 200, json: { success: true } });
      return;
    }
    if (pathname.endsWith("/reading/plans") && request.method() === "GET") {
      await route.fulfill({ status: 200, json: { success: true, plans: getPlans() } });
      return;
    }
    if (pathname.endsWith("/events")) {
      await route.fulfill({ status: 200, json: { success: true, events: getEvents() } });
      return;
    }
    if (pathname.endsWith("/rhythm/score")) {
      await route.fulfill({
        status: 200,
        json: { success: true, commitments: [], eventCompletions: [] },
      });
      return;
    }
    await route.fulfill({ status: 200, json: { success: true, settings: {} } });
  });
}

function makeFutureSyntheticEvent() {
  const date = new Date(`${todayISO()}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return {
    id: "synthetic-future-activity",
    title: "Synthetic future activity",
    type: "prayer",
    date: date.toISOString().slice(0, 10),
    repeat: "none",
  };
}

type ReadingApiState = {
  plan: any;
  offline: boolean;
  failFirstCompletion: boolean;
  firstCompletionDelayMs: number;
  completionDelayMs: number;
  completionAttempts: number;
  firstAttemptSettled: boolean;
  activeCompletions: number;
  maxActiveCompletions: number;
  planReads: number;
};

function createApiState(options: Partial<ReadingApiState> = {}): ReadingApiState {
  return {
    plan: makePlan(),
    offline: false,
    failFirstCompletion: false,
    firstCompletionDelayMs: 0,
    completionDelayMs: 0,
    completionAttempts: 0,
    firstAttemptSettled: false,
    activeCompletions: 0,
    maxActiveCompletions: 0,
    planReads: 0,
    ...options,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function stubReadingApi(
  page: Page,
  state: ReadingApiState,
  ownerId = OWNER_ID,
) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (state.offline) {
      await route.abort("failed");
      return;
    }

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
          established: true,
          authenticated: false,
          userId: ownerId,
        }),
      });
      return;
    }

    if (pathname.endsWith("/reading/plans")) {
      if (request.method() === "GET") state.planReads += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          plans: ownerId === OWNER_ID ? [state.plan] : [],
        }),
      });
      return;
    }

    if (pathname.endsWith("/reading/complete") && request.method() === "POST") {
      const attempt = ++state.completionAttempts;
      state.activeCompletions += 1;
      state.maxActiveCompletions = Math.max(
        state.maxActiveCompletions,
        state.activeCompletions,
      );

      try {
        const delayMs =
          attempt === 1 && state.failFirstCompletion
            ? state.firstCompletionDelayMs
            : state.completionDelayMs;
        if (delayMs > 0) await delay(delayMs);

        if (attempt === 1 && state.failFirstCompletion) {
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ success: false }),
          });
          return;
        }

        const payload = request.postDataJSON() as {
          planId: string;
          key: string;
          completed: boolean;
          earnedDay?: string;
          completionDate?: string;
        };
        if (ownerId !== OWNER_ID || payload.planId !== state.plan.id) {
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({ success: false }),
          });
          return;
        }
        state.plan.completed = {
          ...(state.plan.completed || {}),
          [payload.key]: Boolean(payload.completed),
        };
        if (payload.earnedDay && payload.completionDate && payload.completed) {
          state.plan.earnedDayKeys = [
            ...new Set([...(state.plan.earnedDayKeys || []), payload.earnedDay]),
          ];
          state.plan.dayCompletionDates = {
            ...(state.plan.dayCompletionDates || {}),
            [payload.earnedDay]:
              state.plan.dayCompletionDates?.[payload.earnedDay] ||
              payload.completionDate,
          };
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } catch {
        // A refresh can abort an in-flight request; the persisted queue replays it.
      } finally {
        state.activeCompletions -= 1;
        if (attempt === 1 && state.failFirstCompletion) {
          state.firstAttemptSettled = true;
        }
      }
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
        body: JSON.stringify({
          success: true,
          accessTier: "basic",
          eventCompletions: [],
        }),
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
}

async function seedReadingState(page: Page, plan: any) {
  await page.addInitScript(
    ({ ownerId, initialPlan, pendingOpsKey }) => {
      // Init scripts run again on reload; only seed a fresh browser context.
      if (localStorage.getItem("discipleos-data")) return;
      localStorage.setItem(
        "discipleos-data",
        JSON.stringify({
          ownerId,
          events: [],
          plans: [initialPlan],
          eventCompletions: {},
          selectedPlanId: initialPlan.id,
        }),
      );
      localStorage.setItem(
        pendingOpsKey,
        JSON.stringify({ ownerId, ops: [] }),
      );
    },
    { ownerId: OWNER_ID, initialPlan: plan, pendingOpsKey: PENDING_OPS_KEY },
  );
}

async function openToday(page: Page, state: ReadingApiState) {
  await page.goto("/");
  await page.locator(".launch-splash").waitFor({ state: "detached" });
  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  await expect.poll(() => state.planReads).toBeGreaterThan(0);
  await expect(page.getByTestId("first-plan-sync-state")).toHaveCount(0);
}

async function readPendingCount(page: Page) {
  return page.evaluate((key) => {
    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
    return Array.isArray(parsed.ops) ? parsed.ops.length : 0;
  }, PENDING_OPS_KEY);
}

test("a chapter check survives an immediate refresh while its first save is delayed", async ({
  page,
}) => {
  const state = createApiState({
    failFirstCompletion: true,
    firstCompletionDelayMs: 900,
  });
  await stubReadingApi(page, state);
  await seedReadingState(page, state.plan);
  await openToday(page, state);

  const reading = page.getByTestId(`today-reading-${COMPLETION_KEYS[0]}`);
  await expect(reading).toHaveAttribute("aria-pressed", "false");
  await reading.click();
  await expect(reading).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => readPendingCount(page)).toBe(1);
  await expect.poll(() => state.completionAttempts).toBe(1);

  // Reload before the delayed request can succeed. The local queue is already
  // durable, so the next page instance replays it before pulling server plans.
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  await expect(page.getByTestId("first-plan-sync-state")).toHaveCount(0);
  await expect(
    page.getByTestId(`today-reading-${COMPLETION_KEYS[0]}`),
  ).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => state.plan.completed[COMPLETION_KEYS[0]]).toBe(true);
  await expect.poll(() => readPendingCount(page)).toBe(0);
  await expect.poll(() => state.firstAttemptSettled).toBe(true);
});

test("rapid chapter checks reach the server in order without losing either change", async ({
  page,
}) => {
  const state = createApiState({ completionDelayMs: 100 });
  await stubReadingApi(page, state);
  await seedReadingState(page, state.plan);
  await openToday(page, state);

  const firstReading = page.getByTestId(`today-reading-${COMPLETION_KEYS[0]}`);
  const secondReading = page.getByTestId(`today-reading-${COMPLETION_KEYS[1]}`);
  await firstReading.click();
  await secondReading.click();

  await expect(firstReading).toHaveAttribute("aria-pressed", "true");
  await expect(secondReading).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => state.plan.completed[COMPLETION_KEYS[0]]).toBe(true);
  await expect.poll(() => state.plan.completed[COMPLETION_KEYS[1]]).toBe(true);
  await expect.poll(() => readPendingCount(page)).toBe(0);
  expect(state.completionAttempts).toBe(2);
  expect(state.maxActiveCompletions).toBe(1);
});

test("an offline chapter check replays and reconciles after reconnect", async ({ page }) => {
  const state = createApiState();
  await stubReadingApi(page, state);
  await seedReadingState(page, state.plan);
  await openToday(page, state);

  const reading = page.getByTestId(`today-reading-${COMPLETION_KEYS[0]}`);
  state.offline = true;
  await reading.click();
  await expect(reading).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => readPendingCount(page)).toBe(1);
  expect(state.plan.completed[COMPLETION_KEYS[0]]).toBeUndefined();

  state.offline = false;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(() => state.plan.completed[COMPLETION_KEYS[0]]).toBe(true);
  await expect.poll(() => readPendingCount(page)).toBe(0);
  await expect(reading).toHaveAttribute("aria-pressed", "true");
});

test("an offline active-climb reading keeps its date and progress after reconnect and refresh", async ({
  page,
  browser,
}) => {
  const plan = makeActiveClimbPlan();
  const readingKey = plan.assignments[0].readings[0].key;
  const state = createApiState({ plan });
  await stubReadingApi(page, state);
  await seedReadingState(page, plan);
  await openToday(page, state);

  const todayReading = page.getByTestId(`today-reading-${readingKey}`);
  state.offline = true;
  await todayReading.click();
  await expect(todayReading).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => readPendingCount(page)).toBe(1);
  expect(state.plan.completed[readingKey]).toBeUndefined();

  const queuedCompletion = await page.evaluate((key) => {
    const pending = JSON.parse(
      localStorage.getItem("discipleos:pendingOps") || "{}",
    );
    return {
      ownerId: pending.ownerId,
      op: pending.ops?.find((item: any) => item.key === key),
    };
  }, readingKey);
  expect(queuedCompletion).toMatchObject({
    ownerId: OWNER_ID,
    op: {
      type: "chapter-complete",
      planId: plan.id,
      key: readingKey,
      completed: true,
      earnedDay: todayISO(),
      completionDate: todayISO(),
    },
  });

  state.offline = false;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(() => readPendingCount(page)).toBe(0);
  await expect.poll(() => state.plan.completed[readingKey]).toBe(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".launch-splash")).toHaveCount(0);
  await expect(
    page.getByTestId(`today-reading-${readingKey}`),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId(`today-complete-day-${plan.id}`)).toContainText(
    "Day complete",
  );

  const expectedHistory = {
    completed: { [readingKey]: true },
    earnedDayKeys: [todayISO()],
    dayCompletionDates: { [todayISO()]: todayISO() },
  };
  expect(state.plan).toMatchObject(expectedHistory);
  const refreshedData = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("discipleos-data") || "{}"),
  );
  expect(refreshedData.ownerId).toBe(OWNER_ID);
  expect(refreshedData.plans.find((item: any) => item.id === plan.id)).toMatchObject(
    expectedHistory,
  );

  const navigation = page.getByTestId("dashboard-navigation-row");
  await navigation.getByRole("button", { name: "Plans", exact: true }).click();
  const activeClimb = page.getByTestId("dashboard-active-climb");
  await expect(activeClimb).toContainText("14% complete");
  await expect(
    activeClimb.getByTestId(`plan-day-section-${plan.id}-${todayISO()}`),
  ).toContainText("1/1 chapters complete");

  await page
    .getByTestId("dashboard-navigation-row")
    .getByRole("button", { name: "Calendar", exact: true })
    .click();
  await page.getByTestId(`calendar-day-${todayISO()}`).click();
  const calendarPlan = page.getByTestId(`calendar-plan-item-${plan.id}`);
  await expect(calendarPlan).toBeVisible();
  await calendarPlan.getByTestId(`calendar-plan-toggle-${plan.id}`).click();
  await expect(
    calendarPlan.getByTestId(`calendar-plan-readings-${plan.id}`).getByRole("button"),
  ).toHaveAttribute("aria-pressed", "true");

  await page.goto("/mountain-rhythm", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("route-day-1")).toBeVisible();
  await expect(page.getByTestId("route-day-status-1")).toContainText("Complete");

  const otherContext = await browser.newContext();
  try {
    const otherPage = await otherContext.newPage();
    await otherPage.addInitScript((ownerId) => {
      localStorage.setItem(
        "discipleos-data",
        JSON.stringify({
          ownerId,
          plans: [],
          events: [],
          eventCompletions: {},
          selectedPlanId: null,
        }),
      );
      localStorage.setItem(
        "discipleos:pendingOps",
        JSON.stringify({ ownerId, ops: [] }),
      );
    }, OTHER_OWNER_ID);
    await stubReadingApi(otherPage, state, OTHER_OWNER_ID);
    await otherPage.goto("/");
    await otherPage.locator(".launch-splash").waitFor({ state: "detached" });
    await expect(
      otherPage.getByRole("heading", { name: "How would you like to start?" }),
    ).toBeVisible();
    await expect(otherPage.getByTestId(`today-reading-${readingKey}`)).toHaveCount(0);
    const otherOwnerData = await otherPage.evaluate(() =>
      JSON.parse(localStorage.getItem("discipleos-data") || "{}"),
    );
    expect(otherOwnerData.ownerId).toBe(OTHER_OWNER_ID);
    expect(otherOwnerData.plans).toEqual([]);
    expect(state.plan).toMatchObject(expectedHistory);
  } finally {
    await otherContext.close();
  }
});

test("reproduces cross-tab Mountain Rhythm staleness after Home receives an established empty plan list", async ({
  page,
}) => {
  const ownerId = "synthetic-climb-owner";
  const plan = makeFiveOfSevenClimb();
  await page.addInitScript(({ ownerId, plan }) => {
    localStorage.setItem("discipleos-data", JSON.stringify({
      ownerId,
      plans: [plan],
      events: [],
      eventCompletions: {},
      selectedPlanId: plan.id,
    }));
  }, { ownerId, plan });
  await stubAuthenticatedPlanApi(page, ownerId, () => [plan]);

  await page.goto("/mountain-rhythm");
  const journeyMetric = page.getByTestId("mountain-rhythm-metric-journey");
  await expect(journeyMetric).toContainText("71.4%");
  await expect(journeyMetric).toContainText("5 of 7 planned days");
  await expect(page.getByTestId("mountain-rhythm-metric-today")).toContainText("Complete");
  await expect(page.getByTestId("mountain-rhythm-metric-rhythm")).toContainText("40%");

  const homePage = await page.context().newPage();
  try {
    await stubAuthenticatedPlanApi(homePage, ownerId, () => [], () => [makeFutureSyntheticEvent()]);
    await homePage.goto("/");
    await expect(homePage.getByTestId("dashboard-mountain-rhythm-climb"))
      .toContainText("No active climb");
    await expect(homePage.getByTestId("dashboard-mountain-rhythm-progress"))
      .toContainText("Not started");
    await expect(homePage.getByTestId("dashboard-mountain-rhythm-today-status"))
      .toContainText("Not complete");

    await homePage.getByTestId("dashboard-navigation-row")
      .getByRole("button", { name: "Calendar", exact: true })
      .click();
    await expect(homePage.getByText("No activities for this day yet.")).toBeVisible();
    await expect(homePage.locator('[data-testid^="calendar-plan-item-"]')).toHaveCount(0);

    await expect.poll(() => homePage.evaluate(() => {
      const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
      return data.plans?.length || 0;
    })).toBe(0);
    // The already-mounted Mountain Rhythm tab has no storage/focus refresh listener.
    await expect(journeyMetric).toContainText("5 of 7 planned days");
  } finally {
    await homePage.close();
  }
});

test("sequential same-tab navigation remounts Mountain Rhythm against the new empty server snapshot", async ({
  page,
}) => {
  const ownerId = "synthetic-climb-owner";
  const plan = makeFiveOfSevenClimb();
  const futureEvent = makeFutureSyntheticEvent();
  let homeSnapshotObserved = false;
  await page.addInitScript(({ ownerId, plan }) => {
    localStorage.setItem("discipleos-data", JSON.stringify({
      ownerId,
      plans: [plan],
      events: [],
      eventCompletions: {},
      selectedPlanId: plan.id,
    }));
  }, { ownerId, plan });
  await stubAuthenticatedPlanApi(
    page,
    ownerId,
    () => {
      if (new URL(page.url()).pathname === "/") homeSnapshotObserved = true;
      return homeSnapshotObserved ? [] : [plan];
    },
    () => [futureEvent],
  );

  await page.goto("/mountain-rhythm");
  const journeyMetric = page.getByTestId("mountain-rhythm-metric-journey");
  await expect(journeyMetric).toContainText("71.4%");
  await expect(journeyMetric).toContainText("5 of 7 planned days");

  await page.goto("/");
  await expect(page.getByTestId("dashboard-mountain-rhythm-climb"))
    .toContainText("No active climb");
  await page.getByTestId("dashboard-navigation-row")
    .getByRole("button", { name: "Calendar", exact: true })
    .click();
  await expect(page.getByText("No activities for this day yet.")).toBeVisible();
  await expect(page.locator('[data-testid^="calendar-plan-item-"]')).toHaveCount(0);

  await page.goto("/mountain-rhythm");
  await expect(page.getByTestId("route-day-1")).toHaveCount(0);
  await expect(page.getByTestId("mountain-rhythm-metric-journey")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
    return data.plans?.length || 0;
  })).toBe(0);
});

test("same-owner plan snapshot keeps Mountain Rhythm, Home, and the selected Calendar day aligned", async ({
  page,
}) => {
  const ownerId = "synthetic-climb-owner";
  const plan = makeFiveOfSevenClimb();
  await page.addInitScript(({ ownerId, plan }) => {
    localStorage.setItem("discipleos-data", JSON.stringify({
      ownerId,
      plans: [plan],
      events: [],
      eventCompletions: {},
      selectedPlanId: plan.id,
    }));
  }, { ownerId, plan });
  await stubAuthenticatedPlanApi(page, ownerId, () => [plan]);

  await page.goto("/mountain-rhythm");
  await expect(page.getByTestId("mountain-rhythm-metric-journey"))
    .toContainText("5 of 7 planned days");
  await expect(page.getByTestId("mountain-rhythm-metric-today")).toContainText("Complete");

  await page.goto("/");
  await expect(page.getByTestId("dashboard-mountain-rhythm-climb"))
    .toContainText("7-Day Climb");
  await expect(page.getByTestId("dashboard-mountain-rhythm-progress"))
    .toContainText("71.4%");
  await expect(page.getByTestId("dashboard-mountain-rhythm-today-status"))
    .toContainText("Complete");

  await page.getByTestId("dashboard-navigation-row")
    .getByRole("button", { name: "Calendar", exact: true })
    .click();
  await page.getByTestId(`calendar-day-${todayISO()}`).click();
  await expect(page.getByTestId(`calendar-plan-item-${plan.id}`)).toBeVisible();
  await expect(page.getByTestId("calendar-items-list"))
    .toContainText("Synthetic reading 5");

  await page.goto("/mountain-rhythm");
  await expect(page.getByTestId("mountain-rhythm-metric-journey"))
    .toContainText("5 of 7 planned days");
  await expect(page.getByTestId("mountain-rhythm-metric-today")).toContainText("Complete");
});
