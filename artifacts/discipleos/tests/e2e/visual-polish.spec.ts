import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "discipleos-data";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowISO() {
  const tomorrow = new Date(`${todayISO()}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

function makeOrdinaryPlan(
  id = "visual-polish-plan",
  name = "Morning Psalms",
) {
  const today = todayISO();
  return {
    id,
    name,
    journeyKey: "custom",
    journeyType: "custom",
    selectedBooks: ["Psalms"],
    startDate: today,
    endDate: today,
    durationDays: 1,
    totalDays: 1,
    dailyMinutes: 15,
    readingTime: "07:00",
    readingMode: "consecutive",
    color: "from-[#D4A017] to-[#8A6414]",
    assignments: [
      {
        date: today,
        readings: [{ key: "visual-polish-reading", label: "Psalm 1" }],
      },
    ],
    completed: {},
    earnedDayKeys: [],
  };
}

function makeStructuredClimbPlan(
  id = "visual-polish-climb",
  name = "7-Day Climb",
) {
  const today = todayISO();
  const addDays = (amount: number) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
  };

  return {
    ...makeOrdinaryPlan(id, name),
    journeyKey: "7-day-climb",
    journeyType: "7-day-climb",
    journeyDays: 7,
    durationDays: 7,
    totalDays: 7,
    endDate: addDays(6),
    assignments: Array.from({ length: 7 }, (_, index) => ({
      date: addDays(index),
      readings: [{ key: `${id}-${index}`, label: `Climb reading ${index + 1}` }],
    })),
    completed: {},
    earnedDayKeys: [],
  };
}

async function stubHomeApi(
  page: Page,
  planOrPlans: unknown = makeOrdinaryPlan(),
  seededEvents: unknown[] = [],
  options: { authenticated?: boolean } = {},
) {
  const today = todayISO();
  const plans = Array.isArray(planOrPlans) ? planOrPlans : [planOrPlans];
  const authenticated = options.authenticated === true;
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname.endsWith("/auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          authenticated,
          user: authenticated
            ? {
                id: "visual-polish-authenticated-user",
                email: "visual-polish@example.test",
                firstName: "Visual",
                lastName: "Polish",
              }
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
          established: authenticated,
          authenticated,
          userId: "visual-polish-owner",
        }),
      });
      return;
    }

    if (pathname.endsWith("/reading/plans")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, plans }),
      });
      return;
    }

    if (pathname.endsWith("/events")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          events: seededEvents.length > 0
            ? seededEvents
            : [
                {
                  id: "visual-polish-event",
                  title: "Morning prayer",
                  type: "prayer",
                  date: today,
                  time: "06:30",
                  notes: "A quiet start",
                  remind: false,
                  repeat: "none",
                },
              ],
        }),
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

    if (pathname.endsWith("/reading/day-complete") && route.request().method() === "POST") {
      const payload = route.request().postDataJSON() as {
        planId?: string;
        date?: string;
        completed?: boolean;
      };
      const plan = plans.find((item: any) => item.id === payload.planId) as any;
      const assignment = plan?.assignments?.find((item: any) => item.date === payload.date);
      if (plan && assignment) {
        plan.completed = {
          ...(plan.completed || {}),
          ...Object.fromEntries(
            assignment.readings.map((reading: any) => [reading.key, Boolean(payload.completed)]),
          ),
        };
      }
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
      body: JSON.stringify({ success: true }),
    });
  });
}

async function stubMountainApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const body = pathname.endsWith("/session/info")
      ? { success: true, established: false }
      : pathname.endsWith("/reading/plans")
        ? { success: true, plans: [] }
        : pathname.endsWith("/events")
          ? { success: true, events: [] }
          : pathname.endsWith("/rhythm/score")
            ? { success: true, eventCompletions: [] }
            : { success: true };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

async function seedPlans(
  page: Page,
  plans: unknown[],
  events: unknown[] = [],
  preserveExisting = false,
) {
  await page.addInitScript(
    ({ seededPlans, seededEvents, preserve }) => {
      if (preserve && localStorage.getItem("discipleos-data")) return;
      localStorage.setItem(
        "discipleos-data",
        JSON.stringify({
          ownerId: null,
          plans: seededPlans,
          events: seededEvents,
          eventCompletions: {},
          selectedPlanId: seededPlans[0]?.id || null,
        }),
      );
    },
    { seededPlans: plans, seededEvents: events, preserve: preserveExisting },
  );
}

async function openDashboardNavigation(page: Page) {
  await page.locator(".launch-splash").waitFor({ state: "detached" }).catch(() => {});
  if ((page.viewportSize()?.width ?? 1280) >= 768) {
    const navigationRow = page.getByTestId("dashboard-navigation-row");
    await expect(navigationRow).toBeVisible();
    return navigationRow;
  }

  const toggle = page.getByTestId("dashboard-navigation-toggle");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(page.getByTestId("dashboard-navigation-panel")).toBeVisible();
  return page.getByTestId("dashboard-navigation-panel");
}

async function openCreatePlanFromEmptyState(page: Page, width: number) {
  const buildPage = await page.context().newPage();
  await buildPage.setViewportSize({ width, height: 900 });
  await stubHomeApi(buildPage, []);
  await buildPage.addInitScript(() => localStorage.clear());
  await buildPage.goto("/");
  const navigation = await openDashboardNavigation(buildPage);
  await navigation.getByRole("button", { name: "Plans", exact: true }).click();
  await buildPage.getByTestId("plans-empty-create-button").click();
  await expect(buildPage.getByTestId("dashboard-build-form")).toBeVisible();
  return buildPage;
}

async function auditSecondaryText(page: Page, label: string) {
  return page.evaluate((stateLabel) => {
    type Color = [number, number, number, number];

    const parseColor = (value: string): Color | null => {
      const match = value.match(
        /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i,
      );
      if (!match) return null;
      return [
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
        match[4] === undefined ? 1 : Number(match[4]),
      ];
    };

    const composite = (foreground: Color, background: [number, number, number]) => {
      const alpha = foreground[3];
      return [
        foreground[0] * alpha + background[0] * (1 - alpha),
        foreground[1] * alpha + background[1] * (1 - alpha),
        foreground[2] * alpha + background[2] * (1 - alpha),
      ] as [number, number, number];
    };

    const luminance = ([red, green, blue]: [number, number, number]) =>
      [red, green, blue]
        .map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);

    const contrast = (foreground: [number, number, number], background: [number, number, number]) => {
      const foregroundLuminance = luminance(foreground);
      const backgroundLuminance = luminance(background);
      const lighter = Math.max(foregroundLuminance, backgroundLuminance);
      const darker = Math.min(foregroundLuminance, backgroundLuminance);
      return (lighter + 0.05) / (darker + 0.05);
    };

    const renderedBackground = (element: Element) => {
      let background: [number, number, number] = [14, 18, 22];
      const ancestors: Element[] = [];
      let current: Element | null = element;
      while (current) {
        ancestors.unshift(current);
        current = current.parentElement;
      }

      for (const ancestor of ancestors) {
        const parsed = parseColor(getComputedStyle(ancestor).backgroundColor);
        if (parsed && parsed[3] > 0) {
          background = composite(parsed, background);
        }
      }
      return background;
    };

    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && styles.visibility !== "hidden" && styles.display !== "none";
    };

    const elements = Array.from(
      document.querySelectorAll(".discipleos-secondary-copy, .discipleos-meta-copy, .discipleos-field-label"),
    ).filter(visible);

    const metrics = elements.map((element) => {
      const styles = getComputedStyle(element);
      const foregroundColor = parseColor(styles.color);
      const backgroundColor = renderedBackground(element);
      const foreground = foregroundColor
        ? composite(foregroundColor, backgroundColor)
        : [0, 0, 0] as [number, number, number];
      const ratio = foregroundColor ? contrast(foreground, backgroundColor) : 0;
      const fontSize = Number.parseFloat(styles.fontSize);
      const minimum = fontSize >= 18 ? 3 : 4.5;
      return {
        text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 140),
        className: element.className.toString(),
        color: styles.color,
        background: backgroundColor.map((channel) => Math.round(channel)),
        fontSize,
        ratio: Number(ratio.toFixed(2)),
        minimum,
      };
    });

    return {
      stateLabel,
      count: metrics.length,
      failures: metrics.filter((metric) => metric.ratio < metric.minimum),
      metrics,
    };
  }, label);
}

test("shows a visible reminder permission failure instead of appearing inactive", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        permission: "default",
        requestPermission: async () => "denied",
      },
    });
  });
  const plan = makeOrdinaryPlan();
  await stubHomeApi(page, plan, [], { authenticated: true });
  await seedPlans(page, [plan]);
  await page.goto("/");

  const reminderButton = page.getByRole("button", {
    name: /Enable reminders|Notifications blocked|Try again/,
  }).first();
  await expect(reminderButton).toBeVisible();
  await reminderButton.click();

  await expect(
    page.getByRole("button", { name: "Notifications blocked", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "Notifications are blocked" }).first(),
  ).toBeVisible();
});

test("keeps audited secondary text readable across responsive DiscipleOS states", async ({ page }) => {
  const plan = makeOrdinaryPlan();
  await stubHomeApi(page, plan);
  await seedPlans(page, [plan]);

  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
    await expect(page.getByTestId("dashboard-assigned-reading-overview")).toBeVisible();

    const todayAudit = await auditSecondaryText(page, `Today ${width}px`);
    expect(todayAudit.count).toBeGreaterThan(0);
    expect(todayAudit.failures).toEqual([]);

    const navigation = await openDashboardNavigation(page);
    await navigation.getByRole("button", { name: "Calendar", exact: true }).click();
    await expect(page.getByTestId("dashboard-calendar-content")).toBeVisible();
    const calendarAudit = await auditSecondaryText(page, `Calendar ${width}px`);
    expect(calendarAudit.count).toBeGreaterThan(0);
    expect(calendarAudit.failures).toEqual([]);

    await openDashboardNavigation(page);
    const plansNavigation = width >= 768
      ? page.getByTestId("dashboard-navigation-row")
      : page.getByTestId("dashboard-navigation-panel");
    await plansNavigation.getByRole("button", { name: "Plans", exact: true }).click();
    await expect(page.getByTestId("dashboard-plans-list")).toBeVisible();
    const plansAudit = await auditSecondaryText(page, `Plans ${width}px`);
    expect(plansAudit.count).toBeGreaterThan(0);
    expect(plansAudit.failures).toEqual([]);

    const buildStatePage = await openCreatePlanFromEmptyState(page, width);
    const buildAudit = await auditSecondaryText(buildStatePage, `Create Plan ${width}px`);
    expect(buildAudit.count).toBeGreaterThan(0);
    expect(buildAudit.failures).toEqual([]);
    await buildStatePage.getByTestId("plan-create-preset-newTestament").click();

    const stateColors = await buildStatePage.evaluate(() => {
      const selectedJourney = document.querySelector('[data-testid="dashboard-build-form"] button[aria-pressed="true"]');
      const unselectedJourney = document.querySelector('[data-testid="dashboard-build-form"] button[aria-pressed="false"]');
      const continueButton = document.querySelector('[data-testid="plan-create-next"]');
      return {
        selectedBackground: selectedJourney ? getComputedStyle(selectedJourney).backgroundColor : "",
        unselectedBackground: unselectedJourney ? getComputedStyle(unselectedJourney).backgroundColor : "",
        selectedClass: selectedJourney?.className?.toString() || "",
        unselectedClass: unselectedJourney?.className?.toString() || "",
        continueButtonColor: continueButton ? getComputedStyle(continueButton).color : "",
        continueButtonOpacity: continueButton ? getComputedStyle(continueButton).opacity : "",
      };
    });
    expect(stateColors.selectedClass).not.toBe(stateColors.unselectedClass);
    expect(stateColors.continueButtonColor).toBe("rgb(0, 0, 0)");
    expect(stateColors.continueButtonOpacity).toBe("1");
    await buildStatePage.close();
  }
});

test("completes a plan day in one tap, persists it, and avoids duplicate writes", async ({ page }) => {
  const today = todayISO();
  const plan = {
    ...makeOrdinaryPlan("complete-day-plan", "Complete Day Plan"),
    assignments: [
      {
        date: today,
        readings: [
          { key: "complete-day-1", label: "Psalm 1" },
          { key: "complete-day-2", label: "Psalm 2" },
          { key: "complete-day-3", label: "Psalm 3" },
        ],
      },
    ],
    completed: { "complete-day-1": true },
  };
  let dayCompletionWrites = 0;
  await stubHomeApi(page, plan);
  await seedPlans(page, [plan], [], true);
  page.on("request", (request) => {
    if (request.url().includes("/api/reading/day-complete") && request.method() === "POST") {
      dayCompletionWrites += 1;
    }
  });

  await page.goto("/");
  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  await (await openDashboardNavigation(page)).getByRole("button", { name: "Plans", exact: true }).click();
  await page.getByTestId("planned-reading-card-complete-day-plan").click();

  const completeDay = page.getByTestId("button-complete-plan-day-1");
  await expect(completeDay).toHaveText("Complete day");
  await completeDay.click();
  await expect(completeDay).toHaveText("Day complete");
  await expect(completeDay).toBeDisabled();
  await expect(page.getByTestId("plan-reading-complete-day-2")).toHaveClass(/bg-\[#10B981\]\/10/);
  expect(dayCompletionWrites).toBe(1);

  await completeDay.click({ force: true });
  expect(dayCompletionWrites).toBe(1);

  await expect.poll(async () => {
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("discipleos-data") || "{}"));
    const storedPlan = stored.plans?.find((item: any) => item.id === "complete-day-plan");
    return storedPlan?.completed?.["complete-day-3"] === true;
  }).toBe(true);
  await page.reload();
  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  await (await openDashboardNavigation(page)).getByRole("button", { name: "Plans", exact: true }).click();
  await expect(page.getByTestId("button-complete-plan-day-1")).toHaveText("Day complete");
  await expect(page.getByTestId("button-complete-plan-day-1")).toBeDisabled();
  await expect(page.getByTestId("plan-reading-complete-day-3")).toHaveClass(/bg-\[#10B981\]\/10/);
  expect(dayCompletionWrites).toBe(1);
});

test("keeps Mountain Rhythm plans out of the Plans view", async ({ page }) => {
  const ordinaryPlan = makeOrdinaryPlan("plans-view-ordinary", "Morning Psalms");
  const mountainPlan = makeStructuredClimbPlan("plans-view-mountain", "7-Day Climb");
  await stubHomeApi(page, [ordinaryPlan, mountainPlan]);
  await seedPlans(page, [ordinaryPlan, mountainPlan]);

  await page.goto("/");
  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  await (await openDashboardNavigation(page)).getByRole("button", { name: "Plans", exact: true }).click();

  await expect(page.getByTestId("planned-reading-card-plans-view-ordinary")).toBeVisible();
  await expect(page.getByTestId("planned-reading-card-plans-view-mountain")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-plan-details")).toContainText("Morning Psalms");
  await expect(page.getByTestId("dashboard-plan-details")).not.toContainText("7-Day Climb");
});

test("guides existing users through the five-step Create Plan flow", async ({ page }) => {
  for (const width of [320, 360, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await stubHomeApi(page, []);
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/");

    const assigned = page.getByTestId("dashboard-assigned-reading");
    await assigned.getByTestId("today-empty-create-plan").click();

    const form = page.getByTestId("dashboard-build-form");
    await expect(form).toBeVisible();
    await expect(page.getByTestId("plan-create-progress")).toContainText("Step 1 of 5");
    await expect(page.getByTestId("plan-create-step-1")).toBeVisible();
    await expect(page.getByTestId("plan-create-preset-psalmsProverbs")).toBeVisible();
    await expect(page.getByTestId("plan-create-preset-newTestament")).toBeVisible();
    await expect(page.getByTestId("plan-create-preset-oldTestament")).toBeVisible();
    await expect(page.getByTestId("plan-create-preset-custom")).toContainText("Build a plan from the books you want to read.");
    await expect(page.getByTestId("plan-create-next")).toBeDisabled();

    await page.getByTestId("plan-create-preset-custom").click();
    const bookPicker = page.getByRole("dialog", { name: "Choose books" });
    await expect(bookPicker).toBeVisible();
    await expect(bookPicker.getByText("0 books selected", { exact: true })).toBeVisible();
    await bookPicker.getByRole("button", { name: /Psalms/ }).click();
    await bookPicker.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.getByTestId("plan-create-next")).toBeEnabled();
    await page.getByTestId("plan-create-next").click();

    await expect(page.getByTestId("plan-create-progress")).toContainText("Step 2 of 5");
    await expect(page.getByTestId("plan-create-step-2")).toBeVisible();
    await page.getByTestId("plan-create-minutes-30").click();
    await expect(page.getByTestId("plan-create-step-2")).toContainText("Suggested finish date");
    await expect(page.getByTestId("plan-create-next")).toBeEnabled();
    await page.getByTestId("plan-create-next").click();

    await expect(page.getByTestId("plan-create-progress")).toContainText("Step 3 of 5");
    await expect(page.getByTestId("plan-tune-toggle")).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("button", { name: "Randomized", exact: true })).toHaveCount(0);
    await page.getByTestId("plan-tune-toggle").click();
    await expect(page.getByTestId("plan-tune-toggle")).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("button", { name: /Randomized/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "By chapters", exact: true })).toBeVisible();
    await expect(page.getByText("Reading speed", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Reading time of day")).toBeVisible();
    await page.getByRole("button", { name: "Randomized Shuffle chapters across the plan" }).click();
    await page.getByTestId("plan-create-next").click();

    await expect(page.getByTestId("plan-create-progress")).toContainText("Step 4 of 5");
    await expect(page.getByTestId("plan-create-name")).toHaveAttribute("placeholder", "Psalms");
    await page.getByTestId("plan-create-name").fill("Steady Scripture");
    await page.getByTestId("plan-create-next").click();

    await expect(page.getByTestId("plan-create-progress")).toContainText("Step 5 of 5");
    await expect(page.getByTestId("plan-create-review")).toContainText("Steady Scripture");
    await expect(page.getByTestId("plan-create-review")).toContainText("Randomized");

    const saveRequest = page.waitForRequest(
      (request) =>
        request.url().includes("/api/reading/plans") && request.method() === "POST",
    );
    await page.getByTestId("plan-create-submit").click();
    const savedPlan = (await saveRequest).postDataJSON();
    expect(savedPlan.name).toBe("Steady Scripture");
    expect(savedPlan.selectedBooks).toEqual(["Psalms"]);
    expect(savedPlan.dailyMinutes).toBe(30);
    expect(savedPlan.paceMode).toBe("time");
    expect(savedPlan.readingMode).toBe("random");
    expect(
      Math.max(...savedPlan.assignments.map((assignment: any) => assignment.estimatedMinutes)),
    ).toBeLessThanOrEqual(30);
    await expect(page.getByTestId("plan-created-feedback")).toBeVisible();
    await expect(page.getByTestId("plan-created-feedback")).toContainText("Plan created");
    await expect(page.getByTestId("plan-created-view-today")).toBeVisible();
    await expect(page.getByTestId("plan-created-go-plans")).toBeVisible();

    const finalLayout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      formOverflowX: getComputedStyle(document.querySelector('[data-testid="dashboard-plans-list"]')).overflowX,
    }));
    expect(finalLayout.documentWidth).toBeLessThanOrEqual(width + 1);
    expect(finalLayout.formOverflowX).not.toMatch(/auto|scroll/);

    await page.getByTestId("plans-create-button").click();
    await expect(page.getByTestId("plan-create-step-1")).toBeVisible();
    await page.getByTestId("plan-create-preset-newTestament").click();
    await page.getByTestId("plan-create-next").click();
    await page.getByTestId("plan-create-next").click();
    await page.getByTestId("plan-create-next").click();
    await page.getByTestId("plan-create-name").fill("Evening Scripture");
    await page.getByTestId("plan-create-next").click();
    await page.getByTestId("plan-create-submit").click();
    await expect(
      page.locator('[data-testid^="planned-reading-card-"]').filter({ hasText: "Evening Scripture" }),
    ).toBeVisible();
  }
});

test("keeps Mountain Rhythm, empty, and auth secondary states legible", async ({ page }) => {
  await stubMountainApi(page);

  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/mountain-rhythm");
    await expect(page.getByTestId("mountain-rhythm-panel")).toBeVisible();

    const mountainAudit = await auditSecondaryText(page, `Mountain Rhythm ${width}px`);
    expect(mountainAudit.count).toBeGreaterThan(0);
    expect(mountainAudit.failures).toEqual([]);

    const routeStates = await page.evaluate(() => {
      const available = document.querySelector('[data-testid="button-choose-7-day-climb"]');
      const comingLater = document.querySelector('[data-testid="button-choose-40-day-climb"]');
      return {
        availableOpacity: available ? getComputedStyle(available).opacity : "",
        comingLaterOpacity: comingLater ? getComputedStyle(comingLater).opacity : "",
        comingLaterDisabled: comingLater instanceof HTMLButtonElement ? comingLater.disabled : false,
      };
    });
    expect(routeStates.availableOpacity).toBe("1");
    expect(routeStates.comingLaterOpacity).toBe("0.6");
    expect(routeStates.comingLaterDisabled).toBe(true);

    await page.goto("/");
    await expect(page.getByTestId("dashboard-plans-empty-state")).toHaveCount(0);
    const emptyHomeAudit = await auditSecondaryText(page, `Empty Today ${width}px`);
    expect(emptyHomeAudit.count).toBeGreaterThan(0);
    expect(emptyHomeAudit.failures).toEqual([]);

    await page.goto("/sign-in");
    const authCard = page.locator(".discipleos-auth-card");
    await expect(authCard).toBeVisible();
    await expect(authCard.locator("input").first()).toBeVisible();
    const authLabel = authCard.locator(".cl-formFieldLabel").first();
    if (await authLabel.count()) {
      expect(await authLabel.getAttribute("class")).toContain("text-slate-200");
    }
  }
});

test("keeps mobile account and feedback controls clear of page content and navigation", async ({ page }) => {
  await stubHomeApi(page, []);

  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("dashboard-today-content")).toBeVisible();

    const accountLink = page.getByRole("link", { name: "Continue with email", exact: true });
    const feedback = page.getByRole("button", { name: "Feedback", exact: true });
    const navigation = page.getByTestId("dashboard-navigation-toggle");
    const brandTitle = page.getByRole("heading", { name: "DISCIPLEOS", exact: true });
    const heroTitle = page.getByText("Discipline that", { exact: true });
    const heroTagline = page.getByText(
      "Build steady habits in Scripture, prayer, and your daily walk with God.",
      { exact: true },
    );

    await expect(accountLink).toBeVisible();
    await expect(brandTitle).toBeVisible();
    const accountBox = await accountLink.boundingBox();
    const brandBox = await brandTitle.boundingBox();
    const titleBox = await heroTitle.boundingBox();
    const taglineBox = await heroTagline.boundingBox();
    const feedbackBox = await feedback.boundingBox();
    const navigationBox = await navigation.boundingBox();

    expect(accountBox).not.toBeNull();
    expect(brandBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(taglineBox).not.toBeNull();
    expect(feedbackBox).not.toBeNull();
    expect(navigationBox).not.toBeNull();
    expect((accountBox?.y ?? 0)).toBeLessThan((brandBox?.y ?? Infinity) + (brandBox?.height ?? 0));
    expect((accountBox?.y ?? 0) + (accountBox?.height ?? 0)).toBeGreaterThan((brandBox?.y ?? Infinity));
    const headerRowBottom = Math.max(
      (accountBox?.y ?? 0) + (accountBox?.height ?? 0),
      (brandBox?.y ?? 0) + (brandBox?.height ?? 0),
    );
    expect(headerRowBottom).toBeLessThanOrEqual((heroTitle?.y ?? Infinity) - 12);
    expect((titleBox?.y ?? 0) + (titleBox?.height ?? 0)).toBeLessThanOrEqual((taglineBox?.y ?? Infinity) - 12);
    expect((feedbackBox?.y ?? 0) + (feedbackBox?.height ?? 0)).toBeLessThanOrEqual((navigationBox?.y ?? Infinity) - 8);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const scrolledFeedbackBox = await feedback.boundingBox();
    const scrolledNavigationBox = await navigation.boundingBox();
    const mountainBox = await page.getByTestId("dashboard-mountain-rhythm").boundingBox();
    expect(scrolledFeedbackBox).not.toBeNull();
    expect(scrolledNavigationBox).not.toBeNull();
    expect(mountainBox).not.toBeNull();
    expect((scrolledFeedbackBox?.y ?? 0) + (scrolledFeedbackBox?.height ?? 0)).toBeLessThanOrEqual(
      scrolledNavigationBox?.y ?? Infinity,
    );
    expect((mountainBox?.y ?? 0) + (mountainBox?.height ?? 0)).toBeLessThanOrEqual(
      (scrolledFeedbackBox?.y ?? Infinity) - 8,
    );
  }
});

test("uses a full-width shell and compact returning header on desktop", async ({ page }) => {
  const plan = makeOrdinaryPlan();
  await stubHomeApi(page, plan);
  await seedPlans(page, [plan]);
  await page.goto("/");

  await expect(page.getByText("Today’s reading", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Today’s Reading", { exact: true })).toBeVisible();
  await expect(page.getByText("Discipline that", { exact: true })).toHaveCount(0);

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    shellWidth: document.querySelector(".discipleos-shell")?.getBoundingClientRect().width,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.shellWidth).toBe(layout.viewportWidth);
});

test("keeps calendar dates clean while exposing selected-day events accessibly", async ({ page }) => {
  const plan = makeOrdinaryPlan();
  const event = {
    id: "visual-polish-event",
    title: "Morning prayer",
    type: "prayer",
    date: todayISO(),
    time: "06:30",
    notes: "A quiet start",
    remind: false,
    repeat: "none",
  };
  await stubHomeApi(page, plan);
  await seedPlans(page, [plan], [event]);
  await page.goto("/");
  const navigation = await openDashboardNavigation(page);
  await navigation.getByRole("button", { name: "Calendar" }).click();

  const day = page.getByTestId(`calendar-day-${todayISO()}`);
  await expect(day).toHaveAttribute("aria-label", /Prayer/);
  await expect(day).toContainText(String(new Date().getDate()));
  await expect(day.getByTestId(`calendar-marker-${todayISO()}-P`)).toHaveText("P");
  await day.click();
  await expect(page.getByText(/^Activities for /)).toBeVisible();
  await expect(page.getByText("Morning prayer", { exact: true })).toBeVisible();
  await page.getByTestId("dashboard-calendar-activities").getByRole("button", { name: "Complete activity" }).click();
  await expect(page.getByTestId(`calendar-marker-${todayISO()}-P`)).toHaveClass(/text-emerald-400/);
});

test("lets custom events be completed and reopened", async ({ page }) => {
  const event = {
    id: "visual-polish-custom-event",
    title: "Fellowship gathering",
    type: "event",
    date: todayISO(),
    time: "18:00",
    notes: "A custom event",
    remind: false,
    repeat: "none",
    countsTowardRhythm: false,
  };
  const plan = makeOrdinaryPlan("custom-event-plan", "Custom event coverage");
  await stubHomeApi(page, plan, [event]);
  await seedPlans(page, [plan], [event]);
  await page.goto("/");

  const navigation = await openDashboardNavigation(page);
  await navigation.getByRole("button", { name: "Calendar", exact: true }).click();
  const activities = page.getByTestId("dashboard-calendar-activities");
  await expect(activities.getByText("Fellowship gathering", { exact: true })).toBeVisible();
  await expect(activities.getByRole("button", { name: "Complete activity" })).toBeVisible();
  await activities.getByRole("button", { name: "Complete activity" }).click();
  await expect(activities.getByRole("button", { name: "Reopen activity" })).toBeVisible();
  await activities.getByRole("button", { name: "Reopen activity" }).click();
  await expect(activities.getByRole("button", { name: "Complete activity" })).toBeVisible();
});

test("edits and deletes a recurring Calendar activity", async ({ page }) => {
  const today = todayISO();
  const addDays = (amount: number) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
  };
  const event = {
    id: "visual-polish-recurring-event",
    title: "Morning examen",
    type: "prayer",
    date: today,
    time: "06:30",
    notes: "A recurring prayer",
    remind: false,
    repeat: "daily",
    repeatWeekdays: [0, 1, 2, 3, 4, 5, 6],
    repeatUntil: addDays(1),
  };
  const plan = makeOrdinaryPlan("recurring-event-plan", "Recurring event coverage");

  await stubHomeApi(page, plan, [event]);
  await seedPlans(page, [plan], [event]);
  await page.goto("/");

  const navigation = await openDashboardNavigation(page);
  await navigation.getByRole("button", { name: "Calendar", exact: true }).click();
  const activities = page.getByTestId("dashboard-calendar-activities");
  const initialRow = activities.locator(".discipleos-flat-row").filter({ hasText: event.title }).first();
  await expect(initialRow).toBeVisible();

  await initialRow.getByRole("button", { name: `Edit ${event.title}`, exact: true }).click();
  const editForm = page.getByTestId("calendar-event-form");
  await expect(editForm.getByLabel("Title")).toHaveValue(event.title);
  await expect(editForm.getByLabel("Repeats")).toHaveValue("daily");

  const updatedTitle = "Evening examen";
  const updatedRepeatUntil = addDays(7);
  await editForm.getByLabel("Title").fill(updatedTitle);
  await editForm.getByLabel("Repeats").selectOption("weekly");
  await editForm.getByLabel("Ends on").fill(updatedRepeatUntil);
  await editForm.getByRole("button", { name: "S", exact: true }).first().click();
  await editForm.getByRole("button", { name: "S", exact: true }).last().click();

  const updateRequest = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname.endsWith("/api/events") &&
      request.method() === "POST" &&
      request.postDataJSON()?.replacesEventId === event.id,
  );
  await editForm.getByRole("button", { name: "Save Activity", exact: true }).click();
  const updatedEventRequest = await updateRequest;
  expect(updatedEventRequest.postDataJSON()).toMatchObject({
    title: updatedTitle,
    repeat: "weekly",
    repeatUntil: updatedRepeatUntil,
    repeatWeekdays: [1, 2, 3, 4, 5],
    replacesEventId: event.id,
  });
  await expect(page.getByTestId("calendar-activity-feedback")).toContainText("Activity updated");
  const updatedRow = activities.locator(".discipleos-flat-row").filter({ hasText: updatedTitle }).first();
  await expect(updatedRow).toBeVisible();

  await updatedRow.getByRole("button", { name: `Edit ${updatedTitle}`, exact: true }).click();
  const reopenedEditForm = page.getByTestId("calendar-event-form");
  await expect(reopenedEditForm.getByLabel("Title")).toHaveValue(updatedTitle);
  await expect(reopenedEditForm.getByLabel("Repeats")).toHaveValue("weekly");
  await expect(reopenedEditForm.getByLabel("Ends on")).toHaveValue(updatedRepeatUntil);
  await expect(reopenedEditForm.getByRole("button", { name: "S", exact: true }).first()).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(reopenedEditForm.getByRole("button", { name: "S", exact: true }).last()).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await reopenedEditForm.getByRole("button", { name: "Cancel edit", exact: true }).click();

  const deleteRequest = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname.endsWith("/api/events") &&
      request.method() === "DELETE" &&
      request.postDataJSON()?.id !== undefined,
  );
  await updatedRow.getByRole("button", { name: `Delete ${updatedTitle}`, exact: true }).click();
  const deletedEventRequest = await deleteRequest;
  expect(deletedEventRequest.postDataJSON()).toMatchObject({ id: expect.any(String) });
  await expect(activities.getByText(updatedTitle, { exact: true })).toHaveCount(0);
});

test("shows distinct accessible activity markers across Calendar dates and layouts", async ({ page }) => {
  const toDate = (date: Date) => date.toISOString().slice(0, 10);
  const shiftDate = (dateISO: string, amount: number) => {
    const date = new Date(`${dateISO}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    return toDate(date);
  };
  const today = todayISO();
  const currentMonth = new Date(`${today}T12:00:00Z`);
  const monthStart = toDate(new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth(), 1)));
  const monthEnd = toDate(new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + 1, 0)));
  const nextMonthStart = shiftDate(monthEnd, 1);
  const allTypesDate = shiftDate(monthStart, 1);
  const emptyDate = shiftDate(monthStart, 2);
  const oneMarkerDate = shiftDate(monthStart, 3);
  const duplicateTypeDate = shiftDate(monthStart, 4);
  const recurringStart = shiftDate(monthStart, 10);
  const recurringDates = [recurringStart, shiftDate(recurringStart, 1), shiftDate(recurringStart, 2)];
  const previousMonthEnd = shiftDate(monthStart, -1);

  const event = (id: string, type: string, date: string, extra: Record<string, unknown> = {}) => ({
    id,
    title: `${type}-${id}`,
    type,
    date,
    time: "06:30",
    notes: "",
    remind: false,
    repeat: "none",
    ...extra,
  });
  const events = [
    event("all-prayer", "prayer", allTypesDate),
    event("all-fast", "fast", allTypesDate),
    event("all-church", "church", allTypesDate),
    event("all-event", "event", allTypesDate),
    event("all-birthday", "birthday", allTypesDate),
    event("one-church", "church", oneMarkerDate),
    event("duplicate-prayer-a", "prayer", duplicateTypeDate),
    event("duplicate-prayer-b", "prayer", duplicateTypeDate),
    event("recurring-prayer", "prayer", recurringStart, {
      repeat: "daily",
      repeatUntil: shiftDate(recurringStart, 2),
    }),
    event("previous-month-birthday", "birthday", previousMonthEnd),
    event("next-month-custom", "event", nextMonthStart),
  ];
  const plan = makeOrdinaryPlan("calendar-marker-plan", "Calendar reading");

  await stubHomeApi(page, plan, events);
  await seedPlans(page, [plan], events);

  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const navigation = await openDashboardNavigation(page);
    await navigation.getByRole("button", { name: "Calendar", exact: true }).click();

    const allTypesDay = page.getByTestId(`calendar-day-${allTypesDate}`);
    await expect(allTypesDay).toHaveAttribute(
      "aria-label",
      new RegExp("Prayer, Fasting, Church, Event"),
    );
    await expect(allTypesDay).not.toHaveAttribute("aria-label", /Birthday/);
    for (const letter of ["P", "F", "C", "E"]) {
      await expect(page.getByTestId(`calendar-marker-${allTypesDate}-${letter}`)).toBeVisible();
    }
    await expect(page.getByTestId(`calendar-marker-${allTypesDate}-B`)).toHaveCount(0);
    expect(await allTypesDay.getByTestId(`calendar-marker-${allTypesDate}-P`).count()).toBe(1);
    expect(await allTypesDay.getByTestId(`calendar-marker-${allTypesDate}-F`).count()).toBe(1);
    expect(await allTypesDay.getByTestId(`calendar-marker-${allTypesDate}-C`).count()).toBe(1);
    expect(await allTypesDay.getByTestId(`calendar-marker-${allTypesDate}-E`).count()).toBe(1);

    await expect(page.getByTestId(`calendar-day-${emptyDate}`)).not.toContainText(/[PFCEB]/);
    await expect(page.getByTestId(`calendar-day-${oneMarkerDate}-C`)).toHaveCount(0);
    await expect(page.getByTestId(`calendar-marker-${oneMarkerDate}-C`)).toBeVisible();
    await expect(page.getByTestId(`calendar-marker-${duplicateTypeDate}-P`)).toHaveCount(1);
    await expect(page.getByTestId(`calendar-marker-${duplicateTypeDate}-F`)).toHaveCount(0);
    for (const date of recurringDates) {
      await expect(page.getByTestId(`calendar-marker-${date}-P`)).toBeVisible();
    }

    const todayDay = page.getByTestId(`calendar-day-${today}`);
    await expect(todayDay).toHaveAttribute("aria-label", /selected/);
    await expect(todayDay).toHaveClass(/ring-1/);

    const markerGeometry = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-testid^="calendar-marker-"]')).map((marker) => {
        const cell = marker.closest("button");
        const markerRect = marker.getBoundingClientRect();
        const cellRect = cell?.getBoundingClientRect();
        return {
          markerRight: markerRect.right,
          markerBottom: markerRect.bottom,
          cellRight: cellRect?.right ?? -1,
          cellBottom: cellRect?.bottom ?? -1,
        };
      }),
    );
    expect(markerGeometry.length).toBeGreaterThan(0);
    for (const geometry of markerGeometry) {
      expect(geometry.markerRight).toBeLessThanOrEqual(geometry.cellRight + 1);
      expect(geometry.markerBottom).toBeLessThanOrEqual(geometry.cellBottom + 1);
    }

    const previousButton = page.getByTestId("dashboard-calendar-month").getByRole("button", { name: "Prev", exact: true });
    await previousButton.click();
    await expect(page.getByText(new Date(`${previousMonthEnd}T12:00:00Z`).toLocaleDateString(undefined, { month: "long", year: "numeric" }), { exact: true })).toBeVisible();
    await expect(page.getByTestId(`calendar-marker-${previousMonthEnd}-B`)).toHaveCount(0);

    const nextButton = page.getByTestId("dashboard-calendar-month").getByRole("button", { name: "Next", exact: true });
    await nextButton.click();
    await nextButton.click();
    await expect(page.getByText(new Date(`${nextMonthStart}T12:00:00Z`).toLocaleDateString(undefined, { month: "long", year: "numeric" }), { exact: true })).toBeVisible();
    await expect(page.getByTestId(`calendar-marker-${nextMonthStart}-E`)).toBeVisible();

    const layout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  }
});

