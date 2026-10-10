# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: first-plan-onboarding.spec.ts >> guides a new user through a first plan and opens Today's Walk
- Location: tests/e2e/first-plan-onboarding.spec.ts:7:1

# Error details

```
Error: expect(locator).toHaveCSS(expected) failed

Locator:  getByTestId('first-plan-choose-books').getByText('Build a plan from the books you want to read.')
Expected: "rgb(226, 232, 240)"
Received: "rgb(201, 205, 211)"
Timeout:  5000ms

Call log:
  - Expect "toHaveCSS" with timeout 5000ms
  - waiting for getByTestId('first-plan-choose-books').getByText('Build a plan from the books you want to read.')
    14 × locator resolved to <span data-component-name="span" class="mt-1 block text-sm leading-5 text-[#E2E8F0]" data-replit-metadata="artifacts/discipleos/src/components/FirstPlanOnboarding.tsx:239:16">Build a plan from the books you want to read.</span>
       - unexpected value "rgb(201, 205, 211)"

```

```yaml
- text: Build a plan from the books you want to read.
```

# Test source

```ts
  47  |         return;
  48  |       }
  49  | 
  50  |       await route.fulfill({
  51  |         status: 200,
  52  |         contentType: "application/json",
  53  |         body: JSON.stringify({ success: true, plans: [] }),
  54  |       });
  55  |       return;
  56  |     }
  57  | 
  58  |     if (pathname.endsWith("/events")) {
  59  |       await route.fulfill({
  60  |         status: 200,
  61  |         contentType: "application/json",
  62  |         body: JSON.stringify({ success: true, events: [] }),
  63  |       });
  64  |       return;
  65  |     }
  66  | 
  67  |     if (pathname.endsWith("/rhythm/score")) {
  68  |       await route.fulfill({
  69  |         status: 200,
  70  |         contentType: "application/json",
  71  |         body: JSON.stringify({ success: true, eventCompletions: [] }),
  72  |       });
  73  |       return;
  74  |     }
  75  | 
  76  |     if (pathname.endsWith("/verse")) {
  77  |       await route.fulfill({
  78  |         status: 200,
  79  |         contentType: "application/json",
  80  |         body: JSON.stringify({
  81  |           reference: "Psalm 1:1",
  82  |           text: "Blessed is the one who walks not in step with the wicked.",
  83  |         }),
  84  |       });
  85  |       return;
  86  |     }
  87  | 
  88  |     await route.fulfill({
  89  |       status: 200,
  90  |       contentType: "application/json",
  91  |       body: JSON.stringify({ success: true }),
  92  |     });
  93  |   });
  94  | 
  95  |   await page.addInitScript(() => localStorage.clear());
  96  |   await page.goto("/");
  97  | 
  98  |   const onboarding = page.getByTestId("first-plan-onboarding");
  99  |   await expect(onboarding).toBeVisible();
  100 |   await expect(page.getByTestId("first-plan-sign-up-link")).toBeVisible();
  101 |   await expect(page.getByTestId("first-plan-sign-in-link")).toBeVisible();
  102 |   await expect(page.getByTestId("dashboard-navigation")).toHaveCount(0);
  103 |   await expect(page.getByTestId("link-mountain-rhythm-entry")).toHaveCount(0);
  104 | 
  105 |   await expect(page.getByRole("heading", { name: "How would you like to start?" })).toBeVisible();
  106 |   await expect(page.getByTestId("reading-path-choices")).toContainText(
  107 |     "Wherever you are in your Scripture journey, there’s a path for you.",
  108 |   );
  109 |   await expect(page.getByTestId("reading-path-guided-description")).toHaveText(
  110 |     "New to reading the Bible? Start with a guided 27-day journey that introduces Scripture one step at a time.",
  111 |   );
  112 |   await expect(page.getByTestId("reading-path-mountain-rhythm-description")).toHaveText(
  113 |     "Struggling to read consistently? Build a lasting habit with structured climbs, reminders, and progress tracking.",
  114 |   );
  115 |   await expect(page.getByTestId("reading-path-free-climb-description")).toHaveText(
  116 |     "Already reading regularly? Choose and combine Bible reading plans that fit your interests and schedule.",
  117 |   );
  118 |   expect(
  119 |     Number.parseFloat(
  120 |       await page.getByTestId("reading-path-guided-title").evaluate((element) => getComputedStyle(element).fontSize),
  121 |     ),
  122 |   ).toBeGreaterThanOrEqual(16);
  123 |   expect(
  124 |     Number.parseFloat(
  125 |       await page.getByTestId("reading-path-guided-description").evaluate((element) => getComputedStyle(element).fontSize),
  126 |     ),
  127 |   ).toBeGreaterThanOrEqual(14);
  128 |   await expect(page.getByTestId("reading-path-guided")).toContainText("Discover Scripture");
  129 |   await expect(page.getByTestId("reading-path-mountain-rhythm")).toContainText(
  130 |     "Build a lasting reading habit",
  131 |   );
  132 |   await page.getByTestId("reading-path-free-climb-action").click();
  133 |   await expect(page.getByTestId("first-plan-choose-books")).toContainText(
  134 |     "Choose Books",
  135 |   );
  136 |   await expect(page.getByTestId("first-plan-choose-books")).toContainText(
  137 |     "Build a plan from the books you want to read.",
  138 |   );
  139 |   const chooseBooksDescription = page.getByTestId("first-plan-choose-books").getByText(
  140 |     "Build a plan from the books you want to read.",
  141 |   );
  142 |   expect(
  143 |     Number.parseFloat(
  144 |       await chooseBooksDescription.evaluate((element) => getComputedStyle(element).fontSize),
  145 |     ),
  146 |   ).toBeGreaterThanOrEqual(14);
> 147 |   await expect(chooseBooksDescription).toHaveCSS("color", "rgb(226, 232, 240)");
      |                                        ^ Error: expect(locator).toHaveCSS(expected) failed
  148 |   const presetDetail = page
  149 |     .getByTestId("first-plan-preset-gospels")
  150 |     .getByText("Matthew, Mark, Luke, and John");
  151 |   expect(
  152 |     Number.parseFloat(
  153 |       await presetDetail.evaluate((element) => getComputedStyle(element).fontSize),
  154 |     ),
  155 |   ).toBeGreaterThanOrEqual(14);
  156 |   await expect(presetDetail).toHaveCSS("color", "rgb(226, 232, 240)");
  157 |   await page.getByTestId("first-plan-preset-gospels").click();
  158 |   await expect(page.getByTestId("first-plan-preset-gospels")).toHaveAttribute(
  159 |     "aria-pressed",
  160 |     "true",
  161 |   );
  162 |   await onboarding.getByRole("button", { name: "Continue", exact: true }).click();
  163 | 
  164 |   await page.getByTestId("first-plan-minutes-15").click();
  165 |   await onboarding.getByRole("button", { name: "Continue", exact: true }).click();
  166 | 
  167 |   const today = todayISO();
  168 |   await page.locator('input[aria-label="Start date"]').fill(today);
  169 |   await onboarding.getByRole("button", { name: "Continue", exact: true }).click();
  170 |   await expect(page.locator('input[aria-label="Finish date"]')).not.toHaveValue("");
  171 |   await onboarding.getByRole("button", { name: "Continue", exact: true }).click();
  172 | 
  173 |   await expect(onboarding).toContainText("Gospels");
  174 |   await expect(onboarding).toContainText("15 minutes");
  175 |   await onboarding.getByTestId("first-plan-save-action").click();
  176 | 
  177 |   await expect(page.getByTestId("first-plan-onboarding")).toHaveCount(0);
  178 |   await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  179 |   await expect(page.getByTestId("dashboard-assigned-reading")).toContainText("Matthew");
  180 |   await expect.poll(() => createRequestCount).toBe(1);
  181 |   expect(savedPlans[0]).toMatchObject({
  182 |     name: "Gospels",
  183 |     selectedBooks: ["Matthew", "Mark", "Luke", "John"],
  184 |     dailyMinutes: 15,
  185 |     paceMode: "time",
  186 |   });
  187 | });
  188 | 
  189 | test("development first-launch preview shows the chooser without mutating saved data", async ({ page }) => {
  190 |   let planWriteCount = 0;
  191 |   let eventWriteCount = 0;
  192 | 
  193 |   await page.route("**/api/**", async (route) => {
  194 |     const request = route.request();
  195 |     const pathname = new URL(request.url()).pathname;
  196 | 
  197 |     if (pathname.endsWith("/auth/me")) {
  198 |       await route.fulfill({
  199 |         status: 200,
  200 |         contentType: "application/json",
  201 |         body: JSON.stringify({ authenticated: false, user: null }),
  202 |       });
  203 |       return;
  204 |     }
  205 | 
  206 |     if (pathname.endsWith("/session/info")) {
  207 |       await route.fulfill({
  208 |         status: 200,
  209 |         contentType: "application/json",
  210 |         body: JSON.stringify({
  211 |           success: true,
  212 |           established: true,
  213 |           authenticated: false,
  214 |           userId: "dev-preview-user",
  215 |         }),
  216 |       });
  217 |       return;
  218 |     }
  219 | 
  220 |     if (pathname.endsWith("/reading/plans")) {
  221 |       if (request.method() === "POST" || request.method() === "DELETE") {
  222 |         planWriteCount += 1;
  223 |       }
  224 |       await route.fulfill({
  225 |         status: 200,
  226 |         contentType: "application/json",
  227 |         body: JSON.stringify({
  228 |           success: true,
  229 |           plans: [{ id: "existing-dev-plan", name: "Existing plan", assignments: [], completed: {} }],
  230 |         }),
  231 |       });
  232 |       return;
  233 |     }
  234 | 
  235 |     if (pathname.endsWith("/events")) {
  236 |       if (request.method() === "POST" || request.method() === "DELETE") {
  237 |         eventWriteCount += 1;
  238 |       }
  239 |       await route.fulfill({
  240 |         status: 200,
  241 |         contentType: "application/json",
  242 |         body: JSON.stringify({
  243 |           success: true,
  244 |           events: [{ id: "existing-dev-event", title: "Existing event", type: "prayer", date: todayISO() }],
  245 |         }),
  246 |       });
  247 |       return;
```