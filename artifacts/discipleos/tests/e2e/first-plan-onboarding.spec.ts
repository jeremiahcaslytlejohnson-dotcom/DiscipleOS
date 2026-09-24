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

  await page.getByTestId("first-plan-create-action").click();
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