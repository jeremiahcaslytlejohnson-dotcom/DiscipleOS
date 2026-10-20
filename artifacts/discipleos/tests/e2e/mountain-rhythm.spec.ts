import { expect, test, type Page } from "@playwright/test";
import { climbDatesInRange, fastingDatesForClimb, isFastingDateAllowed } from "../../src/lib/discipline-schedule";

const STORAGE_KEY = "discipleos-data";

type PlanOptions = {
  id: string;
  days: 7 | 20 | 40;
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
    journeyKey: days === 7 ? "7-day-climb" : days === 20 ? "20-day-reset" : "40-day-climb",
    journeyType: days === 7 ? "7-day-climb" : days === 20 ? "20-day-reset" : "40-day-climb",
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

async function stubApi(
  page: Page,
  sessionInfo: Record<string, unknown> = { success: true, established: false },
  options: { failPlanPosts?: boolean } = {},
) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname.endsWith("/session/info")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(sessionInfo),
      });
      return;
    }

    if (pathname.endsWith("/reading/plans")) {
      if (request.method() === "POST" && options.failPlanPosts) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ success: false, error: "Temporary sync failure" }),
        });
        return;
      }
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
  options: {
    stripCompletionHistoryOnRead?: boolean;
    failPlanPosts?: boolean;
  } = {},
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
        if (options.failPlanPosts) {
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ success: false, error: "Temporary sync failure" }),
          });
          return;
        }
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

async function seedLocalData(
  page: Page,
  plans: unknown[],
  selectedPlanId: string | null,
  options: {
    ownerId?: string | null;
    pendingOps?: unknown[];
    events?: unknown[];
  } = {},
) {
  await page.addInitScript(
    ({ plans: seededPlans, selectedId, ownerId, pendingOps, events }) => {
      if (localStorage.getItem("discipleos-seed-applied") === "true") return;
      localStorage.setItem(
        "discipleos-data",
        JSON.stringify({
          ownerId,
          plans: seededPlans,
          events,
          eventCompletions: {},
          selectedPlanId: selectedId,
        }),
      );
      if (pendingOps) {
        localStorage.setItem(
          "discipleos:pendingOps",
          JSON.stringify({ ownerId, ops: pendingOps }),
        );
      }
      localStorage.setItem("discipleos-seed-applied", "true");
    },
    {
      plans,
      selectedId: selectedPlanId,
      ownerId: options.ownerId ?? null,
      pendingOps: options.pendingOps,
      events: options.events ?? [],
    },
  );
}

async function openMountainRhythm(page: Page) {
  await page.goto("/mountain-rhythm");
  await expect(
    page.getByRole("heading", { name: "Mountain Rhythm", exact: true }),
  ).toBeVisible();
  await page.locator(".launch-splash").waitFor({ state: "detached" });
  await expect(page.getByTestId("button-choose-7-day-climb")).toBeVisible();
}

async function expandPastClimbs(page: Page) {
  const history = page.getByTestId("mountain-rhythm-past-climbs");
  await expect(history).toBeVisible();
  if (!(await history.getAttribute("open"))) {
    await history.locator("summary").click();
  }
  return history;
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
    "Consistency",
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
      name: new RegExp(`${journeyLabel} recent seven-day reading-rhythm trail`),
    }),
  ).toBeVisible();
  await expect(mountainPanel.getByTestId("mountain-rhythm-elevation-guides").locator("g"))
    .toHaveCount(5);
  await expect(mountainPanel.getByTestId("mountain-rhythm-stage-rail")).toHaveCount(0);
  await expect(mountainPanel.getByTestId("mountain-rhythm-current-status"))
    .toContainText("Current:");
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

test("automatically starts a 7-Day Climb for an anonymous session with a user ID", async ({ page }) => {
  await stubApi(page, {
    success: true,
    userId: "anonymous-mountain-session",
    authenticated: false,
    established: false,
  });
  await seedLocalData(page, [], null);
  const saveRequest = page.waitForRequest(
    (request) =>
      request.url().includes("/api/reading/plans") && request.method() === "POST",
  );
  await openMountainRhythm(page);

  await expect(page.getByText("7-Day Climb · active reading climb", { exact: true })).toBeVisible();
  await expect(page.getByTestId("button-choose-7-day-climb")).toContainText("7-Day Climb · In Progress");
  await expect(page.getByTestId("status-mountain-feedback")).toHaveCount(0);

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

test("fasting suggestions honor inclusive climb dates, cadence and date-only boundaries", () => {
  const start = "2026-10-15";
  const end = "2026-10-21";
  expect(climbDatesInRange(start, end)).toEqual([
    "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18",
    "2026-10-19", "2026-10-20", "2026-10-21",
  ]);
  expect(fastingDatesForClimb(start, end, "2026-10-15", "7-day-climb")).toEqual(["2026-10-15"]);
  expect(fastingDatesForClimb(start, end, "2026-10-19", "7-day-climb")).toEqual(["2026-10-19"]);
  expect(fastingDatesForClimb(start, end, "2026-10-22", "7-day-climb")).toEqual([]);
  expect(isFastingDateAllowed("2026-10-15", start, end, "2026-10-15")).toBe(true);
  expect(isFastingDateAllowed(end, start, end, "2026-10-15")).toBe(true);
  expect(isFastingDateAllowed("2026-10-22", start, end, "2026-10-15")).toBe(false);
  expect(isFastingDateAllowed("2026-10-14", start, end, "2026-10-15")).toBe(false);
  expect(isFastingDateAllowed("2026-02-30", start, end, "2026-10-15")).toBe(false);
  expect(climbDatesInRange("2026-12-30", "2027-01-02")).toEqual([
    "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02",
  ]);
  expect(climbDatesInRange("2024-02-28", "2024-03-01")).toEqual([
    "2024-02-28", "2024-02-29", "2024-03-01",
  ]);

  expect(fastingDatesForClimb("2026-01-01", "2026-01-20", "2026-01-01", "20-day-reset"))
    .toEqual(["2026-01-01", "2026-01-11"]);
  expect(fastingDatesForClimb("2026-01-01", "2026-02-09", "2026-01-01", "40-day-climb"))
    .toEqual(["2026-01-01", "2026-01-11", "2026-01-21", "2026-01-31"]);
  expect(fastingDatesForClimb("2026-01-01", "2026-01-20", "2026-01-12", "20-day-reset"))
    .toEqual([]);
  expect(fastingDatesForClimb("2026-01-01", "2027-01-01", "2026-01-01", "future"))
    .toEqual([]);
});

test("declining both commitments records neither choice without creating events", async ({ page }) => {
  await stubApi(page, {
    success: true,
    userId: "anonymous-no-discipline-session",
    authenticated: false,
    established: false,
  });
  await seedLocalData(page, [], null, { ownerId: "anonymous-no-discipline-session" });
  await openMountainRhythm(page);
  const tracker = page.getByTestId("mountain-rhythm-disciplines");
  let eventPosts = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/events") && request.method() === "POST") eventPosts++;
  });
  await tracker.getByRole("button", { name: "Neither / Not now" }).click();
  await expect(tracker.getByTestId("mountain-rhythm-commitment-invitation")).toHaveCount(0);
  expect(eventPosts).toBe(0);
});

