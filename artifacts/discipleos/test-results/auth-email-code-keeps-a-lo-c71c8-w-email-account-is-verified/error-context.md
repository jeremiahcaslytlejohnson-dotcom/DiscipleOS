# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-email-code.spec.ts >> keeps a locally created plan when a new email account is verified
- Location: tests/e2e/auth-email-code.spec.ts:151:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByTestId('dashboard-navigation-row')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('dashboard-navigation-row')
    14 × locator resolved to <div role="navigation" data-component-name="div" aria-label="Dashboard navigation" data-testid="dashboard-navigation-row" data-replit-metadata="artifacts/discipleos/src/pages/Home.tsx:4153:10" class="hidden w-full max-w-full flex-wrap items-center justify-center gap-1 overflow-visible md:mx-auto md:flex lg:gap-2">…</div>
       - unexpected value "hidden"

```

```yaml
- button "Feedback"
- heading "DISCIPLEOS" [level=1]
- link "Continue with email":
  - /url: /sign-in
- paragraph: Today’s reading · keep taking the next faithful step
- text: Verse of the day “But thou, when thou prayest, enter into thy closet, and when thou hast shut thy door, pray to thy Father which is in secret; and thy Father which seeth in secret shall reward thee openly.” Matthew 6:6
- button "Today’s Reading 0 of 5 chapters complete" [expanded]
- text: Today’s completion 0 of 5 chapters complete ~17m estimated reading
- button "Open day view"
- text: New Testament 5 readings · ~17m
- button "Complete day"
- button "Open plan"
- button "Matthew 1 Chapter 1~3m"
- button "Matthew 2 Chapter 2~3m"
- button "Matthew 3 Chapter 3~2m"
- button "Matthew 4 Chapter 4~3m"
- button "Matthew 5 Chapter 5~6m"
- button "Today’s Activities" [expanded]
- text: No spiritual events scheduled today — add prayer, fasting, church, or a custom event.
- button "Progress Ordinary reading plans"
- button "Mountain Rhythm Long-term climb progress"
- link "Details":
  - /url: /mountain-rhythm
