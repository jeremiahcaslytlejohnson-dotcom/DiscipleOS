import { expect, test } from "@playwright/test";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

test("guides a new user through a first plan and opens Today's Walk", async ({ page }) => {
  const savedPlans: any[] = [];
  let createRequestCount = 0;

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
          established: false,
          authenticated: false,
          userId: "first-plan-onboarding-user",
        }),
      });
      return;
    }

    if (pathname.endsWith("/reading/plans")) {
      if (request.method() === "POST") {
        createRequestCount += 1;
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

  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");

  const onboarding = page.getByTestId("first-plan-onboarding");
  await expect(onboarding).toBeVisible();
  await expect(page.getByTestId("first-plan-sign-up-link")).toBeVisible();
  await expect(page.getByTestId("first-plan-sign-in-link")).toBeVisible();
  await expect(page.getByTestId("dashboard-navigation")).toHaveCount(0);
  await expect(page.getByTestId("link-mountain-rhythm-entry")).toHaveCount(0);

  await expect(page.getByRole("heading", { name: "How would you like to start?" })).toBeVisible();
  await expect(page.getByTestId("reading-path-guided")).toContainText("Discover Scripture");
  await expect(page.getByTestId("reading-path-mountain-rhythm")).toContainText(
    "Build a lasting reading habit",
  );
  await page.getByTestId("reading-path-free-climb-action").click();
  await expect(page.getByTestId("first-plan-choose-books")).toContainText(
    "Choose Books",
  );
  await expect(page.getByTestId("first-plan-choose-books")).toContainText(
    "Build a plan from the books you want to read.",
  );
  await page.getByTestId("first-plan-preset-gospels").click();
  await expect(page.getByTestId("first-plan-preset-gospels")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await onboarding.getByRole("button", { name: "Continue", exact: true }).click();

  await page.getByTestId("first-plan-minutes-15").click();
  await onboarding.getByRole("button", { name: "Continue", exact: true }).click();

  const today = todayISO();
  await page.locator('input[aria-label="Start date"]').fill(today);
  await onboarding.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator('input[aria-label="Finish date"]')).not.toHaveValue("");
  await onboarding.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(onboarding).toContainText("Gospels");
  await expect(onboarding).toContainText("15 minutes");
  await onboarding.getByTestId("first-plan-save-action").click();

  await expect(page.getByTestId("first-plan-onboarding")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  await expect(page.getByTestId("dashboard-assigned-reading")).toContainText("Matthew");
  await expect.poll(() => createRequestCount).toBe(1);
  expect(savedPlans[0]).toMatchObject({
    name: "Gospels",
    selectedBooks: ["Matthew", "Mark", "Luke", "John"],
    dailyMinutes: 15,
    paceMode: "time",
  });
});

test("development first-launch preview shows the chooser without mutating saved data", async ({ page }) => {
  let planWriteCount = 0;
  let eventWriteCount = 0;

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
          established: true,
          authenticated: false,
          userId: "dev-preview-user",
        }),
      });
      return;
    }

    if (pathname.endsWith("/reading/plans")) {
      if (request.method() === "POST" || request.method() === "DELETE") {
        planWriteCount += 1;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          plans: [{ id: "existing-dev-plan", name: "Existing plan", assignments: [], completed: {} }],
        }),
      });
      return;
    }

    if (pathname.endsWith("/events")) {
      if (request.method() === "POST" || request.method() === "DELETE") {
        eventWriteCount += 1;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          events: [{ id: "existing-dev-event", title: "Existing event", type: "prayer", date: todayISO() }],
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
        body: JSON.stringify({ reference: "Psalm 1:1", text: "Blessed is the one." }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.addInitScript(() => localStorage.clear());
  await page.goto("/?preview=first-launch");

  await expect(page.getByTestId("first-plan-onboarding")).toBeVisible();
  await expect(page.getByTestId("first-launch-preview-notice")).toBeVisible();
  await expect(page.getByTestId("reading-path-guided-action")).toBeDisabled();
  await expect(page.getByTestId("reading-path-free-climb-action")).toBeDisabled();
  await expect(page.getByTestId("reading-path-mountain-rhythm-action")).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(page.getByTestId("first-plan-sign-in-link")).toHaveCount(0);
  expect(planWriteCount).toBe(0);
  expect(eventWriteCount).toBe(0);
});

test("path choices stay usable on narrow and short phone screens", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/auth/me")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: false, user: null }) });
      return;
    }
    if (pathname.endsWith("/session/info")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, established: false, authenticated: false, userId: "mobile-path-test" }) });
      return;
    }
    if (pathname.endsWith("/reading/plans")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, plans: [] }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, events: [], eventCompletions: [] }) });
  });
  await page.addInitScript(() => localStorage.clear());

  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const onboarding = page.getByTestId("first-plan-onboarding");
    await expect(onboarding).toBeVisible();
    if (viewport.height === 844) {
      const box = await onboarding.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    }
    for (const id of [
      "reading-path-guided-action",
      "reading-path-mountain-rhythm-action",
      "reading-path-free-climb-action",
    ]) {
      const action = page.getByTestId(id);
      await expect(action).toBeVisible();
      const box = await action.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  }
});