test("guides optional prayer setup through a confirmed start date and preserves Scripture progress", async ({ page }) => {
  await stubApi(page, {
    success: true,
    userId: "anonymous-mountain-session",
    authenticated: false,
    established: false,
  });
  await seedLocalData(page, [], null, { ownerId: "anonymous-mountain-session" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await openMountainRhythm(page);
  const tracker = page.getByTestId("mountain-rhythm-disciplines");
  await expect(tracker.getByRole("heading", { name: "Add Prayer or Fasting to Your Rhythm" })).toBeVisible();
  await expect(tracker.getByTestId("mountain-rhythm-commitment-invitation")).toContainText(
    "optional commitments",
  );
  const choices = tracker.getByRole("checkbox");
  await expect(choices.nth(0)).not.toBeChecked();
  await expect(choices.nth(1)).not.toBeChecked();
  const prayerCard = tracker.getByTestId("discipline-choice-card-prayer");
  const fastingCard = tracker.getByTestId("discipline-choice-card-fasting");
  const desktopCards = await Promise.all([prayerCard, fastingCard].map((card) =>
    card.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  ));
  expect(desktopCards[1].x).toBeGreaterThan(desktopCards[0].x);
  expect(Math.abs(desktopCards[1].y - desktopCards[0].y)).toBeLessThan(2);
  await prayerCard.getByText("Set aside time to pray").click();
  await expect(choices.nth(0)).toBeChecked();
  await choices.nth(1).focus();
  await choices.nth(1).press("Space");
  await expect(choices.nth(1)).toBeChecked();
  await choices.nth(1).press("Space");
  await expect(choices.nth(1)).not.toBeChecked();

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileCards = await Promise.all([prayerCard, fastingCard].map((card) =>
    card.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  ));
  expect(Math.abs(mobileCards[1].x - mobileCards[0].x)).toBeLessThan(2);
  expect(mobileCards[1].y).toBeGreaterThan(mobileCards[0].y);
  expect(mobileCards[1].x + mobileCards[1].width).toBeLessThanOrEqual(390);

  await fastingCard.getByText("Set your own fasting schedule").click();
  await tracker.getByRole("button", { name: "Continue" }).click();
  const startInput = tracker.getByLabel("Commitment start date");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const expectedTomorrow = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  await expect(startInput).toHaveValue(expectedTomorrow);
  let eventPosts = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/events") && request.method() === "POST") eventPosts++;
  });
  expect(eventPosts).toBe(0);
  await tracker.getByRole("button", { name: "Today", exact: true }).click();
  const startDate = await startInput.inputValue();
  await tracker.getByRole("button", { name: "Confirm start date" }).click();
  await expect(tracker.getByLabel("Prayer time")).toBeVisible();
  await expect(tracker.getByLabel("Prayer Sunday")).toHaveAttribute("aria-pressed", "true");
  await expect(tracker.getByLabel("Prayer Monday")).toHaveAttribute("aria-pressed", "true");
  await expect(tracker.getByLabel("Prayer Saturday")).toHaveAttribute("aria-pressed", "true");
  await tracker.getByLabel("Prayer time").fill("07:15");
  await tracker.getByRole("button", { name: "Next", exact: true }).click();
  await expect(tracker.getByRole("heading", { name: "Choose fasting days within this climb" })).toBeVisible();
  await expect(tracker.getByRole("button", { name: /^Day 1/ })).toHaveAttribute("aria-pressed", "true");
  await expect(tracker.getByRole("button", { name: /^Day 7/ })).toBeVisible();
  for (let day = 2; day <= 7; day++) {
    await tracker.getByRole("button", { name: new RegExp(`^Day ${day}`) }).click();
  }
  for (let day = 1; day <= 7; day++) {
    await expect(tracker.getByRole("button", { name: new RegExp(`^Day ${day}`) })).toHaveAttribute("aria-pressed", "true");
  }
  await expect(tracker.getByLabel("Send fasting reminder")).toBeChecked();
  await expect(tracker.getByLabel("Fasting reminder lead time")).toHaveValue("720");
  await expect(tracker.getByLabel("Commitment time")).toHaveCount(0);
  await tracker.getByRole("button", { name: "Next", exact: true }).click();
  await expect(tracker.getByRole("heading", { name: "Review your schedule" })).toBeVisible();
  await expect(tracker.getByTestId("fasting-review-date")).toHaveCount(7);
  const prayerRequest = page.waitForRequest(
    (request) => request.url().endsWith("/api/events") && request.method() === "POST" && request.postDataJSON()?.type === "prayer",
  );
  const fastingRequest = page.waitForRequest(
    (request) => request.url().endsWith("/api/events") && request.method() === "POST" && request.postDataJSON()?.type === "fast",
  );
  await tracker.getByRole("button", { name: "Save schedule" }).click();
  await expect(tracker.getByRole("button", { name: "Saving…" })).toBeVisible();
  const savedPrayer = (await prayerRequest).postDataJSON();
  const savedFast = (await fastingRequest).postDataJSON();
  await expect(tracker.getByRole("button", { name: "Saving…" })).toHaveCount(0);
  expect(savedPrayer.type).toBe("prayer");
  expect(savedPrayer.repeat).toBe("weekly");
  expect(savedPrayer.repeatWeekdays).toHaveLength(7);
  expect(savedPrayer.date).toBe(startDate);
  expect(savedPrayer.time).toBe("07:15");
  expect(savedPrayer.remind).toBe(true);
  expect(savedPrayer.repeatUntil).toBeTruthy();
  expect(savedFast.type).toBe("fast");
  expect(savedFast.time).toBe("");
  expect(savedFast.remind).toBe(true);
  expect(savedFast.reminderMinutes).toBe(720);
  expect(savedFast.repeat).toBe("none");
  expect(savedFast.date).toBe(startDate);
  expect(eventPosts).toBe(8);

  const completionRequest = page.waitForRequest(
    (request) => request.url().endsWith("/api/events/complete") && request.method() === "POST",
  );
  await tracker.getByText("Mark complete", { exact: true }).first().click();
  expect((await completionRequest).postDataJSON()).toMatchObject({
    eventId: savedPrayer.id,
    completed: true,
  });
  await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("0 of 7 planned days");

  await page.reload();
  const restoredTracker = page.getByTestId("mountain-rhythm-disciplines");
  await expect(restoredTracker.getByRole("checkbox").nth(0)).toBeChecked();
  await expect(restoredTracker.getByRole("checkbox").nth(1)).toBeChecked();
  await expect(restoredTracker.getByTestId("mountain-rhythm-commitment-invitation")).toHaveCount(0);
  await expect(restoredTracker).toContainText("07:15 · Weekly");
  await expect(restoredTracker).toContainText("7 all-day dates");
  await expect(restoredTracker.getByTestId("discipline-summary-prayer"))
    .toContainText("Prayer: 1 of 1 scheduled times completed");
  const undoPrayerRequest = page.waitForRequest(
    (request) => request.url().endsWith("/api/events/complete") && request.method() === "POST",
  );
  await restoredTracker.getByRole("button", { name: `Undo prayer for ${startDate}` }).click();
  expect((await undoPrayerRequest).postDataJSON()).toMatchObject({
    eventId: savedPrayer.id,
    occurrenceDate: startDate,
    completed: false,
  });
  const redoPrayerRequest = page.waitForRequest(
    (request) => request.url().endsWith("/api/events/complete") && request.method() === "POST",
  );
  await restoredTracker.getByRole("button", { name: `Mark complete prayer for ${startDate}` }).click();
  expect((await redoPrayerRequest).postDataJSON()).toMatchObject({
    eventId: savedPrayer.id,
    occurrenceDate: startDate,
    completed: true,
  });
  const editPrayer = restoredTracker.getByRole("button", { name: "Edit schedule" }).first();
  await editPrayer.click();
  await restoredTracker.getByRole("button", { name: "Next", exact: true }).click();
  const repeatedSave = page.waitForRequest(
    (request) => request.url().endsWith("/api/events") && request.method() === "POST" && request.postDataJSON()?.type === "prayer",
  );
  await restoredTracker.getByRole("button", { name: "Save schedule" }).click();
  expect((await repeatedSave).postDataJSON().id).toBe(savedPrayer.id);
  await expect(restoredTracker.getByTestId("discipline-summary-prayer"))
    .toContainText("Prayer: 1 of 1 scheduled times completed");
  await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("0 of 7 planned days");
  await restoredTracker.getByRole("checkbox").nth(1).check();
  await expect(restoredTracker.getByRole("checkbox").nth(1)).toBeChecked();
  await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("0 of 7 planned days");

  page.on("dialog", (dialog) => dialog.accept());
  const endEarlyRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/events") &&
      request.method() === "POST" &&
      request.postDataJSON()?.id === savedPrayer.id &&
      request.postDataJSON()?.repeatUntil === startDate,
  );
  await restoredTracker.getByRole("button", { name: "End early" }).first().click();
  expect((await endEarlyRequest).postDataJSON()).toMatchObject({
    id: savedPrayer.id,
    repeatUntil: startDate,
  });
  await expect(restoredTracker.getByRole("checkbox").nth(0)).not.toBeChecked();
  await expect(restoredTracker.getByTestId("discipline-summary-prayer"))
    .toContainText("Prayer: 1 of 1 scheduled times completed");
});