```

# Test source

```ts
  22  |       });
  23  |       if (!requestCode.ok()) {
  24  |         throw new Error(
  25  |           `Verification request failed with ${requestCode.status()}: ${await requestCode.text()}`,
  26  |         );
  27  |       }
  28  | 
  29  |       let code = "";
  30  |       await expect
  31  |         .poll(
  32  |           async () => {
  33  |             const response = await client.get(
  34  |               `/api/auth/test-code?email=${encodeURIComponent(email)}`,
  35  |             );
  36  |             if (!response.ok()) return "";
  37  |             const payload = await response.json();
  38  |             code = typeof payload.code === "string" ? payload.code : "";
  39  |             return code;
  40  |           },
  41  |           { timeout: 10_000 },
  42  |         )
  43  |         .toMatch(/^\d{6}$/);
  44  |       return code;
  45  |     });
  46  | 
  47  |     if (fixtureEmails.size === 0) return;
  48  | 
  49  |     try {
  50  |       const cleanup = await page.request.post("/api/auth/test-cleanup", {
  51  |         data: { emails: [...fixtureEmails] },
  52  |       });
  53  |       if (!cleanup.ok()) {
  54  |         console.warn(
  55  |           `Auth fixture cleanup failed with ${cleanup.status()}: ${await cleanup.text()}`,
  56  |         );
  57  |       } else {
  58  |         const payload = await cleanup.json();
  59  |         if (!payload.success) {
  60  |           console.warn("Auth fixture cleanup returned an unsuccessful response");
  61  |         }
  62  |       }
  63  |     } catch (error) {
  64  |       console.warn("Auth fixture cleanup failed", error);
  65  |     }
  66  | 
  67  |     testInfo.annotations.push({
  68  |       type: "auth-fixture-cleanup",
  69  |       description: `Attempted cleanup for ${fixtureEmails.size} reserved fixture email(s).`,
  70  |     });
  71  |   },
  72  | });
  73  | 
  74  | async function createLocalPlan(page: Page, name: string) {
  75  |   await page.goto("/");
  76  |   const firstPlanOnboarding = page.getByTestId("first-plan-onboarding");
  77  |   await expect(
  78  |     firstPlanOnboarding.or(page.getByTestId("dashboard-today-content")),
  79  |   ).toBeVisible();
  80  | 
  81  |   if (await firstPlanOnboarding.isVisible()) {
  82  |     await page.getByTestId("first-plan-create-action").click();
  83  |     await page.getByTestId("first-plan-preset-newTestament").click();
  84  |     await firstPlanOnboarding.getByRole("button", { name: "Continue", exact: true }).click();
  85  |     await page.getByTestId("first-plan-minutes-20").click();
  86  |     await firstPlanOnboarding.getByRole("button", { name: "Continue", exact: true }).click();
  87  |     await firstPlanOnboarding.getByLabel("Start date").fill(new Date().toISOString().slice(0, 10));
  88  |     await firstPlanOnboarding.getByRole("button", { name: "Continue", exact: true }).click();
  89  |     await firstPlanOnboarding.getByRole("button", { name: "Continue", exact: true }).click();
  90  |     await page.getByTestId("first-plan-save-action").click();
  91  |     await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  92  |     await openDashboardNavigation(page)
  93  |       .then((navigation) => navigation.getByRole("button", { name: "Plans", exact: true }).click());
  94  |     const planCard = page.locator('[data-testid^="planned-reading-card-"]').first();
  95  |     await expect(planCard).toBeVisible();
  96  |     await planCard.locator("button").first().click();
  97  |     const editForm = page.getByTestId("dashboard-plan-edit-form");
  98  |     await editForm.getByPlaceholder("Plan name").fill(name);
  99  |     await editForm.getByRole("button", { name: "Save changes", exact: true }).click();
  100 |     await expect(
  101 |       page.locator('[data-testid^="planned-reading-card-"]').filter({ hasText: name }),
  102 |     ).toBeVisible();
  103 |     return;
  104 |   }
  105 | 
  106 |   await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  107 |   await openDashboardNavigation(page)
  108 |     .then((navigation) => navigation.getByRole("button", { name: "Plans", exact: true }).click());
  109 |   await page.getByTestId("plans-empty-create-button").click();
  110 |   await page.getByPlaceholder("Plan name").fill(name);
  111 |   await page.getByRole("button", { name: "Reading selection & order" }).click();
  112 |   await page.getByRole("button", { name: "New Testament" }).click();
  113 |   await page.getByRole("button", { name: "Review & create" }).click();
  114 |   await page.getByRole("button", { name: "Create plan" }).click();
  115 |   await expect(page.locator('[data-testid^="planned-reading-card-"]').first()).toBeVisible();
  116 | }
  117 | 
  118 | async function openDashboardNavigation(page: Page) {
  119 |   await page.locator(".launch-splash").waitFor({ state: "detached" }).catch(() => {});
  120 |   if ((page.viewportSize()?.width ?? 1280) >= 768) {
  121 |     const navigationRow = page.getByTestId("dashboard-navigation-row");
> 122 |     await expect(navigationRow).toBeVisible();
      |                                 ^ Error: expect(locator).toBeVisible() failed
  123 |     return navigationRow;
  124 |   }
  125 | 
  126 |   const toggle = page.getByTestId("dashboard-navigation-toggle");
  127 |   await expect(toggle).toHaveAttribute("aria-expanded", "false");
  128 |   await toggle.click();
  129 |   await expect(page.getByTestId("dashboard-navigation-panel")).toBeVisible();
  130 |   return page.getByTestId("dashboard-navigation-panel");
  131 | }
  132 | 
  133 | for (const route of ["/sign-in", "/sign-up"]) {
  134 |   test(`${route} exposes only the email-code authentication path`, async ({ page }) => {
  135 |     await page.goto(route);
  136 | 
  137 |     const authCard = page.locator(".discipleos-auth-card");
  138 |     await expect(authCard).toBeVisible();
  139 |     await expect(authCard.getByRole("textbox", { name: "Email address" })).toBeVisible();
  140 |     await expect(authCard.getByRole("button", { name: "Continue with email" })).toBeVisible();
  141 |     await expect(authCard.getByText("No password required.")).toBeVisible();
  142 |     await expect(authCard.getByText(/create or access your account/i)).toBeVisible();
  143 |     await expect(authCard.getByText(/Sign in|Create account|Create one|Already have an account|Need an account/i)).toHaveCount(0);
  144 | 
  145 |     await expect(authCard.locator('input[type="password"]')).toHaveCount(0);
  146 |     await expect(authCard.getByText(/Google/i)).toHaveCount(0);
  147 |     await expect(page.locator(".launch-splash")).toHaveCount(0);
  148 |   });
  149 | }
  150 | 
  151 | test("keeps a locally created plan when a new email account is verified", async ({
  152 |   page,
  153 |   requestTestVerificationCode,
  154 | }) => {
  155 |   const suffix = randomUUID();
  156 |   const email = `new-${suffix}@e2e.discipleos.test`;
  157 |   const planName = `New account plan ${suffix}`;
  158 | 
  159 |   await createLocalPlan(page, planName);
  160 |   await page.goto("/sign-in");
  161 |   await page.getByRole("textbox", { name: "Email address" }).fill(email);
  162 |   await page.getByRole("button", { name: "Continue with email" }).click();
  163 | 
  164 |   const code = await requestTestVerificationCode(email);
  165 |   await page.getByRole("textbox", { name: "One-time code" }).fill(code);
  166 |   await page.getByRole("button", { name: "Verify and continue" }).click();
  167 | 
  168 |   await expect(page).toHaveURL(/\/$/);
  169 |   await (await openDashboardNavigation(page)).getByRole("button", { name: "Plans", exact: true }).click();
  170 |   await expect(
  171 |     page.locator('[data-testid^="planned-reading-card-"]').filter({ hasText: planName }),
  172 |   ).toBeVisible();
  173 | });
  174 | 
  175 | test("keeps a locally created plan when an existing email account is verified", async ({
  176 |   page,
  177 |   request,
  178 |   requestTestVerificationCode,
  179 | }) => {
  180 |   const suffix = randomUUID();
  181 |   const email = `existing-${suffix}@e2e.discipleos.test`;
  182 |   const planName = `Existing account plan ${suffix}`;
  183 | 
  184 |   const setupCode = await requestTestVerificationCode(email, request, "sign-up");
  185 |   const existingAccount = await request.post("/api/auth/verify-code", {
  186 |     data: { email, purpose: "sign-up", code: setupCode },
  187 |   });
  188 |   expect(existingAccount.ok()).toBeTruthy();
  189 | 
  190 |   await createLocalPlan(page, planName);
  191 |   await page.goto("/sign-in");
  192 |   await page.getByRole("textbox", { name: "Email address" }).fill(email);
  193 |   await page.getByRole("button", { name: "Continue with email" }).click();
  194 | 
  195 |   const code = await requestTestVerificationCode(email);
  196 |   await page.getByRole("textbox", { name: "One-time code" }).fill(code);
  197 |   await page.getByRole("button", { name: "Verify and continue" }).click();
  198 | 
  199 |   await expect(page).toHaveURL(/\/$/);
  200 |   await (await openDashboardNavigation(page)).getByRole("button", { name: "Plans", exact: true }).click();
  201 |   await expect(
  202 |     page.locator('[data-testid^="planned-reading-card-"]').filter({ hasText: planName }),
  203 |   ).toBeVisible();
  204 | });
  205 | 
  206 | test("shows a recoverable error for an incorrect code and verifies after resend", async ({
  207 |   page,
  208 |   requestTestVerificationCode,
  209 | }) => {
  210 |   const email = `incorrect-recovery-${randomUUID()}@e2e.discipleos.test`;
  211 | 
  212 |   await page.goto("/sign-in");
  213 |   await page.getByRole("textbox", { name: "Email address" }).fill(email);
  214 |   await page.getByRole("button", { name: "Continue with email" }).click();
  215 | 
  216 |   const firstCode = await requestTestVerificationCode(email);
  217 |   const incorrectCode = firstCode === "000000" ? "000001" : "000000";
  218 |   await page.getByRole("textbox", { name: "One-time code" }).fill(incorrectCode);
  219 |   await page.getByRole("button", { name: "Verify and continue" }).click();
  220 |   await expect(page.getByRole("alert")).toHaveText(
  221 |     "That verification code is invalid or expired. Request a new code and try again.",
  222 |   );
```