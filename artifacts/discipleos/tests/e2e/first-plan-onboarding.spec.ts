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

  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/?preview=first-launch");

  await expect(page.getByTestId("first-plan-onboarding")).toBeVisible();
  await expect(page.getByTestId("first-launch-preview-notice")).toBeVisible();
  const previewScrollHeight = await page
    .locator(".discipleos-app-content")
    .evaluate((element) => element.scrollHeight);
  const previewClientHeight = await page
    .locator(".discipleos-app-content")
    .evaluate((element) => element.clientHeight);
  expect(previewScrollHeight).toBeLessThanOrEqual(previewClientHeight + 1);
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

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 375, height: 667 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const onboarding = page.getByTestId("first-plan-onboarding");
    await expect(onboarding).toBeVisible();
    await expect(page.getByTestId("first-plan-sign-up-link")).toBeVisible();
    await expect(page.getByTestId("first-plan-sign-in-link")).toBeVisible();
    await expect(page.locator("header h1")).toBeVisible();
    await expect(page.getByTestId("reading-path-guided")).toContainText("New readers");
    await expect(page.getByTestId("reading-path-mountain-rhythm")).toContainText(
      "structured climbs, reminders",
    );
    await expect(page.getByTestId("reading-path-free-climb")).toContainText("confident readers");
    const contentArea = page.locator(".discipleos-app-content");
    const contentBox = await contentArea.boundingBox();
    expect(contentBox).not.toBeNull();
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
      expect(box!.y + box!.height).toBeLessThanOrEqual(
        contentBox!.y + contentBox!.height,
      );
      const description = page.getByTestId(
        `${id.replace("-action", "")}-description`,
      );
      const descriptionLines = await description.evaluate((element) => {
        const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
        return Math.round(element.getBoundingClientRect().height / lineHeight);
      });
      expect(descriptionLines, `${viewport.width}x${viewport.height} ${id}`).toBeLessThanOrEqual(2);
    }
    const scrollMetrics = await contentArea.evaluate((element) => {
      const describe = (selector: string) => {
        const node = element.querySelector<HTMLElement>(selector);
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          top: Math.round(rect.top),
          height: Math.round(rect.height),
          scrollHeight: node.scrollHeight,
          minHeight: style.minHeight,
          paddingTop: style.paddingTop,
          paddingBottom: style.paddingBottom,
        };
      };
      return {
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        shell: describe(".discipleos-shell"),
        home: describe(".discipleos-content--home"),
        onboarding: describe("[data-testid='first-plan-onboarding']"),
        cards: Array.from(
          element.querySelectorAll<HTMLElement>("[data-testid^='reading-path-']:not([data-testid$='-action'])"),
        ).map((card) => ({
          id: card.dataset.testid,
          top: Math.round(card.getBoundingClientRect().top),
          height: Math.round(card.getBoundingClientRect().height),
        })),
      };
    });
    expect(
      scrollMetrics.scrollHeight,
      `${viewport.width}x${viewport.height}: ${JSON.stringify(scrollMetrics)}`,
    ).toBeLessThanOrEqual(scrollMetrics.clientHeight + 1);
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  }
});