test("shares one prayer occurrence completion between Mountain Rhythm and Calendar", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const plan = makePlan({
    id: "stage2-cross-view-plan",
    days: 7,
    name: "7-Day Climb",
    today,
  });
  const prayerEvent = {
    id: "stage2-cross-view-prayer",
    title: "Prayer time",
    type: "prayer",
    date: today,
    time: "06:30",
    repeat: "weekly",
    repeatWeekdays: [0, 1, 2, 3, 4, 5, 6],
    repeatUntil: plan.endDate,
  };
  plan.disciplineTracking = {
    setupAnswered: true,
    prayer: { enabled: true, eventIds: [prayerEvent.id] },
    fasting: { enabled: false, eventIds: [] },
  };
  await stubApi(page, {
    success: true,
    userId: "stage2-cross-view-owner",
    authenticated: false,
    established: false,
  });
  await seedLocalData(page, [plan], plan.id, {
    ownerId: "stage2-cross-view-owner",
    events: [prayerEvent],
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/mountain-rhythm");
  const tracker = page.getByTestId("mountain-rhythm-disciplines");
  await expect(tracker).toBeVisible();
  await expect(tracker.getByTestId("discipline-summary-prayer"))
    .toContainText("Prayer: 0 of 1 scheduled times completed");
  await tracker.getByRole("button", { name: `Mark complete prayer for ${today}` }).click();
  await expect(tracker.getByTestId("discipline-summary-prayer"))
    .toContainText("Prayer: 1 of 1 scheduled times completed");

  await page.goto("/");
  await page.getByTestId("dashboard-navigation-row").getByRole("button", { name: "Calendar", exact: true }).click();
  const activities = page.getByTestId("dashboard-calendar-activities");
  await expect(activities.getByRole("button", { name: "Reopen activity" })).toBeVisible();
  await activities.getByRole("button", { name: "Reopen activity" }).click();
  await expect(activities.getByRole("button", { name: "Complete activity" })).toBeVisible();

  await page.goto("/mountain-rhythm");
  await expect(page.getByTestId("mountain-rhythm-disciplines")
    .getByTestId("discipline-summary-prayer"))
    .toContainText("Prayer: 0 of 1 scheduled times completed");
});

test("requires confirmation to replace a hidden active climb and keeps unrelated local plans", async ({ page }) => {
  const ownerId = "anonymous-replacement-owner";
  const existingPlan = makePlan({
    id: "ordinary-kept-during-replacement",
    days: 7,
    name: "Ordinary reading plan",
    today: "2026-10-12",
  });
  existingPlan.journeyKey = "custom";
  existingPlan.journeyType = "custom";
  const hiddenClimb = makePlan({
    id: "hidden-server-climb",
    days: 7,
    name: "7-Day Climb",
    today: "2026-10-12",
    completedIndexes: [0],
  });
  let serverPlans: any[] = [];
  let replacementCalls = 0;
  let replacementRequest: any = null;
  let sessionEstablished = false;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith("/session/info")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          userId: ownerId,
          authenticated: false,
          established: sessionEstablished,
        }),
      });
    } else if (pathname.endsWith("/reading/plans") && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, plans: serverPlans }),
      });
    } else if (pathname.endsWith("/reading/plans") && request.method() === "POST") {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "A structured climb is already active",
          activePlanId: hiddenClimb.id,
        }),
      });
    } else if (pathname.endsWith("/reading/plans/replace-active")) {
      replacementCalls += 1;
      replacementRequest = request.postDataJSON();
      const newPlan = replacementRequest.plan;
      const oldPlan = {
        ...hiddenClimb,
        structuredLifecycle: "cancelled",
        cancelledAt: new Date().toISOString(),
        supersededByPlanId: newPlan.id,
      };
      serverPlans = [newPlan, oldPlan];
      sessionEstablished = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, replacedPlan: oldPlan, plan: newPlan }),
      });
    } else if (pathname.endsWith("/events")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, events: [] }),
      });
    } else if (pathname.endsWith("/rhythm/score")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, eventCompletions: [] }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    }
  });
  await seedLocalData(page, [existingPlan], existingPlan.id, {
    ownerId,
    events: [{ id: "kept-event", title: "Keep this activity", type: "prayer", date: "2026-10-12", time: "06:00" }],
  });

  await openMountainRhythm(page);
  const dialog = page.getByTestId("dialog-replace-active-climb");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Its progress will not transfer");
  await expect(dialog).toContainText("Ordinary reading plans, activities, and pending changes");
  const pendingWrites = JSON.stringify({
    ownerId,
    ops: [{ type: "upsert-plan", payload: { id: "unrelated-pending-plan" }, ts: 1 }],
  });
  await page.evaluate(
    (value) => localStorage.setItem("discipleos:pendingOps", value),
    pendingWrites,
  );
  await dialog.getByTestId("button-decline-climb-replacement").click();
  await expect(dialog).toHaveCount(0);
  expect(replacementCalls).toBe(0);

  await page.getByTestId("button-choose-7-day-climb").click();
  await expect(dialog).toBeVisible();
  await dialog.getByTestId("button-confirm-climb-replacement").click();
  await expect(dialog).toHaveCount(0);
  expect(replacementCalls).toBe(1);
  expect(replacementRequest.expectedActivePlanId).toBe(hiddenClimb.id);
  expect(replacementRequest.plan.id).not.toBe(hiddenClimb.id);
  expect(replacementRequest.plan.completed).toEqual({});

  const saved = await page.evaluate(() => ({
    data: JSON.parse(localStorage.getItem("discipleos-data") || "{}"),
    pending: localStorage.getItem("discipleos:pendingOps"),
  }));
  expect(saved.data.plans.find((plan: any) => plan.id === existingPlan.id)).toBeTruthy();
  expect(saved.data.plans.find((plan: any) => plan.id === hiddenClimb.id)).toMatchObject({
    structuredLifecycle: "cancelled",
    completed: hiddenClimb.completed,
  });
  expect(
    saved.data.plans.find((plan: any) => plan.id === replacementRequest.plan.id),
  ).toMatchObject({ completed: {}, journeyKey: "7-day-climb" });
  expect(saved.data.events).toEqual([{ id: "kept-event", title: "Keep this activity", type: "prayer", date: "2026-10-12", time: "06:00" }]);
  expect(saved.pending).toBe(pendingWrites);

  await page.reload();
  await expect(page.getByTestId("mountain-rhythm-metric-journey"))
    .toContainText("0 of 7 planned days");
  expect(replacementCalls).toBe(1);
});

test("starts a fresh 7-Day Climb after an expired one and keeps it selected after rehydration", async ({
  page,
}) => {
  const today = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
  });
  const expiredPlan = makePlan({
    id: "expired-7-day-climb",
    days: 7,
    name: "7-Day Climb",
    today,
    startOffset: -14,
  });
  const ordinaryPlan = {
    id: "ordinary-reading-plan",
    name: "Ordinary plan",
    assignments: [],
    completed: {},
  };
  const ownerId = "anonymous-history-session";
  await stubApi(page, {
    success: true,
    userId: ownerId,
    authenticated: false,
    established: false,
  });
  await seedLocalData(page, [expiredPlan], expiredPlan.id, { ownerId });

  const plansLoaded = page.waitForResponse(
    (response) =>
      response.url().includes("/api/reading/plans") && response.request().method() === "GET",
  );
  await openMountainRhythm(page);
  await plansLoaded;
  const saveRequest = page.waitForRequest(
    (request) =>
      request.url().includes("/api/reading/plans") && request.method() === "POST",
  );
  await page.getByTestId("button-choose-7-day-climb").click();

  const freshPlan = (await saveRequest).postDataJSON();
  expect(freshPlan.id).not.toBe(expiredPlan.id);
  expect(freshPlan.startDate).toBe(today);
  expect(freshPlan.assignments[0].date).toBe(today);
  expect(freshPlan.completed).toEqual({});

  await page.reload();
  await expect(
    page.getByText("7-Day Climb · active reading climb", { exact: true }),
  ).toBeVisible();
  const history = page.getByTestId("mountain-rhythm-past-climbs");
  await expect(history.locator("summary")).toContainText("Past climbs");
  await expect(history).not.toHaveAttribute("open", "");
  await expect(page.getByTestId(`past-climb-${expiredPlan.id}`)).toHaveCount(0);
  const tracker = page.getByTestId("mountain-rhythm-disciplines");
  await expect(tracker).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const mobilePositions = await page.evaluate(() => ({
    panelBottom: document.querySelector('[data-testid="mountain-rhythm-panel"]')?.getBoundingClientRect().bottom,
    invitationTop: document.querySelector('[data-testid="mountain-rhythm-commitment-invitation"]')?.getBoundingClientRect().top,
    invitationBottom: document.querySelector('[data-testid="mountain-rhythm-commitment-invitation"]')?.getBoundingClientRect().bottom,
    detailsTop: document.querySelector('[data-testid="mountain-rhythm-details-grid"]')?.getBoundingClientRect().top,
    trackerY: document.querySelector('[data-testid="mountain-rhythm-disciplines"]')?.getBoundingClientRect().top,
    historyY: document.querySelector('[data-testid="mountain-rhythm-past-climbs"]')?.getBoundingClientRect().top,
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
  }));
  expect(mobilePositions.invitationTop!).toBeGreaterThan(mobilePositions.panelBottom!);
  expect(mobilePositions.invitationBottom!).toBeLessThan(mobilePositions.detailsTop!);
  expect(mobilePositions.trackerY!).toBeLessThan(mobilePositions.historyY!);
  expect(mobilePositions.contentWidth).toBeLessThanOrEqual(mobilePositions.viewportWidth);
  await expandPastClimbs(page);
  await expect(page.getByTestId(`past-climb-${expiredPlan.id}`)).toContainText("Expired");
  await expect(page.getByTestId(`past-climb-${expiredPlan.id}`)).not.toContainText(expiredPlan.id);
  await expect.poll(async () =>
    page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
      return data.selectedPlanId;
    }),
  ).toBe(freshPlan.id);
  const persistedPlanIds = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
    return data.plans?.map((plan: any) => plan.id) || [];
  });
  expect(persistedPlanIds).toContain(expiredPlan.id);
  expect(persistedPlanIds).toContain(freshPlan.id);
  await expect.poll(async () =>
    page.evaluate((freshId) => {
      const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
      return data.plans?.some((plan: any) => plan.id === freshId);
    }, freshPlan.id),
  ).toBe(true);

});

