import { expect, test as base } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

type AuthPurpose = "email" | "sign-in" | "sign-up";
type RequestTestVerificationCode = (
  email: string,
  client?: APIRequestContext,
  purpose?: AuthPurpose,
) => Promise<string>;

const test = base.extend<{
  requestTestVerificationCode: RequestTestVerificationCode;
}>({
  requestTestVerificationCode: async ({ page }, use, testInfo) => {
    const fixtureEmails = new Set<string>();

    await use(async (email, client = page.request, purpose = "email") => {
      fixtureEmails.add(email);
      const requestCode = await client.post("/api/auth/request-code", {
        data: { email, purpose },
      });
      if (!requestCode.ok()) {
        throw new Error(
          `Verification request failed with ${requestCode.status()}: ${await requestCode.text()}`,
        );
      }

      let code = "";
      await expect
        .poll(
          async () => {
            const response = await client.get(
              `/api/auth/test-code?email=${encodeURIComponent(email)}`,
            );
            if (!response.ok()) return "";
            const payload = await response.json();
            code = typeof payload.code === "string" ? payload.code : "";
            return code;
          },
          { timeout: 10_000 },
        )
        .toMatch(/^\d{6}$/);
      return code;
    });

    if (fixtureEmails.size === 0) return;

    try {
      const cleanup = await page.request.post("/api/auth/test-cleanup", {
        data: { emails: [...fixtureEmails] },
      });
      if (!cleanup.ok()) {
        console.warn(
          `Auth fixture cleanup failed with ${cleanup.status()}: ${await cleanup.text()}`,
        );
      } else {
        const payload = await cleanup.json();
        if (!payload.success) {
          console.warn("Auth fixture cleanup returned an unsuccessful response");
        }
      }
    } catch (error) {
      console.warn("Auth fixture cleanup failed", error);
    }

    testInfo.annotations.push({
      type: "auth-fixture-cleanup",
      description: `Attempted cleanup for ${fixtureEmails.size} reserved fixture email(s).`,
    });
  },
});

