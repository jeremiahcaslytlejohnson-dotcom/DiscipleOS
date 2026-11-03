# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> keeps the authenticated 7-Day Climb selected after reload and hydration
- Location: tests/e2e/mountain-rhythm.spec.ts:2667:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByTestId('mountain-rhythm-panel').getByTestId('mountain-rhythm-elevation-guides').locator('g')
Expected: 5
Received: 10
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByTestId('mountain-rhythm-panel').getByTestId('mountain-rhythm-elevation-guides').locator('g')
    14 × locator resolved to 10 elements
       - unexpected value "10"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - button "Feedback" [ref=e3] [cursor=pointer]:
    - generic [ref=e4]: ✦
    - text: Feedback
  - generic [ref=e8]:
    - banner [ref=e9]:
      - button "Back to Today" [ref=e10]
    - main [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]: My Ascent
        - generic [ref=e20]:
          - heading "Mountain Rhythm" [level=1] [ref=e21]
          - button "Manage climb" [ref=e22]
        - paragraph [ref=e23]: One clear route for Scripture consistency. Choose a structured climb, then take the next faithful step.
      - generic [ref=e25]:
        - generic [ref=e27]:
          - generic [ref=e28]: Mountain Rhythm
          - generic [ref=e31]: 7-Day Climb · active reading climb
        - generic [ref=e35]:
          - generic [ref=e36]:
            - generic [ref=e37]: Today’s reading
            - generic [ref=e38]: Ready for today
            - generic [ref=e39]: 0% of today’s reading
          - generic [ref=e41]:
            - generic [ref=e42]: Journey progress
            - generic [ref=e43]: 0.0%
            - generic [ref=e44]: 0 of 7 planned days
          - generic [ref=e46]:
            - generic [ref=e47]: Consistency
            - generic [ref=e48]: 0%
            - generic [ref=e49]: Needs a next step consistency
        - generic [ref=e51]:
          - img "7-Day Climb reading-rhythm trail; current elevation 0%, journey progress 0%" [ref=e52]:
            - generic [ref=e110]:
              - generic "Elevation guide lines" [ref=e111]
              - generic "Elevation level labels" [ref=e113]:
                - 'generic "Current stage: Basecamp, 0% threshold" [ref=e116]': Basecamp
                - 'generic "Next milestone: On the Trail, 25% threshold" [ref=e119]': On the Trail
                - 'generic "Milestone: Gaining Elevation, 50% threshold" [ref=e122]': Gaining Elevation
                - 'generic "Milestone: Ridgeline, 70% threshold" [ref=e125]': Ridgeline
                - 'generic "Milestone: Summit, 85% threshold" [ref=e128]': Summit
              - generic "Day 1, missed, readings missed, 0% current elevation, 0% earned ascent" [ref=e129]
              - generic "Day 2, future, readings future, 0% current elevation, 0% earned ascent" [ref=e130]
              - generic "Day 3, future, readings future, 0% current elevation, 0% earned ascent" [ref=e131]
              - generic "Day 4, future, readings future, 0% current elevation, 0% earned ascent" [ref=e132]
              - generic "Day 5, future, readings future, 0% current elevation, 0% earned ascent" [ref=e133]
              - generic "Day 6, future, readings future, 0% current elevation, 0% earned ascent" [ref=e134]
              - generic "Day 7, future, readings future, 0% current elevation, 0% earned ascent" [ref=e135]
              - generic [ref=e136]:
                - generic [ref=e137]: "1"
                - generic [ref=e139]: "2"
                - generic [ref=e141]: "3"
                - generic [ref=e143]: "4"
                - generic [ref=e145]: "5"
                - generic [ref=e147]: "6"
                - generic [ref=e149]: "7"
              - generic "Today's position at Basecamp" [ref=e151]:
                - generic "Current elevation 0%" [ref=e154]
                - generic [ref=e155]: Today
          - list "Elevation milestones" [ref=e157]:
            - listitem [ref=e158]: "Basecamp: 0%"
            - listitem [ref=e159]: "On the Trail: 25%"
            - listitem [ref=e160]: "Gaining Elevation: 50%"
            - listitem [ref=e161]: "Ridgeline: 70%"
            - listitem [ref=e162]: "Summit: 85%"
        - paragraph [ref=e163]:
          - text: "Current: Basecamp · Next: On the Trail"
          - generic [ref=e164]: "Current elevation: Basecamp · 0% · Today, Nov 3 · Day 1"
        - group [ref=e166]:
          - generic "How Mountain Rhythm works" [ref=e167] [cursor=pointer]
      - generic [ref=e169]:
        - generic [ref=e170]:
          - generic [ref=e171]:
            - generic [ref=e172]: Route to today
            - paragraph [ref=e177]: 7-Day Climb · about 19 min/day · future readings stay hidden until their day
          - generic [ref=e178]: 0/7 days
        - generic [ref=e179]:
          - generic [ref=e180]: Today’s next step
          - generic [ref=e181]:
            - generic [ref=e182]: Ready for today
            - generic [ref=e184]: 0% of today's reading complete
        - generic [ref=e186]:
          - generic [ref=e187]:
            - button "Collapse Day 1 readings, Nov 3, 2026, Next step, 6 readings, estimated reading time 20 min" [expanded] [ref=e188]:
              - generic [ref=e189]: "1"
              - generic [ref=e190]:
                - generic [ref=e191]:
                  - generic [ref=e192]: Nov 3, 2026
                  - generic [ref=e193]: Today
                - generic [ref=e194]:
                  - text: 6 readings ·
                  - 'generic "Estimated reading time: about 20 min" [ref=e195]': ≈ 20 min
                - generic [ref=e196]: Next step
            - button "Complete day" [ref=e202]
          - generic [ref=e203]:
            - button "Genesis 1" [ref=e204]
            - button "Genesis 2" [ref=e208]
            - button "Genesis 3" [ref=e212]
            - button "Genesis 4" [ref=e216]
            - button "Genesis 5" [ref=e220]
            - button "Genesis 6" [ref=e224]
      - group [ref=e228]:
        - generic "Optional commitments · Prayer and fasting" [ref=e229] [cursor=pointer]