test("cancels a device-only climb after confirmation without deleting history or reminders", async ({
  page,
}) => {
  const today = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
  });
  const activePlan = makePlan({
    id: "device-cancelled-climb",
    days: 7,
    name: "7-Day Climb",
    today,
    completedIndexes: [0],
  });
  const ordinaryPlan = {
    id: "device-ordinary-plan",
    name: "Ordinary reading plan",
    assignments: [],
    completed: {},
  };
  const calendarReminder = {
    id: "device-calendar-reminder",
    title: "Prayer night",
    type: "prayer",
    date: today,
    time: "19:00",
    remind: true,
    reminderMinutes: 10,
    repeat: "none",
  };

  const ownerId = "anonymous-cancellation-session";
  await stubApi(page, {
    success: true,
    userId: ownerId,
    authenticated: false,
    established: false,
  }, { failPlanPosts: true });
  await seedLocalData(page, [activePlan, ordinaryPlan], activePlan.id, {
    ownerId,
    events: [calendarReminder],
  });
  await openMountainRhythm(page);
  await expect(page.getByTestId("button-start-over-active-climb")).toHaveCount(0);
  await expect(page.getByTestId("button-request-cancel-active-climb")).toHaveCount(1);

  await page.getByTestId("button-request-cancel-active-climb").click();
  const dialog = page.getByTestId("dialog-cancel-active-climb");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Keep this climb" }).click();
  await expect(page.getByTestId("mountain-rhythm-route")).toBeVisible();

  await page.getByTestId("button-request-cancel-active-climb").click();
  await page.getByTestId("button-confirm-cancel-active-climb").click();
  await expect(page.getByTestId("mountain-rhythm-route")).toHaveCount(0);
  await expect(page.getByTestId("button-request-cancel-active-climb")).toHaveCount(0);
  const startChoice = page.getByTestId("button-choose-7-day-climb");
  await expect(startChoice).toBeVisible();
  await expect(startChoice).toBeEnabled();
  await expect(page.getByTestId("button-start-over-active-climb")).toHaveCount(0);
  await expect(page.getByTestId("mountain-rhythm-past-climbs").locator("summary")).toContainText("Past climbs");
  await expect(page.getByTestId("past-climb-device-cancelled-climb")).toHaveCount(0);
  await expandPastClimbs(page);
  await expect(page.getByTestId("mountain-rhythm-past-climbs")).toContainText(
    "7-Day Climb · Canceled",
  );

  const canceledState = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("discipleos-data") || "{}"),
  );
  const canceledPlan = canceledState.plans.find(
    (plan: any) => plan.id === activePlan.id,
  );
  expect(canceledState.selectedPlanId).toBeNull();
  expect(canceledPlan.structuredLifecycle).toBe("cancelled");
  expect(canceledPlan.completed).toEqual(activePlan.completed);
  expect(canceledPlan.earnedDayKeys).toEqual(activePlan.earnedDayKeys);
  expect(canceledState.plans.find((plan: any) => plan.id === ordinaryPlan.id)).toMatchObject(
    ordinaryPlan,
  );
  expect(canceledState.events).toEqual([calendarReminder]);
  const pendingCancellation = await page.evaluate(() => {
    const pending = JSON.parse(localStorage.getItem("discipleos:pendingOps") || "{}");
    return pending.ops?.find(
      (op: any) =>
        op.type === "upsert-plan" &&
        op.payload?.id === "device-cancelled-climb" &&
        op.payload?.structuredLifecycle === "cancelled",
    );
  });
  expect(pendingCancellation).toBeTruthy();

  await page.reload();
  await openMountainRhythm(page);
  await expect(page.getByTestId("button-request-cancel-active-climb")).toHaveCount(0);
  await expect(page.getByTestId("past-climb-device-cancelled-climb")).toHaveCount(0);
  await expandPastClimbs(page);
  await expect(page.getByTestId("mountain-rhythm-past-climbs")).toContainText(
    "7-Day Climb · Canceled",
  );
  const reloadedState = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("discipleos-data") || "{}"),
  );
  expect(reloadedState.plans.find((plan: any) => plan.id === activePlan.id).structuredLifecycle)
    .toBe("cancelled");
  expect(reloadedState.events).toEqual([calendarReminder]);

  let replaceActiveCalls = 0;
  page.on("request", (request) => {
    if (request.url().includes("/reading/plans/replace-active")) replaceActiveCalls += 1;
  });
  const freshPlanRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/reading/plans") &&
      request.method() === "POST",
  );
  await startChoice.click();
  await expect(page.getByTestId("mountain-rhythm-route")).toBeVisible();
  const freshPlan = (await freshPlanRequest).postDataJSON();
  expect(freshPlan.id).not.toBe(activePlan.id);
  expect(replaceActiveCalls).toBe(0);
  await expect(page.getByTestId("button-request-cancel-active-climb")).toHaveCount(1);
  await expect(page.getByTestId("button-start-over-active-climb")).toHaveCount(0);
  await expect(page.getByTestId(`button-reading-${activePlan.id}-0-a`)).toHaveCount(0);
  const restartedState = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("discipleos-data") || "{}"),
  );
  expect(restartedState.plans).toHaveLength(3);
  expect(restartedState.plans.find((plan: any) => plan.id === activePlan.id)).toMatchObject({
    structuredLifecycle: "cancelled",
    completed: activePlan.completed,
    earnedDayKeys: activePlan.earnedDayKeys,
  });
  expect(restartedState.plans.find((plan: any) => plan.id === freshPlan.id)).toBeTruthy();
  expect(
    restartedState.plans.filter(
      (plan: any) =>
        plan.journeyKey === "7-day-climb" && plan.structuredLifecycle !== "cancelled",
    ),
  ).toHaveLength(1);
  expect(restartedState.events).toEqual([calendarReminder]);
});

test("persists a signed-in climb cancellation without deleting plans or reading history", async ({
  page,
}) => {
  const today = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
  });
  const activePlan = makePlan({
    id: "account-cancelled-climb",
    days: 7,
    name: "7-Day Climb",
    today,
    completedIndexes: [0, 1],
  });
  const ordinaryPlan = {
    id: "account-ordinary-plan",
    name: "Ordinary reading plan",
    assignments: [],
    completed: {},
  };

  await stubAuthenticatedApi(page, ordinaryPlan, [activePlan]);
  await seedLocalData(page, [activePlan, ordinaryPlan], activePlan.id, {
    ownerId: "authenticated-mountain-user",
  });
  await openMountainRhythm(page);
  await page.getByTestId("button-request-cancel-active-climb").click();
  await page.getByTestId("button-confirm-cancel-active-climb").click();
  await expect(page.getByTestId("past-climb-account-cancelled-climb")).toHaveCount(0);
  await expandPastClimbs(page);
  await expect(page.getByTestId("mountain-rhythm-past-climbs")).toContainText(
    "7-Day Climb · Canceled",
  );

  await page.reload();
  await openMountainRhythm(page);
  await expect(page.getByTestId("button-request-cancel-active-climb")).toHaveCount(0);
  await expect(page.getByTestId("past-climb-account-cancelled-climb")).toHaveCount(0);
  await expandPastClimbs(page);
  await expect(page.getByTestId("mountain-rhythm-past-climbs")).toContainText(
    "7-Day Climb · Canceled",
  );
  const persistedState = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("discipleos-data") || "{}"),
  );
  const persistedClimb = persistedState.plans.find(
    (plan: any) => plan.id === activePlan.id,
  );
  expect(persistedClimb.structuredLifecycle).toBe("cancelled");
  expect(persistedClimb.completed).toEqual(activePlan.completed);
  expect(persistedClimb.earnedDayKeys).toEqual(activePlan.earnedDayKeys);
  expect(persistedState.plans.find((plan: any) => plan.id === ordinaryPlan.id)).toMatchObject(
    ordinaryPlan,
  );
});

test("aligns Mountain Rhythm desktop columns and stacks them on mobile", async ({
  page,
}) => {
  const today = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
  });
  const activePlan = makePlan({
    id: "aligned-mountain-columns",
    days: 7,
    name: "7-Day Climb",
    today,
  });
  const prayerEvent = {
    id: "aligned-today-prayer",
    title: "Prayer time",
    type: "prayer",
    date: today,
    time: "06:30",
    repeat: "daily",
    repeatWeekdays: [0, 1, 2, 3, 4, 5, 6],
    repeatUntil: activePlan.endDate,
  };
  const yesterday = addDays(today, -1);
  const oldPrayerEvent = { ...prayerEvent, id: "aligned-old-prayer", date: yesterday, repeatUntil: yesterday };
  const fastingEvent = {
    id: "aligned-today-fast",
    title: "Fasting commitment",
    type: "fast",
    date: today,
    repeat: "none",
  };
  activePlan.disciplineTracking = {
    setupAnswered: true,
    prayer: { enabled: true, eventIds: [prayerEvent.id, oldPrayerEvent.id] },
    fasting: { enabled: true, eventIds: [fastingEvent.id] },
  };
  const ownerId = "anonymous-layout-session";
  await stubApi(page, {
    success: true,
    userId: ownerId,
    authenticated: false,
    established: false,
  });
  await seedLocalData(page, [activePlan], activePlan.id, {
    ownerId,
    events: [prayerEvent, oldPrayerEvent, fastingEvent],
  });
  await openMountainRhythm(page);

  const tracker = page.getByTestId("mountain-rhythm-disciplines");
  await expect(tracker.getByRole("button", { name: "Set up commitments" })).toHaveCount(0);
  await expect(tracker.getByRole("button", { name: "Edit schedule" })).toHaveCount(2);
  await expect(tracker.getByTestId("discipline-summary-prayer")).toContainText("Prayer: 0 of 2 scheduled times completed");
  await expect(tracker.getByTestId("discipline-summary-fasting")).toContainText("Fasting: 0 of 1 scheduled days completed");
  await expect(tracker.getByTestId("discipline-recent-prayer")).not.toHaveAttribute("open", "");
  expect((await tracker.getByRole("button", { name: "Edit schedule" }).first().boundingBox())?.height)
    .toBeGreaterThanOrEqual(44);
  expect((await tracker.getByRole("button", { name: "End early" }).first().boundingBox())?.height)
    .toBeGreaterThanOrEqual(44);
  const todayPrayerAction = tracker.getByRole("button", { name: `Mark complete prayer for ${today}` });
  await expect(todayPrayerAction).toBeVisible();
  expect((await todayPrayerAction.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  const completeRequest = page.waitForRequest(
    (request) => request.url().endsWith("/api/events/complete") && request.method() === "POST",
  );
  await todayPrayerAction.click();
  expect((await completeRequest).postDataJSON()).toMatchObject({
    eventId: prayerEvent.id,
    occurrenceDate: today,
    completed: true,
  });
  await expect(tracker.getByRole("button", { name: `Undo prayer for ${today}` })).toBeVisible();
  const undoRequest = page.waitForRequest(
    (request) => request.url().endsWith("/api/events/complete") && request.method() === "POST",
  );
  await tracker.getByRole("button", { name: `Undo prayer for ${today}` }).click();
  expect((await undoRequest).postDataJSON()).toMatchObject({
    eventId: prayerEvent.id,
    occurrenceDate: today,
    completed: false,
  });
  await tracker.getByTestId("discipline-recent-prayer").locator("summary").evaluate(
    (summary: HTMLElement) => summary.click(),
  );
  await expect(tracker.getByRole("button", { name: `Mark complete prayer for ${yesterday}` })).toBeVisible();

  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => {
      const box = (testId: string) => {
        const rect = document.querySelector(`[data-testid="${testId}"]`)?.getBoundingClientRect();
        return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
      };
      return {
        documentWidth: document.documentElement.scrollWidth,
        card: box("mountain-rhythm-panel"),
        choose: box("mountain-rhythm-choose"),
        commitments: box("mountain-rhythm-disciplines"),
        details: Array.from(document.querySelector('[data-testid="mountain-rhythm-details-grid"]')?.children || []).map((child) => {
          const rect = child.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        }),
      };
    });
    expect(layout.documentWidth).toBeLessThanOrEqual(width + 1);
    expect(layout.card).not.toBeNull();
    expect(layout.choose).not.toBeNull();
    expect(layout.commitments).not.toBeNull();
    expect(layout.details).toHaveLength(2);

    if (width >= 1024) {
      expect(Math.abs(layout.card!.x - layout.choose!.x)).toBeGreaterThan(1);
      expect(Math.abs(layout.card!.y - layout.choose!.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(layout.card!.x - layout.details[0].x)).toBeLessThanOrEqual(1);
      expect(Math.abs(layout.choose!.x - layout.details[1].x)).toBeLessThanOrEqual(1);
      expect(layout.commitments!.y).toBeGreaterThan(layout.card!.y);
      await expect(page.getByTestId("mountain-rhythm-elevation-label-0")).toHaveText("Basecamp 0%");
    } else {
      expect(layout.commitments!.y).toBeGreaterThanOrEqual(layout.card!.y + layout.card!.height - 1);
      expect(layout.choose!.y).toBeGreaterThanOrEqual(layout.commitments!.y + layout.commitments!.height - 1);
    }
  }
});

