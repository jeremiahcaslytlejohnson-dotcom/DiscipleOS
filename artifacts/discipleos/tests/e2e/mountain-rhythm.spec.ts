import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "discipleos-data";

type PlanOptions = {
  id: string;
  days: 7 | 20;
  name: string;
  today: string;
  startOffset?: number;
  completedIndexes?: number[];
  earnedDayIndexes?: number[];
};

function addDays(dateISO: string, amount: number) {
  const date = new Date(`${dateISO}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function makePlan({
  id,
  days,
  name,
  today,
  startOffset = 0,
  completedIndexes = [],
  earnedDayIndexes = completedIndexes,
}: PlanOptions) {
  const startDate = addDays(today, startOffset);
  const completed = Object.fromEntries(
    completedIndexes.flatMap((dayIndex) => [
      [`${id}-${dayIndex}-a`, true],
      [`${id}-${dayIndex}-b`, true],
    ]),
  );

  return {
    id,
    name,
    journeyKey: days === 7 ? "7-day-climb" : "20-day-reset",
    journeyType: days === 7 ? "7-day-climb" : "20-day-reset",
    journeyDays: days,
    durationDays: days,
    totalDays: days,
    startDate,
    endDate: addDays(startDate, days - 1),
    assignments: Array.from({ length: days }, (_, dayIndex) => ({
      date: addDays(startDate, dayIndex),
      readings: [
        { key: `${id}-${dayIndex}-a`, label: `Reading ${dayIndex + 1}A` },
        { key: `${id}-${dayIndex}-b`, label: `Reading ${dayIndex + 1}B` },
      ],
    })),
    completed,
    earnedDayKeys: earnedDayIndexes.map((dayIndex) => addDays(startDate, dayIndex)),
  };
}

async function stubApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname.endsWith("/session/info")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, established: false }),
      });
      return;
    }

    if (pathname.endsWith("/reading/plans")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, plans: [] }),
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

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
}

async function stubAuthenticatedApi(
  page: Page,
  ordinaryPlan: unknown,
  initialPlans: any[] = [],
  options: { stripCompletionHistoryOnRead?: boolean } = {},
) {
  let serverPlans: any[] = [...initialPlans];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname.endsWith("/session/info")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          userId: "authenticated-mountain-user",
          authenticated: true,
          established: true,
          capabilities: { mountainRhythm: "full", namedJourneys: true },
        }),
      });
      return;
    }

    if (pathname.endsWith("/account/claim")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          claimed: { events: 0, plans: 0, subscriptions: 0 },
        }),
      });
      return;
    }

    if (pathname.endsWith("/reading/plans")) {
      if (request.method() === "POST") {
        const plan = request.postDataJSON();
        serverPlans = [
          ...serverPlans.filter((existing) => existing.id !== plan.id),
          { ...plan, updatedAt: "2026-08-30T12:00:00.000Z" },
        ];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, plan }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          // This unrelated plan is intentionally returned first and is newer
          // to prove hydration honors the saved structured climb.
          plans: [
            ordinaryPlan,
            ...serverPlans.map((plan) => {
              if (!options.stripCompletionHistoryOnRead) return plan;
              const { earnedDayKeys, dayCompletionDates, ...withoutHistory } = plan;
              return withoutHistory;
            }),
          ],
        }),
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

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
}

async function seedLocalData(page: Page, plans: unknown[], selectedPlanId: string | null) {
  await page.addInitScript(
    ({ plans: seededPlans, selectedId }) => {
      if (localStorage.getItem("discipleos-seed-applied") === "true") return;
      localStorage.setItem(
        "discipleos-data",
        JSON.stringify({
          ownerId: null,
          plans: seededPlans,
          events: [],
          eventCompletions: {},
          selectedPlanId: selectedId,
        }),
      );
      localStorage.setItem("discipleos-seed-applied", "true");
    },
    { plans, selectedId: selectedPlanId },
  );
}

async function openMountainRhythm(page: Page) {
  await page.goto("/mountain-rhythm");
  await expect(
    page.getByRole("heading", { name: "Mountain Rhythm", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("button-choose-7-day-climb")).toBeVisible();
}

async function expectDistinctMountainMetrics(page: Page, journeyLabel: string) {
  const mountainPanel = page.getByTestId("mountain-rhythm-panel");
  await expect(
    page.getByText(`${journeyLabel} · active reading climb`, { exact: true }),
  ).toBeVisible();
  await expect(mountainPanel.getByTestId("mountain-rhythm-metric-today")).toContainText(
    "Today’s reading",
  );
  await expect(mountainPanel.getByTestId("mountain-rhythm-metric-journey")).toContainText(
    "Journey progress",
  );
  await expect(mountainPanel.getByTestId("mountain-rhythm-metric-journey")).toContainText(
    "planned days",
  );
  await expect(mountainPanel.getByTestId("mountain-rhythm-metric-elevation")).toHaveCount(0);
  await expect(mountainPanel.getByTestId("mountain-rhythm-metric-rhythm")).toContainText(
    "Recent rhythm",
  );
  await expect(mountainPanel.getByTestId("mountain-rhythm-metric-rhythm")).toContainText(
    "consistency",
  );
  await expect(mountainPanel.getByText("Day progress", { exact: true })).toHaveCount(0);
  await expect(mountainPanel.getByText("Current level", { exact: true })).toHaveCount(0);
  await expect(mountainPanel.getByText("Today's status", { exact: true })).toHaveCount(0);
  await expect(mountainPanel.getByTestId("mountain-rhythm-mountain")).toBeVisible();
  await expect(
    mountainPanel.getByRole("img", {
      name: new RegExp(`${journeyLabel} mountain showing`),
    }),
  ).toBeVisible();
  await expect(page.getByTestId("mountain-rhythm-milestones")).toContainText(
    "Milestones",
  );
  await expect(page.getByTestId("mountain-rhythm-milestones")).toContainText(
    "Basecamp",
  );
  await expect(mountainPanel.getByTestId("mountain-rhythm-milestone-line")).toContainText(
    "Current:",
  );
  await expect(mountainPanel.getByTestId("mountain-rhythm-milestone-line")).not.toContainText(
    "days earned",
  );
  await expect(page.getByText("Next elevation", { exact: true })).toHaveCount(0);
}

for (const route of [
  { kind: "7-day-climb", label: "7-Day Climb" },
] as const) {
  test(`identifies the selected ${route.label} route`, async ({ page }) => {
    await stubApi(page);
    await seedLocalData(page, [], null);
    await openMountainRhythm(page);

    await page.getByTestId(`button-choose-${route.kind}`).click();
    await expectDistinctMountainMetrics(page, route.label);
    await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText(
      "0 of 7 planned days",
    );
    await expect(page.getByTestId(`button-choose-${route.kind}`)).toContainText(
      `${route.label} · In Progress`,
    );
    await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText(
      "0 of 7 planned days",
    );
    await expect(
      page.getByTestId("button-choose-20-day-reset"),
    ).toContainText("Locked");
  });
}

test("keeps the 20-Day Reset locked", async ({ page }) => {
  await stubApi(page);
  await seedLocalData(page, [], null);
  await openMountainRhythm(page);

  const resetChoice = page.getByTestId("button-choose-20-day-reset");
  await expect(resetChoice).toBeDisabled();
  await expect(resetChoice).toContainText("Locked");
  await expect(page.getByTestId("dialog-confirm-20-day-reset")).toHaveCount(0);
});

test("automatically enters a new user on the free 7-Day Climb", async ({ page }) => {
  await stubApi(page);
  await seedLocalData(page, [], null);
  const saveRequest = page.waitForRequest(
    (request) =>
      request.url().includes("/api/reading/plans") && request.method() === "POST",
  );
  await openMountainRhythm(page);

  await expect(page.getByText("7-Day Climb · active reading climb", { exact: true })).toBeVisible();
  await expect(page.getByTestId("button-choose-7-day-climb")).toContainText("7-Day Climb · In Progress");

  const savedPlan = (await saveRequest).postDataJSON();
    expect(savedPlan.selectedBooks).toEqual(["Genesis"]);
  expect(savedPlan.assignments).toHaveLength(7);
  const chapterCounts = savedPlan.assignments.map((day: any) => day.readings.length);
  const totalScheduledChapters = savedPlan.assignments.flatMap((day: any) => day.readings).length;
  expect(chapterCounts.every((count: number) => count > 0)).toBe(true);
  expect(totalScheduledChapters).toBeGreaterThan(0);
  expect(totalScheduledChapters).toBeLessThan(150);
  expect(Math.max(...savedPlan.assignments.map((day: any) => day.estimatedMinutes))).toBeLessThanOrEqual(
    savedPlan.dailyMinutes,
  );
});

test("plots each 7-Day Climb day as a separate ascent point", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const plan = makePlan({
    id: "point-by-point-climb",
    days: 7,
    name: "7-Day Climb",
    today,
    startOffset: -2,
    completedIndexes: [2],
  });

  await stubApi(page);
  await seedLocalData(page, [plan], plan.id);
  await openMountainRhythm(page);

  const chart = page.getByTestId("mountain-rhythm-mountain");
  const pointY = await chart.locator('[data-testid^="mountain-rhythm-day-point-"]').evaluateAll(
    (points) => points.map((point) => Number(point.getAttribute("cy"))),
  );
  expect(pointY).toHaveLength(7);
  expect(pointY[0]).toBe(pointY[1]);
  expect(pointY[2]).toBeLessThan(pointY[1]);
  await expect(chart.getByTestId("mountain-rhythm-day-labels").locator("text")).toHaveCount(7);
});

test("keeps the chart at Basecamp when every reading is unchecked", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const plan = makePlan({
    id: "stale-earned-history",
    days: 7,
    name: "7-Day Climb",
    today,
    completedIndexes: [],
  });
  const firstDay = plan.assignments[0].date;
  plan.earnedDayKeys = [firstDay];
  plan.dayCompletionDates = { [firstDay]: firstDay };

  await stubApi(page);
  await seedLocalData(page, [plan], plan.id);
  await openMountainRhythm(page);

  const pointY = await page
    .getByTestId("mountain-rhythm-mountain")
    .locator('[data-testid^="mountain-rhythm-day-point-"]')
    .evaluateAll((points) =>
      points.map((point) => Number(point.getAttribute("cy"))),
    );
  expect(pointY).toHaveLength(7);
  expect(new Set(pointY)).toEqual(new Set([236]));
  await expect(page.getByTestId("mountain-rhythm-milestone-line")).toContainText(
    "Current: Basecamp",
  );
});

test("repairs an oversized saved 7-Day Climb schedule", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const malformedPlan = {
    id: "malformed-seven-day",
    name: "7-Day Climb",
    journeyKey: "7-day-climb",
    journeyType: "7-day-climb",
    journeyDays: 7,
    durationDays: 7,
    totalDays: 7,
    selectedBooks: ["Genesis"],
    startDate: today,
    endDate: addDays(today, 6),
    assignments: Array.from({ length: 7 }, (_, dayIndex) => ({
      date: addDays(today, dayIndex),
      readings: Array.from({ length: dayIndex === 0 ? 38 : 37 }, (_, readingIndex) => ({
        key: `Genesis-${dayIndex}-${readingIndex}`,
        label: `Genesis ${dayIndex * 37 + readingIndex + 1}`,
      })),
    })),
    completed: {
      "Genesis-1": true,
      "Genesis-50": true,
    },
  };

  await stubApi(page);
  await seedLocalData(page, [malformedPlan], malformedPlan.id);
  await openMountainRhythm(page);

  await expect.poll(async () => page.evaluate(() => {
    const parsed = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
    const plan = parsed.plans?.find((item: any) => item.id === "malformed-seven-day");
    return {
      assignmentCount: plan?.assignments?.length || 0,
      readingCount: plan?.assignments?.flatMap((day: any) => day.readings || []).length || 0,
      chapterCounts: plan?.assignments?.map((day: any) => day.readings?.length || 0) || [],
      preservedCompletion: Boolean(plan?.completed?.["Genesis-1"]),
    };
  })).toEqual({
    assignmentCount: 7,
    readingCount: 50,
    chapterCounts: [8, 7, 7, 7, 7, 7, 7],
    preservedCompletion: true,
  });
});

test("does not offer a locked 20-Day Reset after the 7-Day Climb", async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    const completed = makePlan({
      id: "completed-7-day-climb",
      days: 7,
      name: "7-Day Climb",
      today,
      completedIndexes: Array.from({ length: 7 }, (_, index) => index),
    });

    await stubApi(page);
    await seedLocalData(page, [completed], completed.id);
    await openMountainRhythm(page);

    await expect(page.getByTestId("mountain-rhythm-complete")).toContainText("7-Day Climb complete");
    await expect(page.getByTestId("completed-climb-7-day-climb")).toContainText("100% journey progress");
    await expect(page.getByTestId("button-start-next-20-day-reset")).toHaveCount(0);
    await expect(page.getByTestId("button-choose-20-day-reset")).toBeDisabled();
    await expect(page.getByTestId("button-choose-20-day-reset")).toContainText("Locked");
});

test("keeps the unreleased 40-Day Climb unavailable", async ({ page }) => {
  await stubApi(page);
  await seedLocalData(page, [], null);
  await openMountainRhythm(page);

  const fortyDayChoice = page.getByTestId("button-choose-40-day-climb");
  await expect(fortyDayChoice).toBeDisabled();
  await expect(fortyDayChoice).toContainText("Coming Later");
});

test("keeps Mountain Rhythm sections inside shared responsive gutters", async ({ page }) => {
  await stubApi(page);
  await seedLocalData(page, [], null);

  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await openMountainRhythm(page);
    await expect(page.getByTestId("mountain-rhythm-route")).toBeVisible();
    await expect(page.getByTestId("mountain-rhythm-milestones")).toBeVisible();

    const layout = await page.evaluate(() => {
      const testIds = [
        "mountain-rhythm-panel",
        "mountain-rhythm-choose",
        "mountain-rhythm-route",
        "mountain-rhythm-milestones",
      ];
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        surfaces: testIds.map((testId) => {
          const element = document.querySelector(`[data-testid="${testId}"]`);
          const rect = element?.getBoundingClientRect();
          return {
            testId,
            left: rect ? Math.round(rect.left) : -1,
            right: rect ? Math.round(rect.right) : Infinity,
          };
        }),
      };
    });

    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    for (const surface of layout.surfaces) {
      expect(surface.left).toBeGreaterThanOrEqual(12);
      expect(surface.right).toBeLessThanOrEqual(width - 12);
    }
  }
});

for (const route of [
  { kind: "7-day-climb", label: "7-Day Climb", days: 7 },
] as const) {
  test(`keeps the authenticated ${route.label} selected after reload and hydration`, async ({
    page,
  }) => {
    const persistedPlanName = route.label;
    const ordinaryPlan = {
      ...makePlan({
        id: `ordinary-${route.kind}`,
        days: 7,
        name: "Ordinary reading plan",
        today: new Date().toISOString().slice(0, 10),
      }),
      journeyKey: "custom",
      journeyType: "custom",
      updatedAt: "2026-09-01T12:00:00.000Z",
    };

    await stubAuthenticatedApi(
      page,
      ordinaryPlan,
      [],
    );
    await seedLocalData(
      page,
      [],
      null,
    );
    await openMountainRhythm(page);

    const saveRequest = page.waitForRequest(
      (request) =>
        request.url().includes("/api/reading/plans") && request.method() === "POST",
    );
    await page.getByTestId(`button-choose-${route.kind}`).click();
    const savedPlanRequest = await saveRequest;
    expect(savedPlanRequest.postDataJSON()).toMatchObject({
      journeyDays: route.days,
      durationDays: route.days,
      totalDays: route.days,
      journeyKey: route.kind,
      journeyType: route.kind,
    });

    await expectDistinctMountainMetrics(page, route.label);
    await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText(
      `0 of ${route.days} planned days`,
    );
    await expect(
      page.getByText(
        new RegExp(`${persistedPlanName} · about \\d+ min/day · future readings stay hidden until their day`),
      ),
    ).toBeVisible();
    await expect(page.getByTestId("route-day-1")).toBeVisible();
    await expect(page.getByText("Ordinary reading plan", { exact: true })).toHaveCount(0);

    const metricValuesBeforeReload = await Promise.all(
      ["today", "journey", "rhythm"].map((metric) =>
        page.getByTestId(`mountain-rhythm-metric-${metric}`).innerText(),
      ),
    );

    await page.reload();
    await openMountainRhythm(page);
    await expectDistinctMountainMetrics(page, route.label);
    await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText(
      `0 of ${route.days} planned days`,
    );
    await expect(
      page.getByText(
        new RegExp(`${persistedPlanName} · about \\d+ min/day · future readings stay hidden until their day`),
      ),
    ).toBeVisible();
    await expect(page.getByTestId("route-day-1")).toBeVisible();
    await expect(page.getByText("Ordinary reading plan", { exact: true })).toHaveCount(0);

    const metricValuesAfterReload = await Promise.all(
      ["today", "journey", "rhythm"].map((metric) =>
        page.getByTestId(`mountain-rhythm-metric-${metric}`).innerText(),
      ),
    );
    expect(metricValuesAfterReload).toEqual(metricValuesBeforeReload);
  });
}

for (const route of [
  { kind: "7-day-climb", label: "7-Day Climb", days: 7 as const },
] as const) {
  test(`marks a completed ${route.label} after authenticated hydration`, async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    const completed = makePlan({
      id: `hydrated-completed-${route.kind}`,
      days: route.days,
      name: route.label,
      today,
      completedIndexes: Array.from({ length: route.days }, (_, index) => index),
    });
    const ordinaryPlan = {
      ...makePlan({
        id: `hydrated-ordinary-${route.kind}`,
        days: 7,
        name: "Ordinary reading plan",
        today,
      }),
      journeyKey: "custom",
      journeyType: "custom",
    };

    await stubAuthenticatedApi(page, ordinaryPlan, [completed]);
    await seedLocalData(page, [], null);
    await openMountainRhythm(page);

    await expect(page.getByTestId("mountain-rhythm-complete")).toContainText(`${route.label} complete`);
    await expect(page.getByTestId(`button-choose-${route.kind}`)).toContainText(`${route.label} · Complete`);
    await expect(page.getByTestId(`completed-climb-${route.kind}`)).toContainText("100% journey progress");
    await expect(page.getByText("Ordinary reading plan", { exact: true })).toHaveCount(0);
  });
}

test("updates Today’s reading for a partial day without awarding ascent", async ({
  page,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const plan = makePlan({
    id: "partial-climb",
    days: 7,
    name: "7-Day Climb",
    today,
  });

  await stubApi(page);
  await seedLocalData(page, [plan], plan.id);
  await openMountainRhythm(page);

  const todayMetric = page.getByTestId("mountain-rhythm-metric-today");
  await expect(todayMetric).toContainText("Ready for today");
  await expect(todayMetric).toContainText("0% of today’s reading");

  await page
    .getByTestId("route-day-1")
    .locator('button[data-testid^="button-reading-"]')
    .first()
    .click();

  await expect(todayMetric).toContainText("In progress");
  await expect(todayMetric).toContainText("50% of today’s reading");
  await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText(
    "0%",
  );
  await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText(
    "0 of 7 planned days",
  );
});

test("completes every reading for a day with one action and keeps it after reload", async ({
  page,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const plan = makePlan({
    id: "one-tap-climb",
    days: 7,
    name: "7-Day Climb",
    today,
  });
  const dayCompletionRequests: any[] = [];

  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/reading/day-complete")) {
      dayCompletionRequests.push(request.postDataJSON());
    }
  });

  await stubApi(page);
  await seedLocalData(page, [plan], plan.id);
  await openMountainRhythm(page);

  const firstDay = page.getByTestId("route-day-1");
  await expect(firstDay).toContainText("Next step");
  await expect(firstDay.getByTestId("button-complete-day-1")).toHaveText("Complete day");
  await firstDay.getByTestId("button-complete-day-1").click();

  await expect(firstDay).toContainText("Complete");
  await expect(firstDay.getByTestId("button-complete-day-1")).toHaveText("Undo day");
  await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText(
    "14.3%",
  );
  await expect.poll(() => dayCompletionRequests.length).toBe(1);
  expect(dayCompletionRequests[0]).toMatchObject({
    planId: plan.id,
    date: today,
    completed: true,
    completionDate: today,
  });

  await page.reload();
  await openMountainRhythm(page);
  await expect(page.getByTestId("route-day-1").getByTestId("button-complete-day-1")).toHaveText(
    "Undo day",
  );
  await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("14.3%");
});

test("places a catch-up ascent on the completion date instead of backfilling earlier points", async ({
  page,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const plan = makePlan({
    id: "catch-up-climb",
    days: 7,
    name: "7-Day Climb",
    today,
    startOffset: -4,
    completedIndexes: [0, 2, 3],
  });

  await stubApi(page);
  await seedLocalData(page, [plan], plan.id);
  await openMountainRhythm(page);

  const points = () => page.locator('[data-testid^="mountain-rhythm-day-point-"]');
  const beforeDayTwo = await points().nth(1).getAttribute("cy");
  const beforeToday = Number(await points().nth(4).getAttribute("cy"));

  await page
    .getByTestId("route-day-2")
    .getByTestId("button-complete-day-2")
    .click();

  await expect(page.getByTestId("route-day-2")).toContainText("Complete");
  await expect.poll(() => points().nth(1).getAttribute("cy")).toBe(beforeDayTwo);
  await expect.poll(async () => Number(await points().nth(4).getAttribute("cy"))).toBeLessThan(
    beforeToday,
  );
});

test("preserves catch-up timing after refresh hydration", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const plan = makePlan({
    id: "refresh-history-climb",
    days: 7,
    name: "7-Day Climb",
    today,
    startOffset: -4,
    completedIndexes: [0, 2],
  });
  plan.dayCompletionDates = {
    [plan.assignments[0].date]: plan.assignments[0].date,
    [plan.assignments[2].date]: today,
  };

  const serverPlan = {
    ...plan,
    // Older saved data may contain the scheduled date for a catch-up. The
    // browser's completion timeline is the more accurate same-device record.
    dayCompletionDates: {
      [plan.assignments[0].date]: plan.assignments[0].date,
      [plan.assignments[2].date]: plan.assignments[2].date,
    },
  };

  await stubAuthenticatedApi(page, { id: "ordinary-plan" }, [serverPlan]);
  await seedLocalData(page, [plan], plan.id);
  await openMountainRhythm(page);

  const points = () => page.locator('[data-testid^="mountain-rhythm-day-point-"]');
  const beforeRefresh = await points().evaluateAll((items) =>
    items.slice(0, 3).map((point) => Number(point.getAttribute("cy"))),
  );
  expect(beforeRefresh[1]).toBe(beforeRefresh[0]);
  expect(beforeRefresh[2]).toBeGreaterThan(beforeRefresh[1]);

  await page.reload();
  await openMountainRhythm(page);

  const afterRefresh = await points().evaluateAll((items) =>
    items.slice(0, 3).map((point) => Number(point.getAttribute("cy"))),
  );
  expect(afterRefresh).toEqual(beforeRefresh);
});

test("flatlines after one missed day, regresses after two, and recovers on catch-up", async ({
  page,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const plan = makePlan({
    id: "rhythm-recovery-climb",
    days: 7,
    name: "7-Day Climb",
    today,
    startOffset: -3,
    completedIndexes: [0],
  });

  await stubApi(page);
  await seedLocalData(page, [plan], plan.id);
  await openMountainRhythm(page);

  const points = () => page.locator('[data-testid^="mountain-rhythm-day-point-"]');
  const before = await points().evaluateAll((items) =>
    items.slice(0, 4).map((point) => Number(point.getAttribute("cy"))),
  );
  expect(before[1]).toBe(before[0]);
  expect(before[2]).toBeGreaterThan(before[1]);
  expect(before[3]).toBeGreaterThan(before[2]);

  await page
    .getByTestId("route-day-2")
    .getByTestId("button-complete-day-2")
    .click();

  const after = await points().evaluateAll((items) =>
    items.slice(0, 4).map((point) => Number(point.getAttribute("cy"))),
  );
  expect(after[1]).toBe(before[1]);
  expect(after[2]).toBe(before[2]);
  expect(after[3]).toBeLessThan(before[2]);
});

test("lets a missed day change Recent rhythm while preserving Journey progress", async ({
  page,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const plan = makePlan({
    id: "missed-climb",
    days: 7,
    name: "7-Day Climb",
    today,
    startOffset: -4,
    completedIndexes: [0, 1, 2, 3],
  });

  await stubApi(page);
  await seedLocalData(page, [plan], plan.id);
  await openMountainRhythm(page);

  const journeyMetric = page.getByTestId("mountain-rhythm-metric-journey");
  const rhythmMetric = page.getByTestId("mountain-rhythm-metric-rhythm");
  await expect(journeyMetric).toContainText("57.1%");
  await expect(rhythmMetric).toContainText("80%");

  const missedDayReadings = page
    .getByTestId("route-day-2")
    .locator('button[data-testid^="button-reading-"]');
  await missedDayReadings.nth(0).click();
  await missedDayReadings.nth(1).click();

  await expect(journeyMetric).toContainText("57.1%");
  await expect(rhythmMetric).toContainText("60%");
  await expect(page.getByTestId("mountain-rhythm-panel").getByTestId("mountain-rhythm-metric-elevation")).toHaveCount(0);
  await expect(page.getByTestId("route-day-2")).toContainText("Next step");
});

test("keeps the three summary cards readable across target widths", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const plan = makePlan({
    id: "mobile-climb",
    days: 7,
    name: "7-Day Climb",
    today,
    startOffset: -1,
    completedIndexes: [0],
  });

  await stubApi(page);
  await seedLocalData(page, [plan], plan.id);
  await openMountainRhythm(page);

  const metrics = page.locator('[data-testid^="mountain-rhythm-metric-"]');
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(metrics).toHaveCount(3);
    for (let index = 0; index < 3; index += 1) {
      await expect(metrics.nth(index)).toBeVisible();
      const box = await metrics.nth(index).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  await expect(page.getByTestId("mountain-rhythm-mountain")).toBeVisible();
  await expect(page.getByTestId("mountain-rhythm-milestones")).toBeVisible();
});

test("keeps Mountain Rhythm hierarchy single-layer with compact corners", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const plan = makePlan({
    id: "visual-hierarchy-climb",
    days: 7,
    name: "7-Day Climb",
    today,
  });
  await stubApi(page);
  await seedLocalData(page, [plan], plan.id);
  await openMountainRhythm(page);

  const hierarchy = await page.evaluate(() => {
    const styleFor = (testId: string) => {
      const element = document.querySelector(`[data-testid="${testId}"]`);
      if (!element) return null;
      const styles = getComputedStyle(element);
      return {
        border: styles.borderTopWidth,
        background: styles.backgroundColor,
        radius: styles.borderTopLeftRadius,
      };
    };
    const chart = document.querySelector('[data-testid="mountain-rhythm-mountain"]')?.parentElement;
    return {
      choose: styleFor("mountain-rhythm-choose"),
      route: styleFor("mountain-rhythm-route"),
      status: styleFor("mountain-rhythm-status"),
      milestones: styleFor("mountain-rhythm-milestones"),
      chartRadius: chart ? getComputedStyle(chart).borderTopLeftRadius : "",
    };
  });

  for (const section of [hierarchy.choose, hierarchy.route, hierarchy.status]) {
    expect(section).not.toBeNull();
    expect(section?.background).toBe("rgba(0, 0, 0, 0)");
  }
  expect(hierarchy.choose?.border).toBe("0px");
  expect(hierarchy.route?.border).toBe("0px");
  expect(hierarchy.status?.border).toBe("0px");
  expect(hierarchy.milestones?.background).toBe("rgba(0, 0, 0, 0)");
  expect(hierarchy.chartRadius).toBe("0px");
});