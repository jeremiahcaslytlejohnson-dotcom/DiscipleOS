import { expect, test, type Page } from "@playwright/test";

const OWNER_ID = "synthetic-anonymous-owner";
const STORAGE_KEY = "discipleos-data";
const LOCAL_ONLY_KEY = "discipleos:local-only-after-signout";
const PENDING_OPS_KEY = "discipleos:pendingOps";

test.use({ timezoneId: "UTC" });

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function makeFutureActivity() {
  const date = new Date(`${todayISO()}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return {
    id: "synthetic-anonymous-future-prayer",
    title: "Synthetic future prayer",
    type: "prayer",
    date: date.toISOString().slice(0, 10),
    repeat: "none",
  };
}

function makeFiveOfSevenClimb() {
  const today = todayISO();
  const shift = (days: number) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const assignments = Array.from({ length: 7 }, (_, index) => ({
    date: shift(index - 4),
    readings: [{
      key: `anon-climb-day-${index + 1}`,
      label: `Anonymous climb reading ${index + 1}`,
      book: "Psalms",
      chapter: index + 1,
      estimatedMinutes: 5,
    }],
  }));
  const earnedDayKeys = assignments.slice(0, 5).map(({ date }) => date);
  return {
    id: "synthetic-anonymous-seven-day",
    name: "7-Day Climb",
    journeyKey: "7-day-climb",
    journeyType: "7-day-climb",
    journeyDays: 7,
    selectedBooks: ["Psalms"],
    startDate: shift(-4),
    endDate: shift(2),
    durationDays: 7,
    totalDays: 7,
    dailyMinutes: 15,
    readingTime: "07:00",
    readingMode: "consecutive",
    color: "from-[#D4A017] to-[#8A6414]",
    assignments,
    completed: Object.fromEntries(
      assignments.slice(0, 5).map(({ readings }) => [readings[0].key, true]),
    ),
    earnedDayKeys,
    dayCompletionDates: Object.fromEntries(earnedDayKeys.map((date) => [date, date])),
  };
}

async function seedLocalClimb(
  page: Page,
  plan: ReturnType<typeof makeFiveOfSevenClimb>,
  ownerId: string | null = OWNER_ID,
  localOnly = false,
  withPendingWrite = false,
) {
  await page.addInitScript(
    ({ storageKey, localOnlyKey, pendingOpsKey, plan, ownerId, localOnly, withPendingWrite }) => {
      localStorage.setItem(storageKey, JSON.stringify({
        ownerId,
        plans: [plan],
        events: [],
        eventCompletions: {},
        selectedPlanId: plan.id,
      }));
      localStorage.setItem(pendingOpsKey, JSON.stringify({
        ownerId,
        ops: withPendingWrite
          ? [{ type: "upsert-plan", payload: plan, ts: 1 }]
          : [],
      }));
      if (localOnly) localStorage.setItem(localOnlyKey, "true");
      else localStorage.removeItem(localOnlyKey);
    },
    {
      storageKey: STORAGE_KEY,
      localOnlyKey: LOCAL_ONLY_KEY,
      pendingOpsKey: PENDING_OPS_KEY,
      plan,
      ownerId,
      localOnly,
      withPendingWrite,
    },
  );
}

function makeOrdinaryPlan(id: string, name: string, date = todayISO(), completed = false) {
  const reading = {
    key: `${id}-reading`,
    label: `${name} reading`,
    book: "Psalms",
    chapter: 1,
  };
  return {
    id,
    name,
    selectedBooks: ["Psalms"],
    startDate: date,
    endDate: date,
    assignments: [{ date, readings: [reading] }],
    completed: completed ? { [reading.key]: true } : {},
  };
}

async function seedLocalPlans(page: Page, plans: any[], selectedPlanId = plans[0]?.id) {
  await page.addInitScript(
    ({ plans, selectedPlanId }) => {
      localStorage.setItem("discipleos-data", JSON.stringify({
        ownerId: "synthetic-anonymous-owner",
        plans,
        events: [],
        eventCompletions: {},
        selectedPlanId,
      }));
      localStorage.setItem("discipleos:pendingOps", JSON.stringify({
        ownerId: "synthetic-anonymous-owner",
        ops: [],
      }));
      localStorage.removeItem("discipleos:local-only-after-signout");
    },
    { plans, selectedPlanId },
  );
}

async function stubAnonymousApi(
  page: Page,
  options: {
    ownerId?: string;
    established?: boolean;
    getPlans?: () => any[];
    events?: any[];
    sessionStatus?: number;
  } = {},
) {
  const {
    ownerId = OWNER_ID,
    established = false,
    getPlans = () => [],
    events = [makeFutureActivity()],
    sessionStatus = 200,
  } = options;
  const requests = { claims: 0, planWrites: 0 };
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/auth/me")) {
      await route.fulfill({ status: 200, json: { authenticated: false } });
    } else if (path.endsWith("/session/info")) {
      await route.fulfill({
        status: sessionStatus,
        json: {
          authenticated: false,
          userId: ownerId,
          established,
          capabilities: { mountainRhythm: "full", namedJourneys: true },
        },
      });
    } else if (path.endsWith("/account/claim")) {
      requests.claims += 1;
      await route.fulfill({ status: 409, json: { success: false } });
    } else if (path.endsWith("/reading/plans") && request.method() === "GET") {
      await route.fulfill({ status: 200, json: { success: true, plans: getPlans() } });
    } else if (path.endsWith("/reading/plans") && request.method() === "POST") {
      requests.planWrites += 1;
      await route.fulfill({ status: 200, json: { success: true } });
    } else if (path.endsWith("/events")) {
      await route.fulfill({ status: 200, json: { success: true, events } });
    } else if (path.endsWith("/rhythm/score")) {
      await route.fulfill({
        status: 200,
        json: { success: true, commitments: [], eventCompletions: [] },
      });
    } else if (path.endsWith("/settings")) {
      await route.fulfill({ status: 200, json: { success: true, settings: {} } });
    } else {
      await route.fulfill({ status: 200, json: { success: true } });
    }
  });
  return requests;
}

async function openTodayProgress(page: Page) {
  const toggle = page.getByTestId("dashboard-progress")
    .getByRole("button", { name: /^Progress/ });
  if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
}

async function expectClimbOnHome(page: Page, planId: string) {
  await openTodayProgress(page);
  await expect(page.getByTestId("dashboard-progress-plan-choices")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-progress-detail"))
    .toHaveAttribute("data-plan-id", planId);
  await expect(page.getByTestId("dashboard-progress-selected-plan"))
    .toContainText("Rhythm · 7-Day Climb");
  await expect(page.getByTestId(`today-complete-day-${planId}`))
    .toContainText("Day complete");
  await expect(page.getByTestId("dashboard-progress-percent")).toContainText("71.4%");
  await expect(page.getByTestId("dashboard-progress-detail")).not.toContainText("5 of 7 planned days");
  await expect(page.getByTestId("dashboard-progress-detail")).not.toContainText("Today’s climb complete");
  await expect(page.getByTestId("dashboard-progress-next-reading"))
    .toContainText(/Next reading · [A-Z][a-z]{2} \d{1,2}, \d{4}/);
  await expect(page.getByTestId("dashboard-progress-next-reading"))
    .not.toContainText(/\d{4}-\d{2}-\d{2}/);
  await page.getByTestId("dashboard-navigation-row")
    .getByRole("button", { name: "Plans", exact: true }).click();
  await expect(page.getByTestId("dashboard-active-climb"))
    .toContainText(planId === "synthetic-anonymous-seven-day" ? "7-Day Climb" : planId);
}

test("anonymous owner with unestablished empty API keeps 5/7 aligned on same-tab navigation", async ({
  page,
}) => {
  const plan = makeFiveOfSevenClimb();
  await seedLocalClimb(page, plan);
  const requests = await stubAnonymousApi(page, { ownerId: OWNER_ID, established: false });

  await page.goto("/mountain-rhythm");
  await expect(page.getByTestId("mountain-rhythm-metric-journey"))
    .toContainText("5 of 7 planned days");
  await expect(page.getByTestId("mountain-rhythm-metric-today")).toContainText("Complete");

  await page.goto("/");
  await expectClimbOnHome(page, plan.id);
  await page.getByTestId("dashboard-navigation-row")
    .getByRole("button", { name: "Calendar", exact: true }).click();
  await page.getByTestId(`calendar-day-${todayISO()}`).click();
  await expect(page.getByTestId(`calendar-plan-item-${plan.id}`)).toBeVisible();
  await expect(page.getByTestId("calendar-items-list"))
    .toContainText("Anonymous climb reading 5");

  await page.goto("/mountain-rhythm");
  await expect(page.getByTestId("mountain-rhythm-metric-journey"))
    .toContainText("5 of 7 planned days");
  expect(requests).toEqual({ claims: 0, planWrites: 0 });
});

test("local-only-after-signout keeps an owner-verified climb aligned across tabs without syncing it", async ({
  page,
}) => {
  const plan = makeFiveOfSevenClimb();
  await seedLocalClimb(page, plan, OWNER_ID, true);
  const mountainRequests = await stubAnonymousApi(page, { ownerId: OWNER_ID, established: false });
  await page.goto("/mountain-rhythm");
  await expect(page.getByTestId("mountain-rhythm-metric-journey"))
    .toContainText("5 of 7 planned days");

  const home = await page.context().newPage();
  try {
    const homeRequests = await stubAnonymousApi(home, { ownerId: OWNER_ID, established: false });
    await home.goto("/");
    await expectClimbOnHome(home, plan.id);
    await home.getByTestId("dashboard-navigation-row")
      .getByRole("button", { name: "Calendar", exact: true }).click();
    await home.getByTestId(`calendar-day-${todayISO()}`).click();
    await expect(home.getByTestId(`calendar-plan-item-${plan.id}`)).toBeVisible();
    await expect.poll(() => home.evaluate(() => {
      const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
      return data.plans?.length || 0;
    })).toBe(1);
    await expect(page.getByTestId("mountain-rhythm-metric-journey"))
      .toContainText("5 of 7 planned days");
    expect(mountainRequests).toEqual({ claims: 0, planWrites: 0 });
    expect(homeRequests).toEqual({ claims: 0, planWrites: 0 });
  } finally {
    await home.close();
  }
});

for (const ownerId of [null, "previous-anonymous-owner"]) {
  test(`anonymous owner mismatch (${ownerId ?? "missing marker"}) keeps local cache private and intact`, async ({
    page,
  }) => {
    const plan = makeFiveOfSevenClimb();
    await seedLocalClimb(page, plan, ownerId, false, true);
    const requests = await stubAnonymousApi(page, { ownerId: OWNER_ID, established: false });
    await page.goto("/");
    await openTodayProgress(page);
    await expect(page.getByTestId("dashboard-progress-empty")).toBeVisible();
    await expect(page.getByTestId("dashboard-progress-plan-choices")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
      const pending = JSON.parse(localStorage.getItem("discipleos:pendingOps") || "{}");
      return {
        ownerId: data.ownerId,
        planId: data.plans?.[0]?.id || null,
        pendingOwner: pending.ownerId,
        pendingCount: pending.ops?.length || 0,
      };
    })).toEqual({
      ownerId,
      planId: plan.id,
      pendingOwner: ownerId,
      pendingCount: 1,
    });
    expect(requests).toEqual({ claims: 0, planWrites: 0 });
    await page.goto("/mountain-rhythm");
    await expect(page.getByTestId("mountain-rhythm-metric-journey")).toHaveCount(0);
    await expect(page.getByTestId("route-day-1")).toHaveCount(0);
  });
}

test("established empty anonymous API preserves a matching owner-bound local climb", async ({
  page,
}) => {
  const plan = makeFiveOfSevenClimb();
  await seedLocalClimb(page, plan);
  const mountainRequests = await stubAnonymousApi(page, {
    ownerId: OWNER_ID,
    established: true,
    getPlans: () => [plan],
  });
  await page.goto("/mountain-rhythm");
  await expect(page.getByTestId("mountain-rhythm-metric-journey"))
    .toContainText("5 of 7 planned days");
  const home = await page.context().newPage();
  try {
    const homeRequests = await stubAnonymousApi(home, { ownerId: OWNER_ID, established: true });
    await home.goto("/");
    await expectClimbOnHome(home, plan.id);
    await home.getByTestId("dashboard-navigation-row")
    .getByRole("button", { name: "Calendar", exact: true }).click();
    await home.getByTestId(`calendar-day-${todayISO()}`).click();
    await expect(home.getByTestId(`calendar-plan-item-${plan.id}`)).toBeVisible();
    await expect.poll(() => home.evaluate(() => {
      const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
      return data.plans?.length || 0;
    })).toBe(1);
    await page.goto("/mountain-rhythm");
    await expect(page.getByTestId("mountain-rhythm-metric-journey"))
      .toContainText("5 of 7 planned days");
    expect(mountainRequests).toEqual({ claims: 0, planWrites: 0 });
    expect(homeRequests).toEqual({ claims: 0, planWrites: 0 });
  } finally {
    await home.close();
  }
});

test("Today progress selects one saved plan without changing readings, Calendar, or storage", async ({
  page,
}) => {
  const guided = {
    ...makeOrdinaryPlan("synthetic-guided", "Discover Scripture"),
    guidedClimb: { series: "Guided Climb", set: 1, slug: "find-your-footing" },
  };
  const freeOne = makeOrdinaryPlan("synthetic-free-one", "Morning Psalms");
  const freeTwo = makeOrdinaryPlan(
    "synthetic-free-two",
    "Evening Wisdom and Psalms for Busy Weeks",
  );
  const mountain = makeFiveOfSevenClimb();
  const plans = [guided, freeOne, freeTwo, mountain];
  await seedLocalPlans(page, plans, guided.id);
  const requests = await stubAnonymousApi(page, { ownerId: OWNER_ID, established: false });

  await page.goto("/");
  await openTodayProgress(page);
  const choices = page.getByTestId("dashboard-progress-plan-choices");
  await expect(choices).toHaveAttribute("role", "group");
  const guidedChoice = page.getByTestId(`dashboard-progress-choice-${guided.id}`);
  const freeOneChoice = page.getByTestId(`dashboard-progress-choice-${freeOne.id}`);
  const freeTwoChoice = page.getByTestId(`dashboard-progress-choice-${freeTwo.id}`);
  const mountainChoice = page.getByTestId(`dashboard-progress-choice-${mountain.id}`);
  await expect(guidedChoice).toContainText("Guided · Discover Scripture");
  await expect(freeOneChoice).toContainText("Free · Morning Psalms");
  await expect(freeTwoChoice)
    .toContainText("Free · Evening Wisdom and Psalms for Busy Weeks");
  await expect(mountainChoice).toContainText("Rhythm · 7-Day Climb");
  await expect(choices.getByRole("button", { name: "Free · Morning Psalms" })).toBeVisible();
  await expect(choices.getByRole("button", { name: /^Free · Evening Wisdom/ })).toBeVisible();
  await expect(guidedChoice).toHaveAttribute("aria-pressed", "true");
  await expect(choices.locator('button[aria-pressed="true"]')).toHaveCount(1);
  await expect(page.getByTestId("dashboard-progress-detail")).toHaveCount(1);
  await expect(page.getByTestId("dashboard-progress-selected-plan")).toHaveCount(0);
  await expect(page.getByTestId(`today-reading-${guided.id}-reading`)).toBeVisible();
  await expect(page.getByTestId(`today-reading-${freeOne.id}-reading`)).toBeVisible();
  await expect(page.getByTestId(`today-reading-${freeTwo.id}-reading`)).toBeVisible();
  await expect(page.getByTestId("today-reading-anon-climb-day-5")).toBeVisible();

  await expect.poll(() => page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
    return data.plans?.length || 0;
  })).toBe(4);
  const before = await page.evaluate(() => ({
    data: localStorage.getItem("discipleos-data"),
    pending: localStorage.getItem("discipleos:pendingOps"),
  }));
  for (const plan of [freeOne, freeTwo, mountain]) {
    const choice = page.getByTestId(`dashboard-progress-choice-${plan.id}`);
    await choice.click();
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await expect(choices.locator('button[aria-pressed="true"]')).toHaveCount(1);
    await expect(page.getByTestId("dashboard-progress-detail")).toHaveCount(1);
    await expect(page.getByTestId("dashboard-progress-detail"))
      .toHaveAttribute("data-plan-id", plan.id);
  }
  const after = await page.evaluate(() => ({
    data: localStorage.getItem("discipleos-data"),
    pending: localStorage.getItem("discipleos:pendingOps"),
  }));
  expect(after).toEqual(before);
  expect(requests).toEqual({ claims: 0, planWrites: 0 });
  for (const plan of plans) {
    if (plan === mountain) {
      await expect(page.getByTestId("today-reading-anon-climb-day-5")).toBeVisible();
    } else {
      await expect(page.getByTestId(`today-reading-${plan.id}-reading`)).toBeVisible();
    }
  }
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(layout.document).toBeLessThanOrEqual(layout.viewport + 1);
    const choicesBox = await choices.boundingBox();
    expect(choicesBox).not.toBeNull();
    for (const choice of [guidedChoice, freeOneChoice, freeTwoChoice, mountainChoice]) {
      const box = await choice.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(choicesBox!.x - 1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(choicesBox!.x + choicesBox!.width + 1);
    }
    if (width === 320) {
      const wrappedChoiceBox = await freeTwoChoice.boundingBox();
      expect(wrappedChoiceBox?.height).toBeGreaterThan(44);
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.getByTestId("dashboard-navigation-row")
    .getByRole("button", { name: "Plans", exact: true }).click();
  await expect(page.getByTestId("dashboard-plan-details")).toContainText("Discover Scripture");

  await page.getByTestId("dashboard-navigation-row")
    .getByRole("button", { name: "Calendar", exact: true }).click();
  await page.getByTestId(`calendar-day-${todayISO()}`).click();
  for (const plan of plans) {
    await expect(page.getByTestId(`calendar-plan-item-${plan.id}`)).toBeVisible();
  }

  await page.goto("/mountain-rhythm");
  await expect(page.getByTestId("mountain-rhythm-metric-journey"))
    .toContainText("5 of 7 planned days");
});

test("Today progress omits completed plans and shows an empty state when all are complete", async ({
  page,
}) => {
  const active = makeOrdinaryPlan("synthetic-only-active", "Current Free Plan");
  const completed = makeOrdinaryPlan("synthetic-complete", "Finished Plan", todayISO(), true);
  await seedLocalPlans(page, [active, completed], completed.id);
  await stubAnonymousApi(page, { ownerId: OWNER_ID, established: false });
  await page.goto("/");

  await openTodayProgress(page);
  await expect(page.getByTestId("dashboard-progress-plan-choices")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-progress-selected-plan"))
    .toHaveText("Free · Current Free Plan");
  await expect(page.getByTestId("dashboard-progress-detail")).toHaveAttribute(
    "data-plan-id",
    active.id,
  );
  await expect(page.getByTestId("dashboard-progress-detail"))
    .toHaveAttribute("data-plan-id", active.id);
  await expect(page.getByTestId("dashboard-progress-detail")).not.toContainText(completed.name);
});

test("Today progress shows no plan choices when all saved plans are complete", async ({ page }) => {
  const completeOne = makeOrdinaryPlan("synthetic-complete-one", "Finished Psalms", todayISO(), true);
  const completeTwo = makeOrdinaryPlan("synthetic-complete-two", "Finished Proverbs", todayISO(), true);
  await seedLocalPlans(page, [completeOne, completeTwo], completeOne.id);
  await stubAnonymousApi(page, { ownerId: OWNER_ID, established: false });
  await page.goto("/");

  await openTodayProgress(page);
  await expect(page.getByTestId("dashboard-progress-empty")).toBeVisible();
  await expect(page.getByTestId("dashboard-progress-plan-choices")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-progress-detail")).toHaveCount(0);
});