```

# Test source

```ts
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
  347 |   ).toBeVisible();
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
> 406 |     .toHaveCount(5);
      |      ^ Error: expect(locator).toHaveCount(expected) failed
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
  448 |     authenticated: false,
  449 |     established: false,
  450 |   });
  451 |   await seedLocalData(page, [], null);
  452 |   await openMountainRhythm(page);
  453 | 
  454 |   const setup = page.getByTestId("mountain-climb-setup");
  455 |   await expect(setup).toContainText("Step 1 of 3");
  456 |   await expect(page.getByText("7-Day Climb · active reading climb", { exact: true })).toHaveCount(0);
  457 | 
  458 |   await setup.getByRole("button", { name: "Close" }).click();
  459 |   await expect(setup).toHaveCount(0);
  460 |   await page.getByTestId("button-open-climb-setup").click();
  461 |   await expect(setup).toContainText("Step 1 of 3");
  462 | 
  463 |   await page.getByTestId("button-choose-7-day-climb").click();
  464 |   await page.getByRole("button", { name: "Next", exact: true }).click();
  465 |   await expect(page.getByTestId("mountain-climb-settings-step")).toBeVisible();
  466 |   await expect(page.getByTestId("input-climb-daily-budget")).toHaveValue("20");
  467 |   await page.getByTestId("input-climb-daily-budget").fill("25");
  468 |   await setup.getByRole("button", { name: "Back" }).click();
  469 |   await expect(setup).toContainText("Step 1 of 3");
  470 |   await setup.getByRole("button", { name: "Next", exact: true }).click();
  471 |   await expect(page.getByTestId("input-climb-daily-budget")).toHaveValue("25");
  472 |   await page.getByRole("button", { name: "Next", exact: true }).click();
  473 |   await expect(page.getByTestId("mountain-climb-review-step")).toContainText("25 minutes");
  474 |   await setup.getByRole("button", { name: "Back" }).click();
  475 |   await expect(page.getByTestId("mountain-climb-settings-step")).toBeVisible();
  476 |   await setup.getByRole("button", { name: "Next", exact: true }).click();
  477 |   const saveRequest = page.waitForRequest(
  478 |     (request) =>
  479 |       request.url().includes("/api/reading/plans") && request.method() === "POST",
  480 |   );
  481 |   await page.getByTestId("button-confirm-climb-setup").click();
  482 | 
  483 |   const savedPlan = (await saveRequest).postDataJSON();
  484 |   expect(savedPlan.dailyMinutes).toBe(25);
  485 |   expect(savedPlan.selectedBooks).toEqual(["Genesis"]);
  486 |   expect(savedPlan.assignments).toHaveLength(7);
  487 |   const chapterCounts = savedPlan.assignments.map((day: any) => day.readings.length);
  488 |   const totalScheduledChapters = savedPlan.assignments.flatMap((day: any) => day.readings).length;
  489 |   expect(chapterCounts.every((count: number) => count > 0)).toBe(true);
  490 |   expect(totalScheduledChapters).toBeGreaterThan(0);
  491 |   expect(totalScheduledChapters).toBeLessThan(150);
  492 |   expect(Math.max(...savedPlan.assignments.map((day: any) => day.estimatedMinutes))).toBeLessThanOrEqual(
  493 |     savedPlan.dailyMinutes,
  494 |   );
  495 |   await page.reload();
  496 |   await openMountainRhythm(page);
  497 |   await expect(page.getByTestId("button-manage-climb")).toBeVisible();
  498 |   await expect(page.getByTestId("button-choose-7-day-climb")).toHaveCount(0);
  499 | });
  500 | 
  501 | test("fasting suggestions honor inclusive climb dates, cadence and date-only boundaries", () => {
  502 |   const start = "2026-10-15";
  503 |   const end = "2026-10-21";
  504 |   expect(climbDatesInRange(start, end)).toEqual([
  505 |     "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18",
  506 |     "2026-10-19", "2026-10-20", "2026-10-21",
```