test("shows climb selection before optional setup on a phone with no active climb", async ({ page }) => {
  const ownerId = "anonymous-empty-mountain-session";
  const expiredPlan = makePlan({
    id: "expired-climb-without-active-climb",
    days: 7,
    name: "7-Day Climb",
    today: new Date().toISOString().slice(0, 10),
    startOffset: -14,
  });
  await stubApi(page, {
    success: true,
    userId: ownerId,
    authenticated: false,
    established: false,
  });
  await seedLocalData(page, [expiredPlan], expiredPlan.id, { ownerId });
  await page.setViewportSize({ width: 375, height: 667 });
  await openMountainRhythm(page);

  const boxes = await page.evaluate(() => {
    const get = (selector: string) => {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect();
      return rect ? { top: rect.top, bottom: rect.bottom } : null;
    };
    return {
      card: get('[data-testid="mountain-rhythm-panel"]'),
      choose: get('[data-testid="mountain-rhythm-choose"]'),
      invitation: get('[data-testid="mountain-rhythm-commitment-invitation"]'),
      width: document.documentElement.scrollWidth,
    };
  });
  expect(boxes.width).toBeLessThanOrEqual(376);
  expect(boxes.card).not.toBeNull();
  expect(boxes.choose).not.toBeNull();
  expect(boxes.invitation).not.toBeNull();
  expect(boxes.choose!.top).toBeGreaterThanOrEqual(boxes.card!.bottom - 1);
  expect(boxes.invitation!.top).toBeGreaterThanOrEqual(boxes.choose!.bottom - 1);
});

test("does not replace an unsynced fresh climb with an expired server record", async ({
  page,
}) => {
  const today = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
  });
  const expiredPlan = makePlan({
    id: "expired-server-climb",
    days: 7,
    name: "7-Day Climb",
    today,
    startOffset: -14,
  });
  const freshPlan = makePlan({
    id: "fresh-unsynced-climb",
    days: 7,
    name: "7-Day Climb",
    today,
  });
  const ordinaryPlan = {
    id: "ordinary-reading-plan",
    name: "Ordinary plan",
    assignments: [],
    completed: {},
  };

  await stubAuthenticatedApi(page, ordinaryPlan, [expiredPlan], {
    failPlanPosts: true,
  });
  await seedLocalData(page, [expiredPlan, freshPlan], freshPlan.id, {
    ownerId: "authenticated-mountain-user",
    pendingOps: [
      {
        type: "upsert-plan",
        payload: freshPlan,
        ts: 1,
      },
    ],
  });
  await openMountainRhythm(page);

  await expect(
    page.getByText("7-Day Climb · active reading climb", { exact: true }),
  ).toBeVisible();
  await expect.poll(async () =>
    page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
      return data.selectedPlanId;
    }),
  ).toBe(freshPlan.id);
  await expect.poll(async () =>
    page.evaluate(() => {
      const pending = JSON.parse(
        localStorage.getItem("discipleos:pendingOps") || "{}",
      );
      return pending.ops?.some(
        (op: any) => op.type === "upsert-plan" && op.payload?.id === "fresh-unsynced-climb",
      );
    }),
  ).toBe(true);
});