test("shows assigned Bible readings as an icon alongside Calendar activity markers", async ({ page }) => {
  const shiftDate = (dateISO: string, amount: number) => {
    const date = new Date(`${dateISO}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
  };
  const event = (id: string, type: string, date: string, extra: Record<string, unknown> = {}) => ({
    id,
    title: `${type}-${id}`,
    type,
    date,
    time: "06:30",
    notes: "",
    remind: false,
    repeat: "none",
    ...extra,
  });
  const today = todayISO();
  const monthStart = new Date(`${today.slice(0, 7)}-01T12:00:00Z`);
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
  const previousMonthEnd = shiftDate(`${today.slice(0, 7)}-01`, -1);
  const nextMonthStart = shiftDate(monthEnd.toISOString().slice(0, 10), 1);
  const onlyBibleDate = shiftDate(today, -1);
  const recurringBibleDate = shiftDate(today, 1);
  const completedDate = shiftDate(today, 8);
  const incompleteDate = shiftDate(today, 9);
  const assignedBibleDates = new Set([
    onlyBibleDate,
    today,
    completedDate,
    incompleteDate,
    previousMonthEnd,
    nextMonthStart,
  ]);
  const noReadingDate = Array.from({ length: monthEnd.getUTCDate() }, (_, index) =>
    shiftDate(`${today.slice(0, 7)}-01`, index),
  ).find((date) => !assignedBibleDates.has(date));

  if (!noReadingDate) {
    throw new Error("Could not find an unassigned date in the displayed month");
  }

  const ordinaryPlan = {
    ...makeOrdinaryPlan("calendar-bible-ordinary", "Morning Psalms"),
    assignments: [
      { date: onlyBibleDate, readings: [{ key: "only-bible-reading", label: "Psalm 1" }] },
      {
        date: today,
        readings: [
          { key: "ordinary-today-reading", label: "Psalm 2" },
          { key: "ordinary-today-reflection", label: "Psalm 3" },
        ],
      },
      { date: completedDate, readings: [{ key: "completed-reading", label: "Psalm 4" }] },
      { date: incompleteDate, readings: [{ key: "incomplete-reading", label: "Psalm 5" }] },
      { date: previousMonthEnd, readings: [{ key: "previous-month-reading", label: "Psalm 6" }] },
      { date: nextMonthStart, readings: [{ key: "next-month-reading", label: "Psalm 7" }] },
    ],
    completed: { "completed-reading": true },
  };
  const secondPlan = {
    ...makeOrdinaryPlan("calendar-bible-second", "Evening Proverbs"),
    assignments: [
      { date: today, readings: [{ key: "second-plan-reading", label: "Proverbs 1" }] },
    ],
  };
  const structuredPlan = makeStructuredClimbPlan("calendar-bible-climb", "7-Day Climb");
  const mountainCompletedDate = structuredPlan.assignments[0].date;
  structuredPlan.completed = Object.fromEntries(
    structuredPlan.assignments[0].readings.map((reading: { key: string }) => [reading.key, true]),
  );
  const events = [
    event("all-prayer", "prayer", today),
    event("all-fast", "fast", today),
    event("all-church", "church", today),
    event("all-event", "event", today),
    event("all-birthday", "birthday", today),
    event("recurring-prayer", "prayer", today, {
      repeat: "daily",
      repeatUntil: recurringBibleDate,
    }),
  ];

  await stubHomeApi(page, [ordinaryPlan, secondPlan, structuredPlan], events);
  await seedPlans(page, [ordinaryPlan, secondPlan, structuredPlan], events);

  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const navigation = await openDashboardNavigation(page);
    await navigation.getByRole("button", { name: "Calendar", exact: true }).click();

    const marker = (date: string) => page.getByTestId(`calendar-marker-${date}-bible`);
    const mountainMarker = (date: string) => page.getByTestId(`calendar-marker-${date}-mountain`);
    const day = (date: string) => page.getByTestId(`calendar-day-${date}`);

    await expect(marker(onlyBibleDate)).toBeVisible();
    await expect(day(onlyBibleDate)).not.toContainText("B");
    await expect(day(onlyBibleDate)).toHaveAttribute("aria-label", /Bible reading/);

    const allTypesDay = day(today);
    await expect(allTypesDay).toHaveAttribute(
      "aria-label",
      /Bible reading, Prayer, Fasting, Church, Event/,
    );
    await expect(allTypesDay).not.toHaveAttribute("aria-label", /Birthday/);
    await expect(marker(today)).toBeVisible();
    await expect(page.getByTestId(`calendar-marker-${today}-mountain`)).toBeVisible();
    await expect(mountainMarker(mountainCompletedDate)).toHaveClass(/text-emerald-400/);
    for (const letter of ["P", "F", "C", "E"]) {
      await expect(page.getByTestId(`calendar-marker-${today}-${letter}`)).toBeVisible();
    }
    await expect(allTypesDay.getByTestId(`calendar-marker-${today}-B`)).toHaveCount(0);
    await expect(allTypesDay.getByTestId(`calendar-marker-${today}-bible`)).toHaveCount(1);

    await expect(mountainMarker(recurringBibleDate)).toBeVisible();
    await expect(page.getByTestId(`calendar-marker-${recurringBibleDate}-P`)).toBeVisible();
    await expect(marker(completedDate)).toBeVisible();
     await expect(marker(completedDate)).toHaveClass(/text-emerald-400/);
    await expect(marker(incompleteDate)).toBeVisible();
     await expect(marker(incompleteDate)).not.toHaveClass(/text-emerald-400/);
    await expect(day(noReadingDate)).not.toHaveAttribute("aria-label", /Bible reading/);
    await expect(day(noReadingDate).getByTestId(`calendar-marker-${noReadingDate}-bible`)).toHaveCount(0);

    const markerGeometry = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-testid^="calendar-marker-"]')).map((marker) => {
        const cell = marker.closest("button");
        const markerRect = marker.getBoundingClientRect();
        const cellRect = cell?.getBoundingClientRect();
        const dateRect = cell?.querySelector("span.text-sm")?.getBoundingClientRect();
        return {
          markerLeft: markerRect.left,
          markerTop: markerRect.top,
          markerRight: markerRect.right,
          markerBottom: markerRect.bottom,
          cellLeft: cellRect?.left ?? -1,
          cellRight: cellRect?.right ?? -1,
          cellBottom: cellRect?.bottom ?? -1,
          dateBottom: dateRect?.bottom ?? -1,
        };
      }),
    );
    expect(markerGeometry.length).toBeGreaterThan(0);
    for (const geometry of markerGeometry) {
      expect(geometry.markerLeft).toBeGreaterThanOrEqual(geometry.cellLeft - 1);
      expect(geometry.markerRight).toBeLessThanOrEqual(geometry.cellRight + 1);
      expect(geometry.markerTop).toBeGreaterThanOrEqual(geometry.dateBottom - 1);
      expect(geometry.markerBottom).toBeLessThanOrEqual(geometry.cellBottom + 1);
    }

    await day(completedDate).click();
    await expect(page.getByRole("button", { name: "Undo day", exact: true })).toBeVisible();
    await day(incompleteDate).click();
    await expect(page.getByRole("button", { name: "Complete day", exact: true })).toBeVisible();

    const previousButton = page.getByTestId("dashboard-calendar-month").getByRole("button", { name: "Prev", exact: true });
    await previousButton.click();
    await expect(marker(previousMonthEnd)).toBeVisible();

    const nextButton = page.getByTestId("dashboard-calendar-month").getByRole("button", { name: "Next", exact: true });
    await nextButton.click();
    await nextButton.click();
    await expect(marker(nextMonthStart)).toBeVisible();
  }
});

test("keeps Calendar creation short, guided, and fully configurable", async ({ page }) => {
  const plan = makeOrdinaryPlan("calendar-density-plan", "Calendar reading");
  const event = {
    id: "calendar-density-event",
    title: "Morning prayer",
    type: "prayer",
    date: todayISO(),
    time: "06:30",
    notes: "A quiet start",
    remind: true,
    reminderMinutes: 10,
    repeat: "none",
  };
  await stubHomeApi(page, plan, [event]);
  await seedPlans(page, [plan], [event]);

  for (const width of [320, 360, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const navigation = await openDashboardNavigation(page);
    await navigation.getByRole("button", { name: "Calendar", exact: true }).click();

    const calendar = page.getByTestId("dashboard-calendar-month");
    const activities = page.getByTestId("dashboard-calendar-activities");
    await expect(calendar).toBeVisible();
    await expect(activities).toBeVisible();
    await expect(page.getByText("Morning prayer", { exact: true })).toBeVisible();
    await expect(page.getByTestId("calendar-add-event-control")).toHaveCount(1);
    await expect(page.getByTestId("calendar-event-form")).toHaveCount(0);

    const completeActivity = activities.getByRole("button", { name: "Complete activity" });
    await completeActivity.click();
    await expect(activities.getByRole("button", { name: "Reopen activity" })).toBeVisible();
    await activities.getByRole("button", { name: "Reopen activity" }).click();
    await expect(activities.getByRole("button", { name: "Complete activity" })).toBeVisible();

    const layout = await page.evaluate(() => {
      const month = document.querySelector('[data-testid="dashboard-calendar-month"]');
      const activitySection = document.querySelector('[data-testid="dashboard-calendar-activities"]');
      const addActivity = document.querySelector('[data-testid="calendar-add-event-control"]');
      const dayButtons = Array.from(document.querySelectorAll('[data-testid^="calendar-day-"]'));
      const form = document.querySelector('[data-testid="calendar-event-form"]');
      const monthRect = month?.getBoundingClientRect();
      const activityRect = activitySection?.getBoundingClientRect();
      const addActivityRect = addActivity?.getBoundingClientRect();
      return {
        documentWidth: document.documentElement.scrollWidth,
        monthTop: monthRect?.top ?? -1,
        activityTop: activityRect?.top ?? -1,
        monthLeft: monthRect?.left ?? -1,
        activityLeft: activityRect?.left ?? -1,
        addActivityTop: addActivityRect?.top ?? -1,
        dayItemsTop: document.querySelector('[data-testid="calendar-items-list"]')?.getBoundingClientRect().top ?? -1,
        maxDayHeight: Math.max(...dayButtons.map((day) => day.getBoundingClientRect().height)),
        formOverflowY: form ? getComputedStyle(form).overflowY : "none",
      };
    });
    expect(layout.documentWidth).toBeLessThanOrEqual(width + 1);
    expect(layout.maxDayHeight).toBeLessThanOrEqual(width < 640 ? 56 : width < 1024 ? 76 : 92);
    expect(layout.addActivityTop).toBeLessThan(layout.dayItemsTop);
    if (width < 768) {
      expect(layout.activityTop).toBeLessThan(layout.monthTop);
    } else {
      expect(layout.monthLeft).toBeGreaterThan(layout.activityLeft);
    }

    await page.getByTestId("calendar-add-event-control").click();
    await expect(page.getByTestId("calendar-add-event-control")).toHaveCount(0);
    const form = page.getByTestId("calendar-event-form");
    await expect(form).toHaveCount(1);
    await expect(form).toBeVisible();
    await expect(form.getByTestId("calendar-step-activity")).toBeVisible();
    await expect(form.getByTestId("calendar-activity-type-event")).toBeVisible();
    await expect(form.getByTestId("calendar-more-options")).toHaveCount(0);
    await expect(form.getByTestId("calendar-save-activity")).toHaveCount(0);

    await form.getByTestId("calendar-activity-type-event").click();
    await expect(form.getByLabel("Activity name")).toHaveValue("Personal event");
    await form.getByTestId("calendar-step-continue").click();
    await expect(form.getByTestId("calendar-step-when")).toBeVisible();
    await form.getByTestId("calendar-date-tomorrow").click();
    await expect(form.getByLabel("Selected date")).toHaveValue(tomorrowISO());
    await form.getByTestId("calendar-step-continue").click();
    await expect(form.getByTestId("calendar-step-repeat")).toBeVisible();
    await expect(form.getByTestId("calendar-repeat-no")).toBeVisible();
    await expect(form.getByTestId("calendar-repeat-yes")).toBeVisible();
    await form.getByTestId("calendar-repeat-yes").click();
    await expect(form.getByTestId("calendar-repeat-controls")).toBeVisible();
    await form.getByLabel("Repeat pattern").selectOption("weekly");
    await expect(form.getByLabel("Ends on")).toBeVisible();
    await expect(form.getByText("Repeat on", { exact: true })).toBeVisible();
    await form.getByTestId("calendar-step-continue").click();
    await expect(form.getByTestId("calendar-step-review")).toBeVisible();
    await expect(form.getByTestId("calendar-step-review")).toContainText("Personal event");
    await expect(form.getByTestId("calendar-more-options")).toHaveCount(0);
    await expect(form.getByTestId("calendar-optional-details")).toBeVisible();
    await expect(form.getByText("Count toward my Spiritual Rhythm", { exact: true })).toBeVisible();
    await expect(form.getByLabel("Ends on")).toHaveCount(0);
    await expect(form.getByLabel("Reminder lead time")).toBeVisible();
    await expect(form.getByLabel("Notes")).toBeVisible();
    await form.getByRole("button", { name: "Reminder on", exact: true }).click();
    await expect(form.getByLabel("Reminder lead time")).toHaveCount(0);
    await form.getByLabel("Notes").fill("Keep this draft while checking the calendar.");
    await form.getByRole("button", { name: /Hide/ }).click();
    await expect(page.getByTestId("calendar-event-form")).toHaveCount(0);

    await page.getByTestId("calendar-add-event-control").click();
    const reopenedForm = page.getByTestId("calendar-event-form");
    await expect(reopenedForm.getByTestId("calendar-step-review")).toBeVisible();
    await expect(reopenedForm.getByTestId("calendar-step-review")).toContainText("Personal event");
    await expect(reopenedForm.getByLabel("Notes")).toHaveValue("Keep this draft while checking the calendar.");
    await expect(reopenedForm.getByTestId("calendar-more-options")).toHaveCount(0);
    await expect(reopenedForm.getByTestId("calendar-optional-details")).toBeVisible();

    await reopenedForm.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(reopenedForm.getByTestId("calendar-step-activity")).toBeVisible();
    await expect(reopenedForm.getByLabel("Activity name")).toHaveCount(0);
    await expect(reopenedForm.getByTestId("calendar-repeat-controls")).toHaveCount(0);
    await expect(reopenedForm.getByTestId("calendar-optional-details")).toHaveCount(0);
    await expect(reopenedForm.getByTestId("calendar-more-options")).toHaveCount(0);
    await expect(reopenedForm.getByTestId("calendar-save-activity")).toHaveCount(0);

    await reopenedForm.getByTestId("calendar-activity-type-event").click();
    await reopenedForm.getByTestId("calendar-step-continue").click();
    await reopenedForm.getByTestId("calendar-step-continue").click();
    await reopenedForm.getByTestId("calendar-repeat-yes").click();
    await reopenedForm.getByLabel("Repeat pattern").selectOption("weekly");
    await reopenedForm.getByTestId("calendar-step-continue").click();
    const saveRequest = page.waitForRequest(
      (request) => new URL(request.url()).pathname.endsWith("/api/events") && request.method() === "POST",
    );
    await reopenedForm.getByRole("button", { name: "Add Activity", exact: true }).click();
    const savedEventRequest = await saveRequest;
    expect(savedEventRequest.postDataJSON()).toMatchObject({
      title: "Personal event",
      repeat: "weekly",
    });
    await expect(page.getByText("Personal event", { exact: true })).toBeVisible();
    await expect(page.getByTestId("calendar-activity-feedback")).toContainText("Activity added");
    await expect(page.getByTestId("calendar-activity-feedback").getByRole("button", { name: "Edit activity", exact: true })).toBeVisible();
    await expect(page.getByTestId("calendar-activity-feedback").getByRole("button", { name: "Add another", exact: true })).toBeVisible();
    await expect(page.getByTestId("calendar-activity-feedback").getByRole("button", { name: "Done", exact: true })).toBeVisible();
    await expect(page.getByTestId("calendar-event-form")).toHaveCount(0);

    await page.getByTestId(`calendar-day-${todayISO()}`).click();
    const morningPrayerRow = activities.locator(".discipleos-flat-row").filter({ hasText: "Morning prayer" }).first();
    await morningPrayerRow.getByRole("button", { name: "Edit Morning prayer", exact: true }).click();
    const editForm = page.getByTestId("calendar-event-form");
    await expect(editForm.getByLabel("Title")).toHaveValue("Morning prayer");
    await editForm.getByRole("button", { name: width < 430 ? "Cancel" : "Cancel edit", exact: true }).click();
    await expect(editForm.getByLabel("Title")).toHaveCount(0);
  }
});

test("keeps the Calendar activity form open when changing the selected day", async ({ page }) => {
  const plan = makeOrdinaryPlan("calendar-date-change-plan", "Calendar reading");
  await stubHomeApi(page, plan);
  await seedPlans(page, [plan]);

  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const navigation = await openDashboardNavigation(page);
    await navigation.getByRole("button", { name: "Calendar", exact: true }).click();

    await page.getByTestId("calendar-add-event-control").click();
    const form = page.getByTestId("calendar-event-form");
    await form.getByTestId("calendar-activity-type-event").click();
    await form.getByTestId("calendar-step-continue").click();
    await expect(form.getByTestId("calendar-step-when")).toBeVisible();

    const chosenDate = tomorrowISO();
    await page.getByTestId(`calendar-day-${chosenDate}`).click();

    await expect(page.getByTestId("calendar-event-form")).toHaveCount(1);
    await expect(form).toBeVisible();
    await expect(form.getByLabel("Selected date")).toHaveValue(chosenDate);
    await expect(page.getByTestId("dashboard-calendar-activities")).toHaveCount(1);
    await expect(page.getByTestId("calendar-items-list")).toHaveCount(1);
    await expect(page.getByTestId(`calendar-day-${chosenDate}`)).toHaveAttribute("aria-label", /selected/);
  }
});

test("keeps mobile pages inside the viewport and wraps active route labels", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const plan = makeOrdinaryPlan();
  await stubHomeApi(page, plan);
  await seedPlans(page, [plan]);
  await page.goto("/");

  const homeLayout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(homeLayout.documentWidth).toBeLessThanOrEqual(homeLayout.viewportWidth + 1);

  const today = todayISO();
  const resetPlan = {
    ...makeOrdinaryPlan(),
    id: "visual-polish-reset",
    name: "20-Day Reset",
    journeyKey: "20-day-reset",
    journeyType: "20-day-reset",
    durationDays: 20,
    totalDays: 20,
    assignments: Array.from({ length: 20 }, (_, index) => ({
      date: index === 0 ? today : today,
      readings: [{ key: `visual-polish-reset-${index}`, label: `Reset reading ${index + 1}` }],
    })),
  };
  await page.unrouteAll();
  await stubMountainApi(page);
  await seedPlans(page, [resetPlan]);
  await page.goto("/mountain-rhythm");
  const resetButton = page.getByTestId("button-choose-20-day-reset");
  await expect(resetButton).toContainText("20-Day Reset · In Progress");
  const buttonLayout = await resetButton.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(buttonLayout.scrollWidth).toBeLessThanOrEqual(buttonLayout.clientWidth + 1);

  const mountainLayout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(mountainLayout.documentWidth).toBeLessThanOrEqual(mountainLayout.viewportWidth + 1);
});

test("prioritizes Today’s Reading across supported dashboard widths", async ({ page }) => {
  const firstPlan = makeOrdinaryPlan("visual-polish-morning", "Morning Psalms");
  const secondPlan = makeOrdinaryPlan("visual-polish-evening", "Evening Proverbs");
  await stubHomeApi(page, [firstPlan, secondPlan]);
  await seedPlans(page, [firstPlan, secondPlan]);
  await page.addInitScript(() => localStorage.removeItem("discipleos:dashboard-disclosures"));

  for (const width of [320, 390, 480, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
    await expect(page.getByTestId("dashboard-verse-of-day")).toBeVisible();
    await expect(page.getByTestId("dashboard-today-content").getByText("Today’s Walk", { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("dashboard-stats")).toHaveCount(0);

    const assigned = page.getByTestId("dashboard-assigned-reading");
    const activities = page.getByTestId("dashboard-schedule");
    const progress = page.getByTestId("dashboard-progress");
    const mountain = page.getByTestId("dashboard-mountain-rhythm");
    await expect(assigned.getByRole("button", { name: /Today’s Reading/ })).toHaveAttribute("aria-expanded", "true");
    await expect(assigned.getByTestId("dashboard-assigned-reading-values")).toContainText("0 of 2 chapters complete");
    await expect(assigned.getByText("Morning Psalms", { exact: true })).toBeVisible();
    await expect(assigned.getByText("Evening Proverbs", { exact: true })).toBeVisible();
    await expect(activities.getByRole("button", { name: /Today’s Activities/ })).toHaveAttribute("aria-expanded", "true");
    await expect(progress.getByRole("button", { name: /^Progress/ })).toHaveAttribute("aria-expanded", "false");
    await expect(mountain.getByRole("button", { name: /Mountain Rhythm/ })).toHaveAttribute("aria-expanded", "false");

    const layout = await page.evaluate(() => {
      const top = (testId: string) =>
        document.querySelector(`[data-testid="${testId}"]`)?.getBoundingClientRect().top ?? Infinity;
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        verse: top("dashboard-verse-of-day"),
        assigned: top("dashboard-assigned-reading"),
        activities: top("dashboard-schedule"),
        progress: top("dashboard-progress"),
        mountain: top("dashboard-mountain-rhythm"),
      };
    });

    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.verse).toBeLessThan(layout.assigned);
    expect(layout.assigned).toBeLessThan(layout.activities);
    expect(layout.activities).toBeLessThan(layout.progress);
    expect(layout.progress).toBeLessThan(layout.mountain);

    if (width < 768) {
      for (const testId of ["dashboard-assigned-reading", "dashboard-schedule", "dashboard-progress", "dashboard-mountain-rhythm"]) {
        const box = await page.getByTestId(testId).boundingBox();
        expect(box).not.toBeNull();
        expect(box?.x ?? -1).toBeGreaterThanOrEqual(12);
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width - 12);
      }
    }

    const assignedToggle = assigned.getByRole("button", { name: /Today’s Reading/ });
    await assignedToggle.click();
    await expect(assignedToggle).toHaveAttribute("aria-expanded", "false");
    await assignedToggle.click();
    await expect(assignedToggle).toHaveAttribute("aria-expanded", "true");

    const progressToggle = progress.getByRole("button", { name: /^Progress/ });
    await progressToggle.click();
    await expect(progressToggle).toHaveAttribute("aria-expanded", "true");
    await expect(progress.getByTestId("dashboard-progress-list")).toContainText("Morning Psalms");

    const mountainToggle = mountain.getByRole("button", { name: /Mountain Rhythm/ });
    await mountainToggle.click();
    await expect(mountainToggle).toHaveAttribute("aria-expanded", "true");
    await expect(mountain.getByTestId("dashboard-mountain-rhythm-summary")).toBeVisible();
  }
});

test("keeps Today’s Reading complete across empty, ordinary, and mixed climb states", async ({ page }) => {
  test.setTimeout(90_000);
  const morningPlan = makeOrdinaryPlan("today-morning", "Morning Psalms");
  morningPlan.assignments[0].readings[0].label = "Morning Psalm 1";
  const eveningPlan = makeOrdinaryPlan("today-evening", "Evening Proverbs");
  eveningPlan.assignments[0].readings[0].label = "Evening Proverbs 1";
  const climbPlan = makeStructuredClimbPlan();
  const completedClimbPlan = makeStructuredClimbPlan("visual-polish-completed-climb");
  completedClimbPlan.completed[`${completedClimbPlan.id}-0`] = true;
  completedClimbPlan.earnedDayKeys = [todayISO()];
  const dailyWalkEvent = {
    id: "visual-polish-daily-walk-event",
    title: "Morning prayer",
    type: "prayer",
    date: todayISO(),
    time: "06:30",
    notes: "A quiet start",
    remind: false,
    repeat: "none",
  };
  const states = [
    {
      label: "no plans",
      plans: [],
      ordinaryNames: [],
      climbReading: false,
    },
    {
      label: "multiple ordinary plans",
      plans: [morningPlan, eveningPlan],
      ordinaryNames: ["Morning Psalms", "Evening Proverbs"],
      climbReading: false,
    },
    {
      label: "active climb plus ordinary plans",
      plans: [climbPlan, morningPlan, eveningPlan],
      ordinaryNames: ["Morning Psalms", "Evening Proverbs"],
      climbReading: true,
      climbComplete: false,
    },
    {
      label: "completed climb",
      plans: [completedClimbPlan, morningPlan],
      ordinaryNames: ["Morning Psalms"],
      climbReading: true,
      climbComplete: true,
    },
  ];

  await page.addInitScript(() => localStorage.removeItem("discipleos:dashboard-disclosures"));

  for (const state of states) {
    for (const width of [320, 360, 390, 430, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.unrouteAll();
      await stubHomeApi(page, state.plans, [dailyWalkEvent]);
      await seedPlans(page, state.plans, [dailyWalkEvent]);
      await page.goto("/");
        await page.evaluate(() => localStorage.removeItem("discipleos:dashboard-disclosures"));
        await page.reload();

      const assigned = page.getByTestId("dashboard-assigned-reading");
      const schedule = page.getByTestId("dashboard-schedule");
      const progress = page.getByTestId("dashboard-progress");
      const mountain = page.getByTestId("dashboard-mountain-rhythm");
      const assignedToggle = assigned.getByRole("button", { name: /Today’s Reading/ });
      await expect(assigned).toBeVisible();
      await expect(assignedToggle).toHaveAttribute("aria-expanded", "true");
      await expect(assigned.getByTestId("dashboard-assigned-reading-overview")).toBeVisible();
      await expect(schedule).toBeVisible();
      await expect(page.getByTestId("dashboard-verse-of-day")).toContainText("Psalm 1:1");
      await expect(page.getByTestId("dashboard-stats")).toHaveCount(0);
      await expect(progress.getByRole("button", { name: /^Progress/ })).toHaveAttribute("aria-expanded", "false");
      await expect(mountain.getByRole("button", { name: /Mountain Rhythm/ })).toHaveAttribute("aria-expanded", "false");
      for (const name of state.ordinaryNames) {
        await expect(assigned.getByText(name, { exact: true })).toBeVisible();
      }
      if (state.climbReading) {
        await expect(assigned.getByText("Climb reading 1", { exact: true })).toHaveCount(0);
      }

      if (state.plans.length === 0) {
        await expect(assigned.getByTestId("today-empty-create-plan")).toHaveCount(1);
        await expect(page.getByRole("button", { name: "Create a Plan", exact: true })).toHaveCount(1);
      }
      const mountainSummary = page.getByTestId("dashboard-mountain-rhythm");
      const mountainToggle = mountainSummary.getByRole("button", { name: /Mountain Rhythm/ });
      await mountainToggle.click();
      await expect(mountainSummary.getByTestId("dashboard-mountain-rhythm-summary")).toBeVisible();
      if (state.climbReading) {
        await expect(mountainSummary.getByTestId("dashboard-mountain-rhythm-climb")).toContainText(
          "7-Day Climb",
        );
        await expect(mountainSummary.getByTestId("dashboard-mountain-rhythm-progress")).toContainText(
          state.climbComplete ? "14.3%" : "0%",
        );
        const todayStatus = mountainSummary.getByTestId("dashboard-mountain-rhythm-today-status");
        await expect(todayStatus).toContainText(state.climbComplete ? "Complete" : "Not complete");
        if (state.climbComplete) {
          await expect(
            mountainSummary.getByTestId("dashboard-mountain-rhythm-summary"),
          ).toContainText("Today’s reading finished");
          await expect(
            mountainSummary.getByTestId("dashboard-mountain-rhythm-today-action"),
          ).toHaveCount(0);
        } else {
          await expect(
            mountainSummary.getByTestId("dashboard-mountain-rhythm-today-action"),
          ).toHaveAttribute("href", "/mountain-rhythm");
          await expect(
            mountainSummary.getByTestId("dashboard-mountain-rhythm-today-action"),
          ).toContainText("Open today’s reading");
        }
        await expect(mountainSummary.getByText("Current stage", { exact: true })).toHaveCount(0);
        await expect(mountainSummary.getByTestId("mountain-rhythm-panel")).toHaveCount(0);
        await expect(page.getByTestId("mountain-rhythm-panel")).toHaveCount(0);
      }

      const layout = await page.evaluate(() => {
        const box = (testId: string) => {
          const element = document.querySelector(`[data-testid="${testId}"]`);
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
        };
        return {
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          verse: box("dashboard-verse-of-day"),
          assigned: box("dashboard-assigned-reading"),
          schedule: box("dashboard-schedule"),
          progress: box("dashboard-progress"),
          mountain: box("dashboard-mountain-rhythm"),
        assignedButtons: Array.from(
          document.querySelectorAll('[data-testid="dashboard-assigned-reading"] .discipleos-flat-list button'),
          ).map((element) => Math.round(element.getBoundingClientRect().height)),
        };
      });

      expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
      expect(layout.verse).not.toBeNull();
      expect(layout.assigned).not.toBeNull();
      expect(layout.schedule).not.toBeNull();
      expect(layout.progress).not.toBeNull();
      expect(layout.assigned?.left ?? -1).toBeGreaterThanOrEqual(12);
      expect(layout.assigned?.right ?? Infinity).toBeLessThanOrEqual(width - 12);
      expect(layout.assigned?.top ?? Infinity).toBeLessThan(layout.schedule?.top ?? -1);
      expect(layout.schedule?.top ?? Infinity).toBeLessThan(layout.mountain?.top ?? -1);
      expect(layout.verse?.top ?? Infinity).toBeLessThan(layout.assigned?.top ?? -1);
      expect(layout.assigned?.top ?? Infinity).toBeLessThan(layout.schedule?.top ?? -1);
      expect(layout.schedule?.top ?? Infinity).toBeLessThan(layout.progress?.top ?? -1);
      expect(layout.progress?.top ?? Infinity).toBeLessThan(layout.mountain?.top ?? -1);
      if (state.plans.length > 0) {
        expect(layout.assignedButtons.length).toBeGreaterThan(0);
        expect(Math.min(...layout.assignedButtons)).toBeGreaterThanOrEqual(40);
      }

      const firstAssignedAction = assigned.locator("button").first();
      await firstAssignedAction.focus();
      await expect(firstAssignedAction).toBeFocused();

      if (state.plans.length > 0) {
        const readingButton = assigned.getByRole("button", { name: /Morning Psalm 1/ });
        const before = await readingButton.getAttribute("class");
        await readingButton.click();
        await expect(readingButton).toHaveClass(/bg-emerald-500\/10/);
        await readingButton.click();
        await expect(readingButton).toHaveAttribute("class", before || "");
      }
    }
  }
});

test("uses functional surfaces where contrast is needed and keeps compact ordinary radii", async ({ page }) => {
  const plan = makeOrdinaryPlan();
  await stubHomeApi(page, plan);
  await seedPlans(page, [plan]);
  await page.goto("/");

  const sectionStyle = async (testIds: string[]) =>
    page.evaluate((ids) => {
      const styleFor = (testId: string) => {
        const element = document.querySelector(`[data-testid="${testId}"]`);
        if (!element) return null;
        const styles = getComputedStyle(element);
        return {
          border: styles.borderTopWidth,
          background: styles.backgroundColor,
          shadow: styles.boxShadow,
        };
      };
      return ids.map(styleFor);
    }, testIds);

  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  await expect(page.getByTestId("dashboard-schedule")).toBeVisible();
  await expect(page.getByTestId("dashboard-progress")).toBeVisible();
  await expect(page.getByTestId("dashboard-mountain-rhythm")).toBeVisible();
  const sections = await sectionStyle(["dashboard-assigned-reading", "dashboard-schedule", "dashboard-progress", "dashboard-mountain-rhythm"]);
  const radii = await page.evaluate(() => {
    const sampleSurface = document.querySelector(".discipleos-shell .discipleos-functional-surface");
    const sampleAction = document.querySelector(".discipleos-shell .discipleos-action");
    return {
      functionalSurface: sampleSurface ? getComputedStyle(sampleSurface).borderTopLeftRadius : "",
      action: sampleAction ? getComputedStyle(sampleAction).borderTopLeftRadius : "",
    };
  });
  const navigation = await openDashboardNavigation(page);
  await navigation.getByRole("button", { name: "Calendar", exact: true }).click();
  await expect(page.getByTestId("dashboard-calendar-content")).toBeVisible();
  const calendarSections = await sectionStyle([
    "dashboard-calendar-activities",
    "dashboard-calendar-month",
  ]);
  await openDashboardNavigation(page);
  await page
    .getByTestId("dashboard-navigation-row")
    .getByRole("button", { name: "Plans", exact: true })
    .click();
  await expect(page.getByTestId("dashboard-plans-list")).toBeVisible();
  await expect(page.getByTestId("dashboard-plan-details")).toBeVisible();
  const planSections = await sectionStyle([
    "dashboard-plans-list",
    "dashboard-plan-details",
  ]);
  for (const section of sections) {
    expect(section).not.toBeNull();
    expect(section?.border).toBe("1px");
    expect(section?.background).toBe("rgba(7, 12, 16, 0.82)");
  }
  for (const section of [...calendarSections, ...planSections]) {
    expect(section).not.toBeNull();
    expect(section?.border).toBe("1px");
    expect(section?.background).toBe("rgba(7, 12, 16, 0.82)");
  }
  expect(radii.functionalSurface).toBe("8px");
  expect(radii.action).toBe("6px");
});

test("remembers Today section disclosures and restores defaults after local data is cleared", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const plan = makeOrdinaryPlan();
  await stubHomeApi(page, plan);
  await seedPlans(page, [plan]);
  await page.goto("/");

  const scheduleToggle = page.getByTestId("dashboard-schedule").getByRole("button", { name: /Today’s Activities/ });
  const assignedReadingToggle = page.getByTestId("dashboard-assigned-reading").getByRole("button", { name: /Today’s Reading/ });
  const progressToggle = page.getByTestId("dashboard-progress").getByRole("button", { name: /^Progress/ });
  const mountainToggle = page.getByTestId("dashboard-mountain-rhythm").getByRole("button", { name: /Mountain Rhythm/ });

  await expect(scheduleToggle).toHaveAttribute("aria-expanded", "true");
  await expect(assignedReadingToggle).toHaveAttribute("aria-expanded", "true");
  await expect(progressToggle).toHaveAttribute("aria-expanded", "false");
  await expect(mountainToggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("dashboard-assigned-reading")).toBeVisible();
  await expect(page.getByTestId("dashboard-assigned-reading-overview")).toBeVisible();

  await scheduleToggle.click();
  await assignedReadingToggle.click();
  await progressToggle.click();
  await mountainToggle.click();
  await expect(scheduleToggle).toHaveAttribute("aria-expanded", "false");
  await expect(assignedReadingToggle).toHaveAttribute("aria-expanded", "false");
  await expect(progressToggle).toHaveAttribute("aria-expanded", "true");
  await expect(mountainToggle).toHaveAttribute("aria-expanded", "true");

  await page.reload();
  const reloadedScheduleToggle = page.getByTestId("dashboard-schedule").getByRole("button", { name: /Today’s Activities/ });
  const reloadedAssignedReadingToggle = page.getByTestId("dashboard-assigned-reading").getByRole("button", { name: /Today’s Reading/ });
  const reloadedProgressToggle = page.getByTestId("dashboard-progress").getByRole("button", { name: /^Progress/ });
  const reloadedMountainToggle = page.getByTestId("dashboard-mountain-rhythm").getByRole("button", { name: /Mountain Rhythm/ });
  await expect(reloadedScheduleToggle).toHaveAttribute("aria-expanded", "false");
  await expect(reloadedAssignedReadingToggle).toHaveAttribute("aria-expanded", "false");
  await expect(reloadedProgressToggle).toHaveAttribute("aria-expanded", "true");
  await expect(reloadedMountainToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("dashboard-assigned-reading")).toBeVisible();
  await expect(page.getByTestId("dashboard-assigned-reading-overview")).toBeHidden();

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("dashboard-schedule").getByRole("button", { name: /Today’s Activities/ }))
    .toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("dashboard-assigned-reading").getByRole("button", { name: /Today’s Reading/ }))
    .toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("dashboard-progress").getByRole("button", { name: /^Progress/ }))
    .toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("dashboard-mountain-rhythm").getByRole("button", { name: /Mountain Rhythm/ }))
    .toHaveAttribute("aria-expanded", "false");
});

test("keeps dashboard tab containers lean and inside shared gutters", async ({ page }) => {
  const plan = makeOrdinaryPlan();
  await stubHomeApi(page, plan);
  await seedPlans(page, [plan]);

  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const tabs = ["Calendar", "Plans"];

    for (const tab of tabs) {
      const navigation = await openDashboardNavigation(page);
      await navigation.getByRole("button", { name: tab, exact: true }).click();

      const contentTestIds = tab === "Calendar"
        ? ["dashboard-calendar-activities", "dashboard-calendar-month"]
        : ["dashboard-plans-list", "dashboard-plan-details"];
      for (const testId of contentTestIds) {
        await expect(page.getByTestId(testId)).toBeVisible();
      }

      const layout = await page.evaluate((testIds) => {
        const surfaces = testIds.map((testId) => {
          const element = document.querySelector(`[data-testid="${testId}"]`);
          const rect = element?.getBoundingClientRect();
          const styles = element ? getComputedStyle(element) : null;
          return {
            testId,
            left: rect ? Math.round(rect.left) : -1,
            right: rect ? Math.round(rect.right) : Infinity,
            border: styles?.borderTopWidth || "",
            background: styles?.backgroundColor || "",
          };
        });
        return {
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          surfaces,
        };
      }, contentTestIds);

      expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
      for (const surface of layout.surfaces) {
        expect(surface.left).toBeGreaterThanOrEqual(12);
        expect(surface.right).toBeLessThanOrEqual(width - 12);
        expect(surface.border).toBe("1px");
        expect(surface.background).not.toBe("rgba(0, 0, 0, 0)");
      }

      if (tab === "Calendar") {
        await expect(page.getByTestId("calendar-event-form").locator(".discipleos-functional-surface")).toHaveCount(0);
      }
    }
  }
});

test("shows one contained empty Plans state without an abandoned detail column", async ({ page }) => {
  await stubHomeApi(page, []);
  await seedPlans(page, []);

  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const navigation = await openDashboardNavigation(page);
    await navigation.getByRole("button", { name: "Plans", exact: true }).click();

    const emptyState = page.getByTestId("dashboard-plans-empty-state");
    await expect(emptyState).toHaveCount(1);
    await expect(emptyState.getByText("No reading plans yet.", { exact: true })).toHaveCount(1);
    await expect(page.getByText("No reading plan selected yet", { exact: false })).toHaveCount(0);
    await expect(page.getByTestId("dashboard-plan-details")).toHaveCount(0);
    await expect(page.getByTestId("plans-empty-create-button")).toBeVisible();

    const layout = await page.evaluate(() => {
      const empty = document.querySelector('[data-testid="dashboard-plans-empty-state"]');
      const list = document.querySelector('[data-testid="dashboard-plans-list"]');
      const emptyRect = empty?.getBoundingClientRect();
      const listRect = list?.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        empty: emptyRect
          ? { left: emptyRect.left, right: emptyRect.right, height: emptyRect.height }
          : null,
        list: listRect ? { left: listRect.left, right: listRect.right } : null,
      };
    });
    expect(layout.documentWidth).toBeLessThanOrEqual(width + 1);
    expect(layout.empty?.left ?? -1).toBeGreaterThanOrEqual(12);
    expect(layout.empty?.right ?? Infinity).toBeLessThanOrEqual(width - 12);
    expect(layout.empty?.height ?? 0).toBeGreaterThan(80);
    expect(layout.empty?.height ?? Infinity).toBeLessThan(260);
    expect(layout.list?.left ?? -1).toBeGreaterThanOrEqual(12);
    expect(layout.list?.right ?? Infinity).toBeLessThanOrEqual(width - 12);

    await page.getByTestId("plans-empty-create-button").click();
    await expect(page.getByTestId("dashboard-build-form")).toBeVisible();
  }
});

test("keeps every desktop and tablet navigation control visible without overflow", async ({ page }) => {
  const plan = makeOrdinaryPlan();
  await stubHomeApi(page, plan);
  await seedPlans(page, [plan]);

  for (const width of [1024, 1280, 1366, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const navigation = page.getByTestId("dashboard-navigation-row");
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole("button", { name: "Today", exact: true })).toBeVisible();
    const layout = await navigation.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const controls = Array.from(
        element.querySelectorAll<HTMLElement>(
          'button[aria-pressed], a[data-testid="link-mountain-rhythm-entry"], button:not([aria-pressed])',
        ),
      ).filter((control) => {
        const rect = control.getBoundingClientRect();
        const styles = getComputedStyle(control);
        return rect.width > 0 && rect.height > 0 && styles.visibility !== "hidden" && styles.display !== "none";
      }).map((control) => {
        const controlRect = control.getBoundingClientRect();
        const textRect = document.createRange();
        textRect.selectNodeContents(control);
        const textBounds = Array.from(textRect.getClientRects()).filter(
          ({ width: textWidth, height: textHeight }) => textWidth > 0 && textHeight > 0,
        );
        return {
          label: control.textContent?.trim(),
          left: controlRect.left,
          right: controlRect.right,
          height: controlRect.height,
          textRight: Math.max(...textBounds.map(({ right }) => right)),
          controlRight: controlRect.right,
        };
      });
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        rowLeft: rect.left,
        rowRight: rect.right,
        rowScrollWidth: element.scrollWidth,
        rowClientWidth: element.clientWidth,
        overflowX: getComputedStyle(element).overflowX,
        controls,
      };
    });
    expect(layout.documentWidth).toBeLessThanOrEqual(width + 1);
    expect(layout.rowLeft).toBeGreaterThanOrEqual(0);
    expect(layout.rowRight).toBeLessThanOrEqual(width);
    expect(layout.rowScrollWidth).toBeLessThanOrEqual(layout.rowClientWidth + 1);
    expect(layout.overflowX).not.toMatch(/auto|scroll/);
    expect(layout.controls).toHaveLength(6);
    for (const control of layout.controls) {
      expect(control.left).toBeGreaterThanOrEqual(layout.rowLeft - 1);
      expect(control.right).toBeLessThanOrEqual(layout.rowRight + 1);
      expect(control.height).toBeGreaterThanOrEqual(44);
      expect(control.textRight).toBeLessThanOrEqual(control.controlRight + 1);
    }
  }
});

test("keeps long content inset and fully visible across responsive dashboard widths", async ({ page }) => {
  const longPlanName = "A very long morning Scripture plan that should wrap instead of clipping";
  const longReadingLabel = "Psalm 119:105 — a long assigned reading label that should remain readable";
  const longEventTitle = "A long prayer and fellowship event title that should wrap inside the calendar row";
  const longEventNotes = "A longer note with enough words to expose fixed-width children and unintended horizontal overflow.";
  const plan = makeOrdinaryPlan("visual-inset-plan", longPlanName);
  plan.assignments[0].readings[0].label = longReadingLabel;
  const event = {
    id: "visual-inset-event",
    title: longEventTitle,
    type: "prayer",
    date: todayISO(),
    time: "06:30",
    notes: longEventNotes,
    remind: false,
    repeat: "none",
  };

  await stubHomeApi(page, plan, [event]);
  await seedPlans(page, [plan], [event]);

  for (const width of [320, 360, 390, 430, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const assigned = page.getByTestId("dashboard-assigned-reading");
    const assignedToggle = assigned.getByRole("button", { name: /Today’s Reading/ });
    if (await assignedToggle.getAttribute("aria-expanded") !== "true") {
      await assignedToggle.click();
    }
    await expect(assignedToggle).toHaveAttribute("aria-expanded", "true");
    await expect(assigned.getByTestId("dashboard-assigned-reading-overview")).toBeVisible();
    await expect(assigned.getByText(longPlanName, { exact: true })).toBeVisible();

    const homeLayout = await page.evaluate(() => {
      const viewport = window.innerWidth;
      const safeText = Array.from(document.querySelectorAll(".discipleos-safe-text"))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
          };
        });
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewport,
        unsafeText: safeText.filter(
          ({ left, right, scrollWidth, clientWidth }) =>
            left < -1 || right > viewport + 1 || scrollWidth > clientWidth + 1,
        ),
      };
    });
    expect(homeLayout.documentWidth).toBeLessThanOrEqual(width + 1);
    expect(homeLayout.unsafeText).toEqual([]);

    const visibleRows = await page.locator(".discipleos-flat-row:visible").evaluateAll((rows) =>
      rows.map((row) => {
        const rect = row.getBoundingClientRect();
        const content = row.firstElementChild?.getBoundingClientRect();
        return {
          inset: content ? content.left - rect.left : 0,
          rightInset: content ? rect.right - content.right : 0,
        };
      }),
    );
    for (const row of visibleRows) {
      expect(row.inset).toBeGreaterThanOrEqual(11);
      expect(row.rightInset).toBeGreaterThanOrEqual(11);
    }

    const navigation = await openDashboardNavigation(page);
    await navigation.getByRole("button", { name: "Calendar", exact: true }).click();
    await expect(page.getByText(longEventTitle, { exact: true })).toBeVisible();
    await expect(page.getByText(longEventNotes, { exact: true })).toBeVisible();

    const calendarLayout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(calendarLayout.documentWidth).toBeLessThanOrEqual(calendarLayout.viewport + 1);

    await openDashboardNavigation(page);
    const plansNavigation = width >= 768
      ? page.getByTestId("dashboard-navigation-row")
      : page.getByTestId("dashboard-navigation-panel");
    await plansNavigation.getByRole("button", { name: "Plans", exact: true }).click();
    const planCard = page.getByTestId("planned-reading-card-visual-inset-plan");
    await expect(planCard).toBeVisible();
    await expect(planCard.getByText(longPlanName, { exact: true })).toBeVisible();
    await expect(page.getByTestId("dashboard-plan-details").getByText(longReadingLabel, { exact: true })).toBeVisible();
    const planCardGeometry = await planCard.evaluate((card) => {
      const cardRect = card.getBoundingClientRect();
      const textRects: Array<{ left: number; right: number }> = [];
      const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        if (node.textContent?.trim()) {
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of Array.from(range.getClientRects())) {
            if (rect.width > 0 && rect.height > 0) {
              textRects.push({ left: rect.left, right: rect.right });
            }
          }
        }
        node = walker.nextNode();
      }
      return {
        leftInset: Math.min(...textRects.map(({ left }) => left - cardRect.left)),
        rightInset: Math.min(...textRects.map(({ right }) => cardRect.right - right)),
        scrollWidth: card.scrollWidth,
        clientWidth: card.clientWidth,
      };
    });
    expect(planCardGeometry.leftInset).toBeGreaterThanOrEqual(12);
    expect(planCardGeometry.rightInset).toBeGreaterThanOrEqual(12);
    expect(planCardGeometry.scrollWidth).toBeLessThanOrEqual(planCardGeometry.clientWidth + 1);
    console.log(`[planned-reading-card] ${JSON.stringify({ width, ...planCardGeometry })}`);
    if (width <= 430) {
      await page.screenshot({
        path: `screenshots/planned-reading-card-${width}.png`,
        fullPage: true,
      });
    }

    const plansLayout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(plansLayout.documentWidth).toBeLessThanOrEqual(plansLayout.viewport + 1);
  }
});

test("keeps Mountain Rhythm, auth, and 404 surfaces inside the viewport", async ({ page }) => {
  await stubMountainApi(page);

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });

    await page.goto("/mountain-rhythm");
    await expect(page.getByTestId("mountain-rhythm-panel")).toBeVisible();
    const mountainLayout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      panel: (() => {
        const element = document.querySelector('[data-testid="mountain-rhythm-panel"]');
        const rect = element?.getBoundingClientRect();
        return rect ? { left: rect.left, right: rect.right } : null;
      })(),
    }));
    expect(mountainLayout.documentWidth).toBeLessThanOrEqual(width + 1);
    expect(mountainLayout.panel?.left ?? -1).toBeGreaterThanOrEqual(12);
    expect(mountainLayout.panel?.right ?? Infinity).toBeLessThanOrEqual(width - 12);

    await page.goto("/sign-in");
    const authCard = page.locator(".discipleos-auth-card");
    await expect(authCard).toBeVisible();
    const authLayout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      card: (() => {
        const element = document.querySelector(".discipleos-auth-card");
        const rect = element?.getBoundingClientRect();
        return rect ? { left: rect.left, right: rect.right } : null;
      })(),
    }));
    expect(authLayout.documentWidth).toBeLessThanOrEqual(width + 1);
    expect(authLayout.card?.left ?? -1).toBeGreaterThanOrEqual(12);
    expect(authLayout.card?.right ?? Infinity).toBeLessThanOrEqual(width - 12);

    await page.goto("/responsive-contract-missing-route");
    const notFoundSurface = page.locator(".discipleos-functional-surface");
    await expect(notFoundSurface).toBeVisible();
    const notFoundLayout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      surface: (() => {
        const element = document.querySelector(".discipleos-functional-surface");
        const rect = element?.getBoundingClientRect();
        return rect ? { left: rect.left, right: rect.right } : null;
      })(),
    }));
    expect(notFoundLayout.documentWidth).toBeLessThanOrEqual(width + 1);
    expect(notFoundLayout.surface?.left ?? -1).toBeGreaterThanOrEqual(12);
    expect(notFoundLayout.surface?.right ?? Infinity).toBeLessThanOrEqual(width - 12);
  }
});

test("shares page geometry and full-size control baselines across dashboard and Mountain Rhythm", async ({ page }) => {
  const plan = makeOrdinaryPlan();
  await stubHomeApi(page, plan);
  await seedPlans(page, [plan]);

  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const homeGeometry = await page.evaluate(() => {
      const content = document.querySelector(".discipleos-content");
      const buildButton = document.querySelector('[data-testid="dashboard-navigation-row"] button[aria-pressed]');
      const styles = content ? getComputedStyle(content) : null;
      return {
        paddingLeft: styles?.paddingLeft || "",
        paddingRight: styles?.paddingRight || "",
        maxWidth: styles?.maxWidth || "",
        overflowX: getComputedStyle(document.documentElement).overflowX,
        firstNavigationControlHeight: buildButton?.getBoundingClientRect().height || 0,
      };
    });

    if (width >= 768) {
      const buildPage = await openCreatePlanFromEmptyState(page, width);
      await buildPage.getByTestId("plan-create-preset-newTestament").click();
      await buildPage.getByTestId("plan-create-next").click();
      const controlHeights = await buildPage.getByTestId("dashboard-build-form")
        .locator('input:not([type="checkbox"]):not([type="radio"]):not(.h-9), select')
        .evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().height)));
      expect(controlHeights.length).toBeGreaterThan(0);
      expect(new Set(controlHeights).size).toBe(1);
      expect(controlHeights[0]).toBe(44);
      await buildPage.close();
    }

    await page.unrouteAll();
    await stubMountainApi(page);
    await page.goto("/mountain-rhythm");
    await expect(page.getByTestId("mountain-rhythm-mountain")).toBeVisible();
    const mountainGeometry = await page.evaluate(() => {
      const content = document.querySelector(".discipleos-content");
      const heading = document.querySelector("main h1");
      const styles = content ? getComputedStyle(content) : null;
      const panel = document.querySelector('[data-testid="mountain-rhythm-panel"]');
       const chart = document.querySelector('[data-testid="mountain-rhythm-mountain"]');
      return {
        paddingLeft: styles?.paddingLeft || "",
        paddingRight: styles?.paddingRight || "",
        maxWidth: styles?.maxWidth || "",
        headingLeft: heading ? Math.round(heading.getBoundingClientRect().left) : -1,
        panelBorder: panel ? getComputedStyle(panel).borderTopWidth : "",
        panelBackground: panel ? getComputedStyle(panel).backgroundColor : "",
        chartRadius: chart ? getComputedStyle(chart).borderTopLeftRadius : "",
      };
    });

    expect(mountainGeometry.paddingLeft).toBe(homeGeometry.paddingLeft);
    expect(mountainGeometry.paddingRight).toBe(homeGeometry.paddingRight);
    expect(mountainGeometry.maxWidth).toBe(homeGeometry.maxWidth);
    expect(mountainGeometry.headingLeft).toBeGreaterThanOrEqual(Number.parseInt(homeGeometry.paddingLeft, 10));
    expect(mountainGeometry.panelBorder).toBe("1px");
    expect(mountainGeometry.panelBackground).not.toBe("rgba(0, 0, 0, 0)");
    expect(mountainGeometry.chartRadius).toBe("0px");
  }
});

test("keeps empty, create, edit, auth, and fallback states on the shared visual contract", async ({ page }) => {
  const plan = makeOrdinaryPlan();
  await stubHomeApi(page, plan);
  await seedPlans(page, [plan]);
  await page.goto("/");

  await expect(page.getByTestId("dashboard-assigned-reading")).toBeVisible();
  await expect(page.getByText("Today’s Reading", { exact: true })).toBeVisible();
  await expect(page.getByTestId("dashboard-assigned-reading").locator(".discipleos-item-surface")).toHaveCount(0);

  const buildPage = await openCreatePlanFromEmptyState(page, 1280);
  await expect(buildPage.getByTestId("dashboard-build-form").locator(".discipleos-functional-surface")).toHaveCount(0);
  await buildPage.close();

  await page.goto("/");
  const navigation = await openDashboardNavigation(page);
  await openDashboardNavigation(page);
  await page.getByTestId("dashboard-navigation-row").getByRole("button", { name: "Plans", exact: true }).click();
  await expect(page.getByTestId("dashboard-plans-list")).toBeVisible();
  const planCard = page.getByTestId(`planned-reading-card-${plan.id}`);
  await planCard.click();
  await expect(page.getByTestId("dashboard-plan-details")).toBeVisible();
  await planCard.locator("button").first().click();
  await expect(page.getByTestId("dashboard-plan-edit-form")).toBeVisible();
  await expect(page.getByTestId("dashboard-plan-edit-form").locator(".discipleos-item-surface")).toHaveCount(0);

  await page.goto("/sign-in");
  await expect(page.locator(".discipleos-auth-card")).toBeVisible();
  const authCard = page.locator(".discipleos-auth-card");
  await expect(authCard.locator("input").first()).toBeVisible();
  expect(await authCard.evaluate((element) => getComputedStyle(element).maxWidth)).toBe("400px");

  await page.goto("/visual-polish-missing-route");
  await expect(page.getByText("404 Page Not Found", { exact: true })).toBeVisible();
  await expect(page.locator(".discipleos-functional-surface")).toBeVisible();
});