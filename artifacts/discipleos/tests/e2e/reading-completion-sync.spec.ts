import { expect, test, type Page } from "@playwright/test";

const OWNER_ID = "reading-sync-owner";
const PLAN_ID = "reading-sync-plan";
const PENDING_OPS_KEY = "discipleos:pendingOps";
const COMPLETION_KEYS = ["today-psalm-1", "today-psalm-2"];

test.use({ timezoneId: "UTC" });

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

type ReadingApiState = {
  plan: ReturnType<typeof makePlan>;
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

async function stubReadingApi(page: Page, state: ReadingApiState) {
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
          userId: OWNER_ID,
        }),
      });
      return;
    }

    if (pathname.endsWith("/reading/plans")) {
      if (request.method() === "GET") state.planReads += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, plans: [state.plan] }),
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
          key: string;
          completed: boolean;
        };
        state.plan.completed = {
          ...(state.plan.completed || {}),
          [payload.key]: Boolean(payload.completed),
        };
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

async function seedReadingState(page: Page, plan: ReturnType<typeof makePlan>) {
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
