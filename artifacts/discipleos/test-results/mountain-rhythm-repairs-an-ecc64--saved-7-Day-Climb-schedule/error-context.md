# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> repairs an oversized saved 7-Day Climb schedule
- Location: tests/e2e/mountain-rhythm.spec.ts:2525:1

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
  247 |     if (pathname.endsWith("/events")) {
  248 |       await route.fulfill({
  249 |         status: 200,
  250 |         contentType: "application/json",
  251 |         body: JSON.stringify({ success: true, events: [] }),
  252 |       });
  253 |       return;
  254 |     }
  255 | 
  256 |     if (pathname.endsWith("/rhythm/score")) {
  257 |       await route.fulfill({
  258 |         status: 200,
  259 |         contentType: "application/json",
  260 |         body: JSON.stringify({ success: true, eventCompletions: [] }),
  261 |       });
  262 |       return;
  263 |     }
  264 | 
  265 |     await route.fulfill({
  266 |       status: 200,
  267 |       contentType: "application/json",
  268 |       body: JSON.stringify({ success: true }),
  269 |     });
  270 |   });
  271 | 
  272 | }
  273 | 
  274 | async function seedLocalData(
  275 |   page: Page,
  276 |   plans: unknown[],
  277 |   selectedPlanId: string | null,
  278 |   options: {
  279 |     ownerId?: string | null;
  280 |     pendingOps?: unknown[];
  281 |     events?: unknown[];
  282 |   } = {},
  283 | ) {
  284 |   await page.addInitScript(
  285 |     ({ plans: seededPlans, selectedId, ownerId, pendingOps, events }) => {
  286 |       if (localStorage.getItem("discipleos-seed-applied") === "true") return;
  287 |       localStorage.setItem(
  288 |         "discipleos-data",
  289 |         JSON.stringify({
  290 |           ownerId,
  291 |           plans: seededPlans,
  292 |           events,
  293 |           eventCompletions: {},
  294 |           selectedPlanId: selectedId,
  295 |         }),
  296 |       );
  297 |       if (pendingOps) {
  298 |         localStorage.setItem(
  299 |           "discipleos:pendingOps",
  300 |           JSON.stringify({ ownerId, ops: pendingOps }),
  301 |         );
  302 |       }
  303 |       localStorage.setItem("discipleos-seed-applied", "true");
  304 |     },
  305 |     {
  306 |       plans,
  307 |       selectedId: selectedPlanId,
  308 |       ownerId: options.ownerId ?? null,
  309 |       pendingOps: options.pendingOps,
  310 |       events: options.events ?? [],
  311 |     },
  312 |   );
  313 | }
  314 | 
  315 | async function replaceLocalPlans(
  316 |   page: Page,
  317 |   plans: unknown[],
  318 |   selectedPlanId: string,
  319 |   ownerId: string,
  320 | ) {
  321 |   await page.evaluate(
  322 |     ({ storageKey, nextPlans, nextSelectedPlanId, nextOwnerId }) => {
  323 |       localStorage.setItem(
  324 |         storageKey,
  325 |         JSON.stringify({
  326 |           ownerId: nextOwnerId,
  327 |           plans: nextPlans,
  328 |           events: [],
  329 |           eventCompletions: {},
  330 |           selectedPlanId: nextSelectedPlanId,
  331 |         }),
  332 |       );
  333 |     },
  334 |     {
  335 |       storageKey: STORAGE_KEY,
  336 |       nextPlans: plans,
  337 |       nextSelectedPlanId: selectedPlanId,
  338 |       nextOwnerId: ownerId,
  339 |     },
  340 |   );
  341 | }
  342 | 
  343 | async function openMountainRhythm(page: Page) {
  344 |   await page.goto("/mountain-rhythm");
  345 |   await expect(
  346 |     page.getByRole("heading", { name: "Mountain Rhythm", exact: true }),
> 347 |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  348 |   await page.locator(".launch-splash").waitFor({ state: "detached" });
  349 |   await expect.poll(async () =>
  350 |     (await page.getByTestId("button-manage-climb").isVisible()) ||
  351 |     (await page.getByTestId("button-choose-7-day-climb").isVisible()),
  352 |   ).toBe(true);
  353 | }
  354 | 
  355 | async function completeClimbSetup(page: Page, kind = "7-day-climb") {
  356 |   await page.getByTestId(`button-choose-${kind}`).click();
  357 |   await page.getByRole("button", { name: "Next", exact: true }).click();
  358 |   await expect(page.getByTestId("mountain-climb-settings-step")).toBeVisible();
  359 |   await page.getByRole("button", { name: "Next", exact: true }).click();
  360 |   await expect(page.getByTestId("mountain-climb-review-step")).toBeVisible();
  361 |   await page.getByTestId("button-confirm-climb-setup").click();
  362 |   await expect(page.getByTestId("button-manage-climb")).toBeVisible();
  363 | }
  364 | 
  365 | async function expandPastClimbs(page: Page) {
  366 |   const history = page.getByTestId("mountain-rhythm-past-climbs");
  367 |   await expect(history).toBeVisible();
  368 |   if (!(await history.getAttribute("open"))) {
  369 |     await history.locator("summary").click();
  370 |   }
  371 |   return history;
  372 | }
  373 | 
  374 | async function expectDistinctMountainMetrics(page: Page, journeyLabel: string) {
  375 |   const mountainPanel = page.getByTestId("mountain-rhythm-panel");
  376 |   await expect(
  377 |     page.getByText(`${journeyLabel} · active reading climb`, { exact: true }),
  378 |   ).toBeVisible();
  379 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-today")).toContainText(
  380 |     "Today’s reading",
  381 |   );
  382 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-journey")).toContainText(
  383 |     "Journey progress",
  384 |   );
  385 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-journey")).toContainText(
  386 |     "planned days",
  387 |   );
  388 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-elevation")).toHaveCount(0);
  389 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-rhythm")).toContainText(
  390 |     "Consistency",
  391 |   );
  392 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-rhythm")).toContainText(
  393 |     "consistency",
  394 |   );
  395 |   await expect(mountainPanel.getByText("Day progress", { exact: true })).toHaveCount(0);
  396 |   await expect(mountainPanel.getByText("Current level", { exact: true })).toHaveCount(0);
  397 |   await expect(mountainPanel.getByText("Today's status", { exact: true })).toHaveCount(0);
  398 |   await expect(mountainPanel.getByTestId("mountain-rhythm-mountain")).toBeVisible();
  399 |   await expect(mountainPanel.getByTestId("mountain-rhythm-forest-depth")).toBeVisible();
  400 |   await expect(
  401 |     mountainPanel.getByRole("img", {
  402 |       name: new RegExp(`${journeyLabel} reading-rhythm trail`),
  403 |     }),
  404 |   ).toBeVisible();
  405 |   await expect(mountainPanel.getByTestId("mountain-rhythm-elevation-guides").locator("g"))
  406 |     .toHaveCount(5);
  407 |   await expect(mountainPanel.getByTestId("mountain-rhythm-stage-rail")).toHaveCount(0);
  408 |   await expect(mountainPanel.getByTestId("mountain-rhythm-current-status"))
  409 |     .toContainText("Current elevation:");
  410 |   await expect(page.getByText("Next elevation", { exact: true })).toHaveCount(0);
  411 | }
  412 | 
  413 | for (const route of [
  414 |   { kind: "7-day-climb", label: "7-Day Climb" },
  415 | ] as const) {
  416 |   test(`identifies the selected ${route.label} route`, async ({ page }) => {
  417 |     const ownerId = "route-selection-session";
  418 |     await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  419 |     await seedLocalData(page, [], null, { ownerId });
  420 |     await openMountainRhythm(page);
  421 | 
  422 |     await completeClimbSetup(page, route.kind);
  423 |     await expectDistinctMountainMetrics(page, route.label);
  424 |     await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText(
  425 |       "0 of 7 planned days",
  426 |     );
  427 |     await expect(page.getByTestId("button-manage-climb")).toBeVisible();
  428 |     await expect(page.getByTestId(`button-choose-${route.kind}`)).toHaveCount(0);
  429 |   });
  430 | }
  431 | 
  432 | test("keeps the 20-Day Reset locked", async ({ page }) => {
  433 |   const ownerId = "locked-reset-session";
  434 |   await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  435 |   await seedLocalData(page, [], null, { ownerId });
  436 |   await openMountainRhythm(page);
  437 | 
  438 |   const resetChoice = page.getByTestId("button-choose-20-day-reset");
  439 |   await expect(resetChoice).toBeDisabled();
  440 |   await expect(resetChoice).toContainText("Locked");
  441 |   await expect(page.getByTestId("dialog-confirm-20-day-reset")).toHaveCount(0);
  442 | });
  443 | 
  444 | test("first-time users confirm the 7-Day setup before it is saved", async ({ page }) => {
  445 |   await stubApi(page, {
  446 |     success: true,
  447 |     userId: "anonymous-mountain-session",
```