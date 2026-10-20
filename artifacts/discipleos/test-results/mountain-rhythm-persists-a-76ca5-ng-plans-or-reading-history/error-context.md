# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> persists a signed-in climb cancellation without deleting plans or reading history
- Location: tests/e2e/mountain-rhythm.spec.ts:1084:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Mountain Rhythm', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Mountain Rhythm', exact: true })

```

```yaml
- button "Feedback"
- status: This session could not verify the saved reading data. It remains on this device.
```

# Test source

```ts
  179 |         await route.fulfill({
  180 |           status: 200,
  181 |           contentType: "application/json",
  182 |           body: JSON.stringify({ success: true, plan }),
  183 |         });
  184 |         return;
  185 |       }
  186 | 
  187 |       await route.fulfill({
  188 |         status: 200,
  189 |         contentType: "application/json",
  190 |         body: JSON.stringify({
  191 |           success: true,
  192 |           // This unrelated plan is intentionally returned first and is newer
  193 |           // to prove hydration honors the saved structured climb.
  194 |           plans: [
  195 |             ordinaryPlan,
  196 |             ...serverPlans.map((plan) => {
  197 |               if (!options.stripCompletionHistoryOnRead) return plan;
  198 |               const { earnedDayKeys, dayCompletionDates, ...withoutHistory } = plan;
  199 |               return withoutHistory;
  200 |             }),
  201 |           ],
  202 |         }),
  203 |       });
  204 |       return;
  205 |     }
  206 | 
  207 |     if (pathname.endsWith("/events")) {
  208 |       await route.fulfill({
  209 |         status: 200,
  210 |         contentType: "application/json",
  211 |         body: JSON.stringify({ success: true, events: [] }),
  212 |       });
  213 |       return;
  214 |     }
  215 | 
  216 |     if (pathname.endsWith("/rhythm/score")) {
  217 |       await route.fulfill({
  218 |         status: 200,
  219 |         contentType: "application/json",
  220 |         body: JSON.stringify({ success: true, eventCompletions: [] }),
  221 |       });
  222 |       return;
  223 |     }
  224 | 
  225 |     await route.fulfill({
  226 |       status: 200,
  227 |       contentType: "application/json",
  228 |       body: JSON.stringify({ success: true }),
  229 |     });
  230 |   });
  231 | 
  232 | }
  233 | 
  234 | async function seedLocalData(
  235 |   page: Page,
  236 |   plans: unknown[],
  237 |   selectedPlanId: string | null,
  238 |   options: {
  239 |     ownerId?: string | null;
  240 |     pendingOps?: unknown[];
  241 |     events?: unknown[];
  242 |   } = {},
  243 | ) {
  244 |   await page.addInitScript(
  245 |     ({ plans: seededPlans, selectedId, ownerId, pendingOps, events }) => {
  246 |       if (localStorage.getItem("discipleos-seed-applied") === "true") return;
  247 |       localStorage.setItem(
  248 |         "discipleos-data",
  249 |         JSON.stringify({
  250 |           ownerId,
  251 |           plans: seededPlans,
  252 |           events,
  253 |           eventCompletions: {},
  254 |           selectedPlanId: selectedId,
  255 |         }),
  256 |       );
  257 |       if (pendingOps) {
  258 |         localStorage.setItem(
  259 |           "discipleos:pendingOps",
  260 |           JSON.stringify({ ownerId, ops: pendingOps }),
  261 |         );
  262 |       }
  263 |       localStorage.setItem("discipleos-seed-applied", "true");
  264 |     },
  265 |     {
  266 |       plans,
  267 |       selectedId: selectedPlanId,
  268 |       ownerId: options.ownerId ?? null,
  269 |       pendingOps: options.pendingOps,
  270 |       events: options.events ?? [],
  271 |     },
  272 |   );
  273 | }
  274 | 
  275 | async function openMountainRhythm(page: Page) {
  276 |   await page.goto("/mountain-rhythm");
  277 |   await expect(
  278 |     page.getByRole("heading", { name: "Mountain Rhythm", exact: true }),
> 279 |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  280 |   await page.locator(".launch-splash").waitFor({ state: "detached" });
  281 |   await expect.poll(async () =>
  282 |     (await page.getByTestId("button-manage-climb").isVisible()) ||
  283 |     (await page.getByTestId("button-choose-7-day-climb").isVisible()),
  284 |   ).toBe(true);
  285 | }
  286 | 
  287 | async function completeClimbSetup(page: Page, kind = "7-day-climb") {
  288 |   await page.getByTestId(`button-choose-${kind}`).click();
  289 |   await page.getByRole("button", { name: "Next", exact: true }).click();
  290 |   await expect(page.getByTestId("mountain-climb-settings-step")).toBeVisible();
  291 |   await page.getByRole("button", { name: "Next", exact: true }).click();
  292 |   await expect(page.getByTestId("mountain-climb-review-step")).toBeVisible();
  293 |   await page.getByTestId("button-confirm-climb-setup").click();
  294 |   await expect(page.getByTestId("button-manage-climb")).toBeVisible();
  295 | }
  296 | 
  297 | async function expandPastClimbs(page: Page) {
  298 |   const history = page.getByTestId("mountain-rhythm-past-climbs");
  299 |   await expect(history).toBeVisible();
  300 |   if (!(await history.getAttribute("open"))) {
  301 |     await history.locator("summary").click();
  302 |   }
  303 |   return history;
  304 | }
  305 | 
  306 | async function expectDistinctMountainMetrics(page: Page, journeyLabel: string) {
  307 |   const mountainPanel = page.getByTestId("mountain-rhythm-panel");
  308 |   await expect(
  309 |     page.getByText(`${journeyLabel} · active reading climb`, { exact: true }),
  310 |   ).toBeVisible();
  311 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-today")).toContainText(
  312 |     "Today’s reading",
  313 |   );
  314 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-journey")).toContainText(
  315 |     "Journey progress",
  316 |   );
  317 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-journey")).toContainText(
  318 |     "planned days",
  319 |   );
  320 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-elevation")).toHaveCount(0);
  321 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-rhythm")).toContainText(
  322 |     "Consistency",
  323 |   );
  324 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-rhythm")).toContainText(
  325 |     "consistency",
  326 |   );
  327 |   await expect(mountainPanel.getByText("Day progress", { exact: true })).toHaveCount(0);
  328 |   await expect(mountainPanel.getByText("Current level", { exact: true })).toHaveCount(0);
  329 |   await expect(mountainPanel.getByText("Today's status", { exact: true })).toHaveCount(0);
  330 |   await expect(mountainPanel.getByTestId("mountain-rhythm-mountain")).toBeVisible();
  331 |   await expect(mountainPanel.getByTestId("mountain-rhythm-forest-depth")).toBeVisible();
  332 |   await expect(
  333 |     mountainPanel.getByRole("img", {
  334 |       name: new RegExp(`${journeyLabel} reading-rhythm trail`),
  335 |     }),
  336 |   ).toBeVisible();
  337 |   await expect(mountainPanel.getByTestId("mountain-rhythm-elevation-guides").locator("g"))
  338 |     .toHaveCount(5);
  339 |   await expect(mountainPanel.getByTestId("mountain-rhythm-stage-rail")).toHaveCount(0);
  340 |   await expect(mountainPanel.getByTestId("mountain-rhythm-current-status"))
  341 |     .toContainText("Current elevation:");
  342 |   await expect(page.getByText("Next elevation", { exact: true })).toHaveCount(0);
  343 | }
  344 | 
  345 | for (const route of [
  346 |   { kind: "7-day-climb", label: "7-Day Climb" },
  347 | ] as const) {
  348 |   test(`identifies the selected ${route.label} route`, async ({ page }) => {
  349 |     const ownerId = "route-selection-session";
  350 |     await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  351 |     await seedLocalData(page, [], null, { ownerId });
  352 |     await openMountainRhythm(page);
  353 | 
  354 |     await completeClimbSetup(page, route.kind);
  355 |     await expectDistinctMountainMetrics(page, route.label);
  356 |     await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText(
  357 |       "0 of 7 planned days",
  358 |     );
  359 |     await expect(page.getByTestId("button-manage-climb")).toBeVisible();
  360 |     await expect(page.getByTestId(`button-choose-${route.kind}`)).toHaveCount(0);
  361 |   });
  362 | }
  363 | 
  364 | test("keeps the 20-Day Reset locked", async ({ page }) => {
  365 |   const ownerId = "locked-reset-session";
  366 |   await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  367 |   await seedLocalData(page, [], null, { ownerId });
  368 |   await openMountainRhythm(page);
  369 | 
  370 |   const resetChoice = page.getByTestId("button-choose-20-day-reset");
  371 |   await expect(resetChoice).toBeDisabled();
  372 |   await expect(resetChoice).toContainText("Locked");
  373 |   await expect(page.getByTestId("dialog-confirm-20-day-reset")).toHaveCount(0);
  374 | });
  375 | 
  376 | test("first-time users confirm the 7-Day setup before it is saved", async ({ page }) => {
  377 |   await stubApi(page, {
  378 |     success: true,
  379 |     userId: "anonymous-mountain-session",
```