async function createLocalPlan(page: Page, name: string) {
  await page.goto("/");
  const firstPlanOnboarding = page.getByTestId("first-plan-onboarding");
  await expect(
    firstPlanOnboarding.or(page.getByTestId("dashboard-today-content")),
  ).toBeVisible();

  if (await firstPlanOnboarding.isVisible()) {
    await page.getByTestId("first-plan-create-action").click();
    await page.getByTestId("first-plan-preset-newTestament").click();
    await firstPlanOnboarding.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByTestId("first-plan-minutes-20").click();
    await firstPlanOnboarding.getByRole("button", { name: "Continue", exact: true }).click();
    await firstPlanOnboarding.getByLabel("Start date").fill(new Date().toISOString().slice(0, 10));
    await firstPlanOnboarding.getByRole("button", { name: "Continue", exact: true }).click();
    await firstPlanOnboarding.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByTestId("first-plan-save-action").click();
    await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
    await openDashboardNavigation(page)
      .then((navigation) => navigation.getByRole("button", { name: "Plans", exact: true }).click());
    const planCard = page.locator('[data-testid^="planned-reading-card-"]').first();
    await expect(planCard).toBeVisible();
    await planCard.locator("button").first().click();
    const editForm = page.getByTestId("dashboard-plan-edit-form");
    await editForm.getByPlaceholder("Plan name").fill(name);
    await editForm.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(
      page.locator('[data-testid^="planned-reading-card-"]').filter({ hasText: name }),
    ).toBeVisible();
    return;
  }

  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  await openDashboardNavigation(page)
    .then((navigation) => navigation.getByRole("button", { name: "Plans", exact: true }).click());
  await page.getByTestId("plans-empty-create-button").click();
  await page.getByPlaceholder("Plan name").fill(name);
  await page.getByRole("button", { name: "Reading selection & order" }).click();
  await page.getByRole("button", { name: "New Testament" }).click();
  await page.getByRole("button", { name: "Review & create" }).click();
  await page.getByRole("button", { name: "Create plan" }).click();
  await expect(page.locator('[data-testid^="planned-reading-card-"]').first()).toBeVisible();
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

for (const route of ["/sign-in", "/sign-up"]) {
  test(`${route} exposes only the email-code authentication path`, async ({ page }) => {
    await page.goto(route);

    const authCard = page.locator(".discipleos-auth-card");
    await expect(authCard).toBeVisible();
    await expect(authCard.getByRole("textbox", { name: "Email address" })).toBeVisible();
    await expect(authCard.getByRole("button", { name: "Continue with email" })).toBeVisible();
    await expect(authCard.getByText("No password required.")).toBeVisible();
    await expect(authCard.getByText(/create or access your account/i)).toBeVisible();
    await expect(authCard.getByText(/Sign in|Create account|Create one|Already have an account|Need an account/i)).toHaveCount(0);

    await expect(authCard.locator('input[type="password"]')).toHaveCount(0);
    await expect(authCard.getByText(/Google/i)).toHaveCount(0);
    await expect(page.locator(".launch-splash")).toHaveCount(0);
  });
}

test("keeps a locally created plan when a new email account is verified", async ({
  page,
  requestTestVerificationCode,
}) => {
  const suffix = randomUUID();
  const email = `new-${suffix}@e2e.discipleos.test`;
  const planName = `New account plan ${suffix}`;

  await createLocalPlan(page, planName);
  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("button", { name: "Continue with email" }).click();

  const code = await requestTestVerificationCode(email);
  await page.getByRole("textbox", { name: "One-time code" }).fill(code);
  await page.getByRole("button", { name: "Verify and continue" }).click();

  await expect(page).toHaveURL(/\/$/);
  await (await openDashboardNavigation(page)).getByRole("button", { name: "Plans", exact: true }).click();
  await expect(
    page.locator('[data-testid^="planned-reading-card-"]').filter({ hasText: planName }),
  ).toBeVisible();
});

test("keeps a locally created plan when an existing email account is verified", async ({
  page,
  request,
  requestTestVerificationCode,
}) => {
  const suffix = randomUUID();
  const email = `existing-${suffix}@e2e.discipleos.test`;
  const planName = `Existing account plan ${suffix}`;

  const setupCode = await requestTestVerificationCode(email, request, "sign-up");
  const existingAccount = await request.post("/api/auth/verify-code", {
    data: { email, purpose: "sign-up", code: setupCode },
  });
  expect(existingAccount.ok()).toBeTruthy();

  await createLocalPlan(page, planName);
  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("button", { name: "Continue with email" }).click();

  const code = await requestTestVerificationCode(email);
  await page.getByRole("textbox", { name: "One-time code" }).fill(code);
  await page.getByRole("button", { name: "Verify and continue" }).click();

  await expect(page).toHaveURL(/\/$/);
  await (await openDashboardNavigation(page)).getByRole("button", { name: "Plans", exact: true }).click();
  await expect(
    page.locator('[data-testid^="planned-reading-card-"]').filter({ hasText: planName }),
  ).toBeVisible();
});

test("shows a recoverable error for an incorrect code and verifies after resend", async ({
  page,
  requestTestVerificationCode,
}) => {
  const email = `incorrect-recovery-${randomUUID()}@e2e.discipleos.test`;

  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("button", { name: "Continue with email" }).click();

  const firstCode = await requestTestVerificationCode(email);
  const incorrectCode = firstCode === "000000" ? "000001" : "000000";
  await page.getByRole("textbox", { name: "One-time code" }).fill(incorrectCode);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "That verification code is invalid or expired. Request a new code and try again.",
  );
  await expect(page.getByRole("textbox", { name: "One-time code" })).toHaveValue("");

  const replacementCode = await requestTestVerificationCode(email);
  await page.getByRole("textbox", { name: "One-time code" }).fill(replacementCode);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("recovers from an already-used code with a replacement code", async ({
  page,
  request,
  requestTestVerificationCode,
}) => {
  const email = `used-recovery-${randomUUID()}@e2e.discipleos.test`;

  const consumedCode = await requestTestVerificationCode(email, request);
  await request
    .post("/api/auth/verify-code", {
      data: { email, purpose: "email", code: consumedCode },
    })
    .then((response) => expect(response.ok()).toBeTruthy());

  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("button", { name: "Continue with email" }).click();
  await page.getByRole("textbox", { name: "One-time code" }).fill(consumedCode);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "That verification code is invalid or expired. Request a new code and try again.",
  );

  const replacementCode = await requestTestVerificationCode(email);
  await page.getByRole("textbox", { name: "One-time code" }).fill(replacementCode);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("lets users change email during verification", async ({
  page,
  requestTestVerificationCode,
}) => {
  const firstEmail = `change-first-${randomUUID()}@e2e.discipleos.test`;
  const secondEmail = `change-second-${randomUUID()}@e2e.discipleos.test`;

  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: "Email address" }).fill(firstEmail);
  await page.getByRole("button", { name: "Continue with email" }).click();
  await requestTestVerificationCode(firstEmail);

  await page.getByRole("button", { name: "Use a different email" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill(secondEmail);
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(page.getByText(`Enter the one-time code we sent to ${secondEmail}.`)).toBeVisible();

  const secondCode = await requestTestVerificationCode(secondEmail);
  await page.getByRole("textbox", { name: "One-time code" }).fill(secondCode);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("restores the pending email verification step after reload", async ({
  page,
  requestTestVerificationCode,
}) => {
  const email = `reload-recovery-${randomUUID()}@e2e.discipleos.test`;

  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("button", { name: "Continue with email" }).click();
  const code = await requestTestVerificationCode(email);

  await page.reload();
  await expect(page.getByRole("textbox", { name: "One-time code" })).toBeVisible();
  await expect(page.getByText(`Enter the one-time code we sent to ${email}.`)).toBeVisible();
  await page.getByRole("textbox", { name: "One-time code" }).fill(code);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("does not strand local plans when the first account claim fails", async ({
  page,
  requestTestVerificationCode,
}) => {
  const suffix = randomUUID();
  const email = `claim-recovery-${suffix}@e2e.discipleos.test`;
  const planName = `Claim recovery plan ${suffix}`;
  let shouldFailClaim = true;

  await page.route("**/api/account/claim", async (route) => {
    if (shouldFailClaim && route.request().method() === "POST") {
      shouldFailClaim = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "Temporary claim failure" }),
      });
      return;
    }
    await route.continue();
  });

  await createLocalPlan(page, planName);
  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("button", { name: "Continue with email" }).click();
  const code = await requestTestVerificationCode(email);
  await page.getByRole("textbox", { name: "One-time code" }).fill(code);
  await page.getByRole("button", { name: "Verify and continue" }).click();

  await expect(page).toHaveURL(/\/$/);
  await (await openDashboardNavigation(page)).getByRole("button", { name: "Plans", exact: true }).click();
  await expect(
    page.locator('[data-testid^="planned-reading-card-"]').filter({ hasText: planName }),
  ).toBeVisible();
});

test("propagates logout to another tab without replaying account writes", async ({
  page,
  requestTestVerificationCode,
}) => {
  const suffix = randomUUID();
  const email = `cross-tab-${suffix}@e2e.discipleos.test`;
  const planName = `Cross-tab local plan ${suffix}`;
  const secondTab = await page.context().newPage();
  const accountWritesAfterLogout: string[] = [];
  let observeWrites = false;

  secondTab.on("request", (request) => {
    if (
      !observeWrites ||
      !["POST", "PUT", "DELETE"].includes(request.method()) ||
      !request.url().includes("/api/")
    ) {
      return;
    }
    if (/(account|events|reading|settings|push)/.test(request.url())) {
      accountWritesAfterLogout.push(`${request.method()} ${request.url()}`);
    }
  });

  try {
    await createLocalPlan(page, planName);
    await page.goto("/sign-in");
    await page.getByRole("textbox", { name: "Email address" }).fill(email);
    await page.getByRole("button", { name: "Continue with email" }).click();
    const code = await requestTestVerificationCode(email);
    await page.getByRole("textbox", { name: "One-time code" }).fill(code);
    await page.getByRole("button", { name: "Verify and continue" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

    await secondTab.goto("/");
    await expect(secondTab.getByRole("button", { name: "Sign out" })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("link", { name: "Continue with email" })).toBeVisible();
    await expect(secondTab.getByRole("link", { name: "Continue with email" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(secondTab.getByTestId("account-settings-link")).toHaveCount(0);

    await (await openDashboardNavigation(page))
      .getByRole("button", { name: "Plans", exact: true })
      .click();
    await expect(
      page.locator('[data-testid^="planned-reading-card-"]').filter({ hasText: planName }),
    ).toHaveCount(0);

    const sessionInfo = await secondTab.request.get("/api/session/info");
    expect(sessionInfo.ok()).toBeTruthy();
    expect((await sessionInfo.json()).authenticated).toBe(false);

    const settings = await secondTab.request.get("/api/settings");
    expect(settings.status()).toBe(401);

    observeWrites = true;
    await secondTab.reload();
    await expect(secondTab.getByRole("link", { name: "Continue with email" })).toBeVisible();
    await (await openDashboardNavigation(secondTab))
      .getByRole("button", { name: "Plans", exact: true })
      .click();
    await expect(
      secondTab.locator('[data-testid^="planned-reading-card-"]').filter({ hasText: planName }),
    ).toHaveCount(0);
    expect(accountWritesAfterLogout).toEqual([]);
  } finally {
    await secondTab.close();
  }
});