test("plots each 7-Day Climb day as a separate ascent point", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const ownerId = "mountain-rhythm-visual-owner";
  const plan = makePlan({
    id: "point-by-point-climb",
    days: 7,
    name: "7-Day Climb",
    today,
    startOffset: -3,
    completedIndexes: [0, 1, 2, 3],
  });

  await stubApi(page, {
    success: true,
    userId: ownerId,
    authenticated: false,
    established: false,
  });
  await seedLocalData(page, [plan], plan.id, { ownerId });
  await openMountainRhythm(page);

  const chart = page.getByTestId("mountain-rhythm-mountain");
  await expect(chart.locator('[aria-label="Basecamp cabin"]')).toHaveCount(0);
  const pointY = await chart.locator('[data-testid^="mountain-rhythm-day-point-"]').evaluateAll(
    (points) => points.map((point) => Number(point.getAttribute("cy"))),
  );
  expect(pointY).toHaveLength(7);
  expect(pointY[0]).toBeGreaterThan(pointY[1]);
  expect(pointY[1]).toBeGreaterThan(pointY[2]);
  expect(pointY[2]).toBeGreaterThan(pointY[3]);
  expect(pointY[3]).toBeGreaterThan(pointY[4]);
  expect(pointY[4]).toBeGreaterThan(pointY[5]);
  expect(pointY[5]).toBeGreaterThan(pointY[6]);
  expect(pointY.every((y) => y >= 72 && y <= 302)).toBe(true);
  const mainRidge = chart.getByTestId("mountain-rhythm-main-ridge");
  const mainRidgeData = await mainRidge.getAttribute("d");
  expect(mainRidgeData).toContain("L28 258");
  expect(mainRidgeData).toContain("L291 105");
  expect(mainRidgeData?.match(/L/g)?.length).toBeGreaterThan(15);
  expect(mainRidgeData?.match(/L/g)?.length).toBeLessThan(24);
  await expect(chart.getByTestId("mountain-rhythm-far-range")).toBeVisible();
  await expect(chart.getByTestId("mountain-rhythm-mid-range")).toBeVisible();
  await expect(chart.getByTestId("mountain-rhythm-forest-depth")).toBeVisible();
  await expect(chart.getByTestId("mountain-rhythm-distant-ridges").locator("path")).toHaveCount(2);
  await expect(chart.getByTestId("mountain-rhythm-foreground-facets")).toHaveCount(0);
  const farRangeData = await chart.getByTestId("mountain-rhythm-far-range").getAttribute("d");
  const midRangeData = await chart.getByTestId("mountain-rhythm-mid-range").getAttribute("d");
  expect(farRangeData).not.toBe(midRangeData);
  const plannedPath = chart.getByTestId("mountain-rhythm-day-path");
  await expect(plannedPath).toHaveAttribute("stroke-dasharray", "3 5");
  await expect(plannedPath).toHaveAttribute(
    "aria-label",
    "Planned route after today; future elevation is not earned",
  );
  const earnedRoute = chart.getByTestId("mountain-rhythm-earned-route");
  const earnedRouteData = await earnedRoute.getAttribute("d");
  expect(earnedRouteData?.match(/M/g)).toHaveLength(1);
  await expect(chart.getByTestId("mountain-rhythm-earned-area")).toBeVisible();
  const dayPoints = await chart.locator('[data-testid^="mountain-rhythm-day-point-"]').evaluateAll(
    (points) =>
      points.map((point) => ({
        x: Number(point.getAttribute("cx")),
        y: Number(point.getAttribute("cy")),
      })),
  );
  expect(earnedRouteData).toContain(`${dayPoints[3].x}`);
  const recordedElevation = Number(
    (await chart.getByTestId("mountain-rhythm-day-point-4").getAttribute("aria-label"))
      ?.match(/([\d.]+)% rhythm elevation/)?.[1],
  );
  expect(dayPoints[3].y).toBeCloseTo(302 - (recordedElevation / 100) * 230, 1);
  const labelXs = await chart.getByTestId("mountain-rhythm-day-labels").locator("text").evaluateAll(
    (labels) => labels.map((label) => Number(label.getAttribute("x"))),
  );
    expect(labelXs).toEqual(dayPoints.map((point) => point.x));
    const chartBox = await chart.boundingBox();
    expect(chartBox).not.toBeNull();
    expect(chartBox!.height).toBeGreaterThanOrEqual(width < 640 ? 330 : 390);
    const labelBoxes = await chart.getByTestId("mountain-rhythm-day-labels").locator("text")
      .evaluateAll((labels) => labels.map((label) => {
        const box = label.getBoundingClientRect();
        return { height: box.height, bottom: box.bottom };
      }));
    expect(labelBoxes.every((box) => box.height >= 7 && box.bottom <= chartBox!.y + chartBox!.height + 1))
      .toBe(true);
  await expect(chart.getByTestId("mountain-rhythm-day-labels").locator("text")).toHaveCount(7);
  await expect(chart.getByTestId("mountain-rhythm-current-flag-label")).toHaveText("Today");
  const plannedTodayPoint = chart.getByTestId("mountain-rhythm-day-point-4");
  await expect(plannedTodayPoint).toHaveAttribute("fill", "#F4D77A");
  await expect(plannedTodayPoint).toHaveAttribute(
    "aria-label",
    /57\.1% rhythm elevation, 57\.1% earned journey progress/,
  );
  await expect(chart.locator('[data-testid^="mountain-rhythm-day-point-"]')).toHaveCount(7);
  const flagAnchor = await chart
    .locator('g[aria-label^="Today"]')
    .evaluate((flag) => {
      const transform = flag.getAttribute("transform") || "";
      const match = transform.match(/translate\(([\d.-]+)\s+([\d.-]+)\)/);
      const pole = flag.querySelector("line");
      return [
        Number(match?.[1]) + Number(pole?.getAttribute("x1")),
        Number(match?.[2]) + Number(pole?.getAttribute("y1")),
      ];
    });
  expect(flagAnchor[0]).toBe(dayPoints[3].x);
  expect(flagAnchor[1]).toBeCloseTo(dayPoints[3].y, 0);
  await expect(page.getByTestId("mountain-rhythm-current-status"))
    .toContainText("Current: Gaining Elevation · Next: Ridgeline");
  await expect(chart.getByTestId("mountain-rhythm-elevation-label-50"))
    .toHaveAttribute("aria-label", "Current stage: Gaining Elevation, 50% threshold");
  for (const width of [320, 360, 375, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: width === 375 ? 667 : 844 });
    const chartBox = await chart.boundingBox();
    const flagBox = await chart.getByTestId("mountain-rhythm-current-flag-label").boundingBox();
    expect(chartBox).not.toBeNull();
    expect(flagBox).not.toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    expect(flagBox!.x).toBeGreaterThanOrEqual(chartBox!.x);
    expect(flagBox!.x + flagBox!.width).toBeLessThanOrEqual(chartBox!.x + chartBox!.width + 1);
    const guideLabels = chart.getByTestId("mountain-rhythm-elevation-guides").locator("text");
    await expect(guideLabels).toHaveCount(5);
    const visibleGuideLabels = chart.getByTestId("mountain-rhythm-elevation-guides").locator("text:visible");
    await expect(visibleGuideLabels).toHaveCount(5);
    const guideAnchors = await visibleGuideLabels.evaluateAll((labels) =>
      labels.map((label) => ({
        x: label.getAttribute("x"),
        anchor: label.getAttribute("text-anchor"),
      })),
    );
    expect(guideAnchors).toEqual(
      Array.from({ length: 5 }, () => ({ x: "4", anchor: "start" })),
    );
    const activeGuideText = await visibleGuideLabels.evaluateAll((labels) =>
      labels.map((label) =>
        Array.from(label.querySelectorAll("tspan"))
          .filter((span) => getComputedStyle(span).display !== "none")
          .map((span) => span.textContent)
          .join(""),
      ),
    );
    if (width < 640) {
      expect(activeGuideText).toEqual([
        "Basecamp 0%",
        "Trail 25%",
        "Gaining 50%",
        "Ridge 70%",
        "Summit 85%",
      ]);
      await expect(page.getByTestId("mountain-rhythm-current-status-mobile"))
        .toContainText("Current: Gaining Elevation · Next: Ridgeline");
      const metricOverflow = await page.getByTestId("mountain-rhythm-panel")
        .locator('[data-testid^="mountain-rhythm-metric-"]')
        .evaluateAll((metrics) => metrics.some((metric) => metric.scrollWidth > metric.clientWidth + 1));
      expect(metricOverflow).toBe(false);
    } else {
      expect(activeGuideText).toEqual([
        "Basecamp 0%",
        "On the Trail 25%",
        "Gaining Elevation 50%",
        "Ridgeline 70%",
        "Summit 85%",
      ]);
    }
    await expect(page.getByTestId("mountain-rhythm-accessible-milestones").locator("li"))
      .toHaveCount(5);
    const landmarkBoxes = await visibleGuideLabels.evaluateAll((labels) =>
      labels.map((label) => {
        const box = label.getBoundingClientRect();
        return {
          name: label.textContent,
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
        };
      }),
    );
    const markedBoxes = await chart.locator('[data-testid^="mountain-rhythm-day-point-"]').evaluateAll(
      (points) => points.map((point) => {
        const box = point.getBoundingClientRect();
        return {
          name: point.getAttribute("data-testid"),
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
        };
      }),
    );
    const dayNumberBoxes = await chart.getByTestId("mountain-rhythm-day-labels").locator("text").evaluateAll(
      (labels) => labels.map((label) => {
        const box = label.getBoundingClientRect();
        return {
          name: label.textContent,
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
        };
      }),
    );
    const flagRect = {
      left: flagBox!.x,
      right: flagBox!.x + flagBox!.width,
      top: flagBox!.y,
      bottom: flagBox!.y + flagBox!.height,
    };
    for (const labelBox of landmarkBoxes) {
      expect(labelBox.left).toBeGreaterThanOrEqual(chartBox!.x);
      expect(labelBox.right).toBeLessThanOrEqual(chartBox!.x + chartBox!.width);
      for (const otherBox of [...markedBoxes, ...dayNumberBoxes, { ...flagRect, name: "Today flag" }]) {
        const overlaps = labelBox.left < otherBox.right &&
          labelBox.right > otherBox.left &&
          labelBox.top < otherBox.bottom &&
          labelBox.bottom > otherBox.top;
        expect(
          overlaps,
          `${labelBox.name} overlaps ${otherBox.name} at ${width}px: ${JSON.stringify({ labelBox, otherBox })}`,
        ).toBe(false);
      }
    }
    const guidesByTop = [...landmarkBoxes].sort((left, right) => left.top - right.top);
    for (let index = 1; index < guidesByTop.length; index++) {
      expect(guidesByTop[index].top).toBeGreaterThanOrEqual(guidesByTop[index - 1].bottom);
    }
    if (width === 320) {
      await page.getByTestId("mountain-rhythm-panel").screenshot({
        path: "/tmp/discipleos-mountain-4-of-7-320.png",
      });
    } else if (width === 375) {
      await page.getByTestId("mountain-rhythm-panel").screenshot({
        path: "/tmp/discipleos-mountain-4-of-7-375.png",
      });
    } else if (width === 1280) {
      await page.getByTestId("mountain-rhythm-panel").screenshot({
        path: "/tmp/discipleos-mountain-4-of-7-desktop.png",
      });
    }
  }
  const plannedPathBeforeReload = await plannedPath.getAttribute("d");
  await page.reload();
  await openMountainRhythm(page);
  await expect(page.getByTestId("mountain-rhythm-day-path")).toHaveAttribute(
    "d",
    plannedPathBeforeReload!,
  );
});

test("keeps the 20-day climb axis sparse while pinning Today to its real schedule position", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const ownerId = "mountain-rhythm-20-day-visual-owner";
  const plan = makePlan({
    id: "twenty-day-visual-climb",
    days: 20,
    name: "20-Day Reset",
    today,
    startOffset: -6,
    completedIndexes: [0, 1, 2, 3, 4, 5, 6],
  });

  await stubApi(page, {
    success: true,
    userId: ownerId,
    authenticated: false,
    established: false,
  });
  await seedLocalData(page, [plan], plan.id, { ownerId });
  await openMountainRhythm(page);

  const chart = page.getByTestId("mountain-rhythm-mountain");
  await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("35%");
  await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("7 of 20 planned days");
  await expect(page.getByTestId("mountain-rhythm-metric-rhythm")).toContainText("100%");
  await expect(chart.locator('[data-testid^="mountain-rhythm-day-point-"]')).toHaveCount(20);
  await expect(chart.getByTestId("mountain-rhythm-day-point-7")).toHaveAttribute(
    "fill",
    "#F4D77A",
  );
  await expect(chart.getByTestId("mountain-rhythm-day-labels").locator("text")).toHaveCount(7);
  await expect(chart.getByTestId("mountain-rhythm-current-flag-label")).toHaveText("Today");

  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const chartBox = await chart.boundingBox();
    const labels = await chart.getByTestId("mountain-rhythm-day-labels").locator("text")
      .evaluateAll((nodes) => nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { text: node.textContent, left: box.left, right: box.right };
      }));
    expect(chartBox).not.toBeNull();
    expect(labels).toHaveLength(7);
    expect(labels.every((label) =>
      label.left >= chartBox!.x && label.right <= chartBox!.x + chartBox!.width
    )).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width + 1);
  }
});

test("keeps the 40-day climb axis readable with Today mapped to the earned route", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const ownerId = "mountain-rhythm-40-day-visual-owner";
  const plan = makePlan({
    id: "forty-day-visual-climb",
    days: 40,
    name: "40-Day Climb",
    today,
    startOffset: -19,
    completedIndexes: Array.from({ length: 20 }, (_, index) => index),
  });

  await stubApi(page, {
    success: true,
    userId: ownerId,
    authenticated: false,
    established: false,
  });
  await seedLocalData(page, [plan], plan.id, { ownerId });
  await openMountainRhythm(page);

  const chart = page.getByTestId("mountain-rhythm-mountain");
  await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("50%");
  await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("20 of 40 planned days");
  await expect(chart.locator('[data-testid^="mountain-rhythm-day-point-"]')).toHaveCount(40);
  await expect(chart.getByTestId("mountain-rhythm-day-point-20")).toHaveAttribute(
    "fill",
    "#F4D77A",
  );
  const labelCount = await chart.getByTestId("mountain-rhythm-day-labels")
    .locator("text").count();
  expect(labelCount).toBeLessThanOrEqual(8);

  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const chartBox = await chart.boundingBox();
    const labels = await chart.getByTestId("mountain-rhythm-day-labels").locator("text")
      .evaluateAll((nodes) => nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { left: box.left, right: box.right };
      }));
    expect(chartBox).not.toBeNull();
    expect(labels.every((label) =>
      label.left >= chartBox!.x && label.right <= chartBox!.x + chartBox!.width
    )).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width + 1);
  }
});

test("pins current elevation to 1 of 7 earned days", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const plan = makePlan({
    id: "single-earned-day",
    days: 7,
    name: "7-Day Climb",
    today,
    completedIndexes: [0],
  });
  const ownerId = "single-earned-day-owner";
  await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  await seedLocalData(page, [plan], plan.id, { ownerId });
  await openMountainRhythm(page);
  await expect(page.getByTestId("mountain-rhythm-current-status"))
    .toContainText("Current: Basecamp · Next: On the Trail");
  const chart = page.getByTestId("mountain-rhythm-mountain");
  await expect(chart.getByTestId("mountain-rhythm-day-point-1"))
    .toHaveAttribute("fill", "#F4D77A");
  const markerTransform = await page.locator('g[aria-label^="Today"]').getAttribute("transform");
  const markerY = Number(markerTransform?.match(/translate\([\d.-]+\s+([\d.-]+)/)?.[1]) + 22;
  const markerElevation = Number(
    (await chart.getByTestId("mountain-rhythm-day-point-1").getAttribute("aria-label"))
      ?.match(/([\d.]+)% rhythm elevation/)?.[1],
  );
  expect(markerY).toBeCloseTo(302 - (markerElevation / 100) * 230, 1);
  await expect(page.getByTestId("mountain-rhythm-elevation-label-25"))
    .toHaveAttribute("aria-label", "Next milestone: On the Trail, 25% threshold");
  for (const width of [320, 375, 1280]) {
    await page.setViewportSize({ width, height: width === 375 ? 667 : 844 });
    const guideLabels = page.getByTestId("mountain-rhythm-elevation-guides").locator("text:visible");
    const flagLabel = await chart.getByTestId("mountain-rhythm-current-flag-label").boundingBox();
    const guideBoxes = await guideLabels.evaluateAll((labels) =>
      labels.map((label) => {
        const box = label.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      }),
    );
    expect(flagLabel).not.toBeNull();
    for (const guide of guideBoxes) {
      const overlaps = flagLabel!.x < guide.right &&
        flagLabel!.x + flagLabel!.width > guide.left &&
        flagLabel!.y < guide.bottom &&
        flagLabel!.y + flagLabel!.height > guide.top;
      expect(overlaps, `Today flag label overlaps a guide at ${width}px`).toBe(false);
    }
    await expect(guideLabels).toHaveCount(5);
    const guideText = await guideLabels.evaluateAll((labels) =>
      labels.map((label) =>
        Array.from(label.querySelectorAll("tspan"))
          .filter((span) => getComputedStyle(span).display !== "none")
          .map((span) => span.textContent)
          .join(""),
      ),
    );
    if (width < 640) {
      expect(guideText).toEqual([
        "Basecamp 0%",
        "Trail 25%",
        "Gaining 50%",
        "Ridge 70%",
        "Summit 85%",
      ]);
      await expect(page.getByTestId("mountain-rhythm-current-status-mobile"))
        .toContainText("Current: Basecamp · Next: On the Trail");
    } else {
      expect(guideText).toEqual([
        "Basecamp 0%",
        "On the Trail 25%",
        "Gaining Elevation 50%",
        "Ridgeline 70%",
        "Summit 85%",
      ]);
    }
    await page.getByTestId("mountain-rhythm-panel").screenshot({
      path: `/tmp/discipleos-mountain-1-of-7-${width}.png`,
    });
  }
});

test("keeps a near-Summit Today flag, guides, and day labels inside the reframed chart", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const ownerId = "near-summit-visual-owner";
  const plan = makePlan({
    id: "near-summit-visual",
    days: 7,
    name: "7-Day Climb",
    today,
    startOffset: -6,
    completedIndexes: [0, 1, 2, 3, 4, 5],
  });
  await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  await seedLocalData(page, [plan], plan.id, { ownerId });
  await openMountainRhythm(page);
  await expect(page.getByTestId("mountain-rhythm-current-status"))
    .toContainText("Current: Summit · Final milestone");

  const chart = page.getByTestId("mountain-rhythm-mountain");
  for (const width of [320, 375, 1280]) {
    await page.setViewportSize({ width, height: width === 375 ? 667 : 844 });
    const chartBox = await chart.boundingBox();
    const flagLabelBox = await chart.getByTestId("mountain-rhythm-current-flag-label").boundingBox();
    const dayLabelBoxes = await chart.getByTestId("mountain-rhythm-day-labels")
      .locator("text")
      .evaluateAll((labels) => labels.map((label) => {
        const box = label.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      }));
    expect(chartBox).not.toBeNull();
    expect(flagLabelBox).not.toBeNull();
    expect(flagLabelBox!.x).toBeGreaterThanOrEqual(chartBox!.x);
    expect(flagLabelBox!.x + flagLabelBox!.width)
      .toBeLessThanOrEqual(chartBox!.x + chartBox!.width + 1);
    expect(dayLabelBoxes).toHaveLength(7);
    for (const label of dayLabelBoxes) {
      expect(label.left).toBeGreaterThanOrEqual(chartBox!.x);
      expect(label.right).toBeLessThanOrEqual(chartBox!.x + chartBox!.width + 1);
      expect(label.bottom).toBeLessThanOrEqual(chartBox!.y + chartBox!.height + 1);
    }
    await expect(chart.getByTestId("mountain-rhythm-elevation-guides").locator("text:visible"))
      .toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width + 1);
    await page.getByTestId("mountain-rhythm-panel").screenshot({
      path: `/tmp/discipleos-mountain-near-summit-${width}.png`,
    });
  }
});

test("keeps Today on its calendar date when Day 4 is only the latest completed day", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const plan = makePlan({
    id: "today-is-day-five",
    days: 7,
    name: "7-Day Climb",
    today,
    startOffset: -4,
    completedIndexes: [0, 1, 2, 3],
  });
  const ownerId = "today-day-five-owner";
  await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  await seedLocalData(page, [plan], plan.id, { ownerId });
  await openMountainRhythm(page);
  await expect(page.getByTestId("mountain-rhythm-current-status"))
    .toContainText(`Today, ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${today}T12:00:00`))} · Day 5`);
  await expect(page.getByTestId("mountain-rhythm-current-flag-label")).toHaveText("Today");
  const points = await page.getByTestId("mountain-rhythm-mountain")
    .locator('[data-testid^="mountain-rhythm-day-point-"]')
    .evaluateAll((nodes) => nodes.map((node) => Number(node.getAttribute("cx"))));
  const flagTransform = await page.locator('g[aria-label^="Today"]').getAttribute("transform");
  const flagTranslateX = Number(flagTransform?.match(/translate\(([\d.-]+)/)?.[1]);
  expect(flagTranslateX + 5).toBe(points[4]);
});

test("distinguishes Today from Latest and Next when a scheduled date is skipped", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const plan = makePlan({
    id: "today-gap",
    days: 7,
    name: "7-Day Climb",
    today,
    startOffset: -3,
    completedIndexes: [0, 2],
  });
  plan.assignments = plan.assignments.map((assignment: any, index: number) =>
    index >= 3 ? { ...assignment, date: addDays(assignment.date, 1) } : assignment,
  );
  const ownerId = "today-gap-owner";
  await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  await seedLocalData(page, [plan], plan.id, { ownerId });
  await openMountainRhythm(page);
  await expect(page.getByTestId("mountain-rhythm-current-status"))
    .toContainText("Today,");
  await expect(page.getByTestId("mountain-rhythm-current-status"))
    .toContainText("no assignment · Latest: Day 3");
  await expect(page.getByTestId("mountain-rhythm-current-status"))
    .toContainText("Next: Day 4");
  await expect(page.getByTestId("mountain-rhythm-day-point-2"))
    .toHaveAttribute("aria-label", /Day 2, .*missed/);
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.getByTestId("mountain-rhythm-elevation-guides").locator("text:visible"))
    .toHaveCount(5);
  await page.getByTestId("mountain-rhythm-panel").screenshot({
    path: "/tmp/discipleos-mountain-missed-375.png",
  });
});

test("keeps the Day 1 route entirely planned when no reading is complete", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const ownerId = "mountain-rhythm-day-one-owner";
  const plan = makePlan({
    id: "day-one-no-completion",
    days: 7,
    name: "7-Day Climb",
    today,
  });

  await stubApi(page, {
    success: true,
    userId: ownerId,
    authenticated: false,
    established: false,
  });
  await seedLocalData(page, [plan], plan.id, { ownerId });
  await openMountainRhythm(page);

  const chart = page.getByTestId("mountain-rhythm-mountain");
  await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("0 of 7");
  await expect(chart.getByTestId("mountain-rhythm-earned-route")).toHaveCount(0);
  await expect(chart.getByTestId("mountain-rhythm-day-path")).toBeVisible();
  await expect(chart.getByTestId("mountain-rhythm-current-flag-label")).toHaveText("Today");
});

test("highlights only the first completed day on Day 2 of a 1-of-7 climb", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const ownerId = "mountain-rhythm-day-two-owner";
  const plan = makePlan({
    id: "day-two-one-complete",
    days: 7,
    name: "7-Day Climb",
    today,
    startOffset: -1,
    completedIndexes: [0],
  });

  await stubApi(page, {
    success: true,
    userId: ownerId,
    authenticated: false,
    established: false,
  });
  await seedLocalData(page, [plan], plan.id, { ownerId });
  await openMountainRhythm(page);

  const chart = page.getByTestId("mountain-rhythm-mountain");
  await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("1 of 7");
  const earnedRouteData = await chart
    .getByTestId("mountain-rhythm-earned-route")
    .getAttribute("d");
  expect(earnedRouteData?.match(/M/g)).toHaveLength(1);
  const todayPoint = await chart.getByTestId("mountain-rhythm-day-point-2").evaluate((point) => ({
    x: Number(point.getAttribute("cx")),
    y: Number(point.getAttribute("cy")),
  }));
  const completedRouteEndpoint = earnedRouteData?.match(/L([\d.]+) ([\d.]+)/);
  expect(completedRouteEndpoint).not.toBeNull();
  expect(Number(completedRouteEndpoint![1])).toBe(todayPoint.x);
  expect(Number(completedRouteEndpoint![2])).toBeCloseTo(222.832, 0);
  await expect(chart.getByTestId("mountain-rhythm-day-point-2")).toHaveAttribute(
    "aria-label",
    /Day 2, missed/,
  );
});

test("keeps the chart at Basecamp when every reading is unchecked", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const ownerId = "mountain-rhythm-visual-owner";
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

  await stubApi(page, {
    success: true,
    userId: ownerId,
    authenticated: false,
    established: false,
  });
  await seedLocalData(page, [plan], plan.id, { ownerId });
  await openMountainRhythm(page);

  const pointY = await page
    .getByTestId("mountain-rhythm-mountain")
    .locator('[data-testid^="mountain-rhythm-day-point-"]')
    .evaluateAll((points) =>
      points.map((point) => Number(point.getAttribute("cy"))),
    );
  expect(pointY).toHaveLength(7);
  expect(pointY).toEqual([240, 231, 235, 219, 223, 201, 190]);
  await expect(page.getByTestId("mountain-rhythm-earned-route")).toHaveCount(0);
  await expect(page.getByTestId("mountain-rhythm-current-status")).toContainText("Current: Basecamp");
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

    await stubApi(page, {
      success: true,
      userId: "anonymous-completed-session",
      authenticated: false,
      established: false,
    });
    await seedLocalData(page, [completed], completed.id, {
      ownerId: "anonymous-completed-session",
    });
    await openMountainRhythm(page);

    await expect(page.getByTestId("mountain-rhythm-complete")).toContainText("7-Day Climb complete");
    await expect(page.getByTestId("completed-climb-7-day-climb")).toHaveCount(0);
    await expandPastClimbs(page);
    await expect(page.getByTestId("completed-climb-7-day-climb")).toContainText("100% journey progress");
  await expect(page.getByTestId("mountain-rhythm-mountain")).toHaveCount(0);
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
  await stubApi(page, {
    success: true,
    userId: "anonymous-gutter-session",
    authenticated: false,
    established: false,
  });
  await seedLocalData(page, [], null);

  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await openMountainRhythm(page);
    await expect(page.getByTestId("mountain-rhythm-route")).toBeVisible();

    const layout = await page.evaluate(() => {
      const testIds = [
        "mountain-rhythm-panel",
        "mountain-rhythm-choose",
        "mountain-rhythm-route",
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
    await expect(
      page.getByTestId("route-day-estimated-reading-time-1"),
    ).toHaveText(/≈ \d+ min/);
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
    await expect(page.getByTestId(`completed-climb-${route.kind}`)).toHaveCount(0);
    await expandPastClimbs(page);
    await expect(page.getByTestId(`completed-climb-${route.kind}`)).toContainText("100% journey progress");
    await expect(page.getByText("Ordinary reading plan", { exact: true })).toHaveCount(0);
  });
}

test("shows the newest available Route to date day first and collapses earlier days independently", async ({
  page,
}) => {
  const today = await page.evaluate(() => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  });
  const plan = makePlan({
    id: "latest-route-day-first",
    days: 7,
    name: "7-Day Climb",
    today,
    startOffset: -2,
    completedIndexes: [1],
  });

  await stubApi(page);
  await seedLocalData(page, [plan], plan.id);
  await openMountainRhythm(page);

  const routeDays = page
    .getByTestId("mountain-rhythm-route-days")
    .locator("[data-route-day-number]");
  await expect(routeDays).toHaveCount(3);
  expect(
    await routeDays.evaluateAll((days) =>
      days.map((routeDay) => routeDay.getAttribute("data-route-day-number")),
    ),
  ).toEqual(["3", "2", "1"]);

  await expect(page.getByTestId("route-day-toggle-3")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.getByTestId("route-day-readings-3")).toBeVisible();
  for (const earlierDayNumber of [1, 2]) {
    await expect(
      page.getByTestId(`route-day-toggle-${earlierDayNumber}`),
    ).toHaveAttribute("aria-expanded", "false");
    await expect(
      page.getByTestId(`route-day-readings-${earlierDayNumber}`),
    ).toBeHidden();
  }

  const completedEarlierDay = page.getByTestId("route-day-2");
  await expect(
    completedEarlierDay.getByTestId("route-day-number-2"),
  ).toHaveText("2");
  await expect(
    completedEarlierDay.getByTestId("route-day-date-2"),
  ).not.toBeEmpty();
  await expect(
    completedEarlierDay.getByTestId("route-day-toggle-2"),
  ).toContainText("2 readings");
  await expect(
    completedEarlierDay.getByTestId("route-day-toggle-2"),
  ).toContainText(/≈ \d+ min/);
  await expect(
    completedEarlierDay.getByTestId("route-day-status-2"),
  ).toHaveText("Complete");
  await expect(
    completedEarlierDay.getByTestId("button-complete-day-2"),
  ).toHaveText("Undo day");

  await page.getByTestId("route-day-toggle-2").click();
  await expect(page.getByTestId("route-day-readings-2")).toBeVisible();
  await expect(page.getByTestId("route-day-readings-1")).toBeHidden();
  await page.getByTestId("route-day-toggle-1").click();
  await expect(page.getByTestId("route-day-readings-1")).toBeVisible();
  await expect(page.getByTestId("route-day-readings-2")).toBeVisible();
  await page.getByTestId("route-day-toggle-2").click();
  await expect(page.getByTestId("route-day-readings-2")).toBeHidden();
  await expect(page.getByTestId("route-day-readings-1")).toBeVisible();
  await expect(page.getByTestId("route-day-readings-3")).toBeVisible();

  await expect(page.getByTestId("route-day-4")).toHaveCount(0);

  await page.reload();
  await openMountainRhythm(page);
  await expect(page.getByTestId("route-day-readings-3")).toBeVisible();
  await expect(page.getByTestId("route-day-readings-2")).toBeHidden();
  await expect(page.getByTestId("route-day-readings-1")).toBeHidden();
  await expect(page.getByTestId("route-day-4")).toHaveCount(0);
});

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
  const journeyMetric = page.getByTestId("mountain-rhythm-metric-journey");
  const consistencyMetric = page.getByTestId("mountain-rhythm-metric-rhythm");
  await expect(journeyMetric).toContainText("28.6%");
  await expect(consistencyMetric).toContainText("20%");
  await expect(points().nth(2)).toHaveAttribute("aria-label", /Day 3, missed/);
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
  await expect(journeyMetric).toContainText("28.6%");
  await expect(consistencyMetric).toContainText("20%");
  await expect(points().nth(2)).toHaveAttribute("aria-label", /Day 3, missed/);
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

test("keeps on-schedule consistency separate from current reading checkboxes", async ({
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

  await page.getByTestId("route-day-toggle-2").click();
  const missedDayReadings = page
    .getByTestId("route-day-2")
    .locator('button[data-testid^="button-reading-"]');
  await missedDayReadings.nth(0).click();
  await missedDayReadings.nth(1).click();

  await expect(journeyMetric).toContainText("57.1%");
  await expect(rhythmMetric).toContainText("80%");
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
      const typeScale = await metrics.nth(index).evaluate((element) => {
        const children = Array.from(element.children) as HTMLElement[];
        return {
          label: Number.parseFloat(getComputedStyle(children[0]).fontSize),
          value: Number.parseFloat(getComputedStyle(children[1]).fontSize),
          detail: Number.parseFloat(getComputedStyle(children[2]).fontSize),
        };
      });
      expect(typeScale.label).toBeGreaterThanOrEqual(12);
      expect(typeScale.value).toBeGreaterThanOrEqual(18);
      expect(typeScale.detail).toBeGreaterThanOrEqual(13);
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
  await expect(page.getByTestId("mountain-rhythm-elevation-guides").locator("g")).toHaveCount(5);
  await expect(page.getByTestId("mountain-rhythm-milestones")).toHaveCount(0);
  await expect(page.getByTestId("mountain-rhythm-status")).toContainText("Today’s next step");
  await expect(page.getByTestId("mountain-rhythm-elevation-label-50")).toHaveText("Gaining Elevation 50%");
  const dayLabels = page.getByTestId("mountain-rhythm-day-labels").locator("text");
  await expect(dayLabels.first()).toHaveAttribute("font-size", "12");
  const helpToggle = page.getByTestId("mountain-rhythm-help-toggle");
  await expect(helpToggle).toBeVisible();
  await expect(page.getByTestId("mountain-rhythm-help-copy")).toBeHidden();
  await helpToggle.click();
  await expect(page.getByTestId("mountain-rhythm-help-copy")).toBeVisible();
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