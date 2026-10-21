# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> repairs an oversized saved 7-Day Climb schedule
- Location: tests/e2e/mountain-rhythm.spec.ts:1992:1

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
  197 |         await route.fulfill({
  198 |           status: 200,
  199 |           contentType: "application/json",
  200 |           body: JSON.stringify({ success: true, plan }),
  201 |         });
  202 |         return;
  203 |       }
  204 | 
  205 |       await route.fulfill({
  206 |         status: 200,
  207 |         contentType: "application/json",
  208 |         body: JSON.stringify({
  209 |           success: true,
  210 |           // This unrelated plan is intentionally returned first and is newer
  211 |           // to prove hydration honors the saved structured climb.
  212 |           plans: [
  213 |             ordinaryPlan,
  214 |             ...serverPlans.map((plan) => {
  215 |               if (!options.stripCompletionHistoryOnRead) return plan;
  216 |               const { earnedDayKeys, dayCompletionDates, ...withoutHistory } = plan;
  217 |               return withoutHistory;
  218 |             }),
  219 |           ],
  220 |         }),
  221 |       });
  222 |       return;
  223 |     }
  224 | 
  225 |     if (pathname.endsWith("/events")) {
  226 |       await route.fulfill({
  227 |         status: 200,
  228 |         contentType: "application/json",
  229 |         body: JSON.stringify({ success: true, events: [] }),
  230 |       });
  231 |       return;
  232 |     }
  233 | 
  234 |     if (pathname.endsWith("/rhythm/score")) {
  235 |       await route.fulfill({
  236 |         status: 200,
  237 |         contentType: "application/json",
  238 |         body: JSON.stringify({ success: true, eventCompletions: [] }),
  239 |       });
  240 |       return;
  241 |     }
  242 | 
  243 |     await route.fulfill({
  244 |       status: 200,
  245 |       contentType: "application/json",
  246 |       body: JSON.stringify({ success: true }),
  247 |     });
  248 |   });
  249 | 
  250 | }
  251 | 
  252 | async function seedLocalData(
  253 |   page: Page,
  254 |   plans: unknown[],
  255 |   selectedPlanId: string | null,
  256 |   options: {
  257 |     ownerId?: string | null;
  258 |     pendingOps?: unknown[];
  259 |     events?: unknown[];
  260 |   } = {},
  261 | ) {
  262 |   await page.addInitScript(
  263 |     ({ plans: seededPlans, selectedId, ownerId, pendingOps, events }) => {
  264 |       if (localStorage.getItem("discipleos-seed-applied") === "true") return;
  265 |       localStorage.setItem(
  266 |         "discipleos-data",
  267 |         JSON.stringify({
  268 |           ownerId,
  269 |           plans: seededPlans,
  270 |           events,
  271 |           eventCompletions: {},
  272 |           selectedPlanId: selectedId,
  273 |         }),
  274 |       );
  275 |       if (pendingOps) {
  276 |         localStorage.setItem(
  277 |           "discipleos:pendingOps",
  278 |           JSON.stringify({ ownerId, ops: pendingOps }),
  279 |         );
  280 |       }
  281 |       localStorage.setItem("discipleos-seed-applied", "true");
  282 |     },
  283 |     {
  284 |       plans,
  285 |       selectedId: selectedPlanId,
  286 |       ownerId: options.ownerId ?? null,
  287 |       pendingOps: options.pendingOps,
  288 |       events: options.events ?? [],
  289 |     },
  290 |   );
  291 | }
  292 | 
  293 | async function openMountainRhythm(page: Page) {
  294 |   await page.goto("/mountain-rhythm");
  295 |   await expect(
  296 |     page.getByRole("heading", { name: "Mountain Rhythm", exact: true }),
> 297 |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  298 |   await page.locator(".launch-splash").waitFor({ state: "detached" });
  299 |   await expect.poll(async () =>
  300 |     (await page.getByTestId("button-manage-climb").isVisible()) ||
  301 |     (await page.getByTestId("button-choose-7-day-climb").isVisible()),
  302 |   ).toBe(true);
  303 | }
  304 | 
  305 | async function completeClimbSetup(page: Page, kind = "7-day-climb") {
  306 |   await page.getByTestId(`button-choose-${kind}`).click();
  307 |   await page.getByRole("button", { name: "Next", exact: true }).click();
  308 |   await expect(page.getByTestId("mountain-climb-settings-step")).toBeVisible();
  309 |   await page.getByRole("button", { name: "Next", exact: true }).click();
  310 |   await expect(page.getByTestId("mountain-climb-review-step")).toBeVisible();
  311 |   await page.getByTestId("button-confirm-climb-setup").click();
  312 |   await expect(page.getByTestId("button-manage-climb")).toBeVisible();
  313 | }
  314 | 
  315 | async function expandPastClimbs(page: Page) {
  316 |   const history = page.getByTestId("mountain-rhythm-past-climbs");
  317 |   await expect(history).toBeVisible();
  318 |   if (!(await history.getAttribute("open"))) {
  319 |     await history.locator("summary").click();
  320 |   }
  321 |   return history;
  322 | }
  323 | 
  324 | async function expectDistinctMountainMetrics(page: Page, journeyLabel: string) {
  325 |   const mountainPanel = page.getByTestId("mountain-rhythm-panel");
  326 |   await expect(
  327 |     page.getByText(`${journeyLabel} · active reading climb`, { exact: true }),
  328 |   ).toBeVisible();
  329 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-today")).toContainText(
  330 |     "Today’s reading",
  331 |   );
  332 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-journey")).toContainText(
  333 |     "Journey progress",
  334 |   );
  335 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-journey")).toContainText(
  336 |     "planned days",
  337 |   );
  338 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-elevation")).toHaveCount(0);
  339 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-rhythm")).toContainText(
  340 |     "Consistency",
  341 |   );
  342 |   await expect(mountainPanel.getByTestId("mountain-rhythm-metric-rhythm")).toContainText(
  343 |     "consistency",
  344 |   );
  345 |   await expect(mountainPanel.getByText("Day progress", { exact: true })).toHaveCount(0);
  346 |   await expect(mountainPanel.getByText("Current level", { exact: true })).toHaveCount(0);
  347 |   await expect(mountainPanel.getByText("Today's status", { exact: true })).toHaveCount(0);
  348 |   await expect(mountainPanel.getByTestId("mountain-rhythm-mountain")).toBeVisible();
  349 |   await expect(mountainPanel.getByTestId("mountain-rhythm-forest-depth")).toBeVisible();
  350 |   await expect(
  351 |     mountainPanel.getByRole("img", {
  352 |       name: new RegExp(`${journeyLabel} reading-rhythm trail`),
  353 |     }),
  354 |   ).toBeVisible();
  355 |   await expect(mountainPanel.getByTestId("mountain-rhythm-elevation-guides").locator("g"))
  356 |     .toHaveCount(5);
  357 |   await expect(mountainPanel.getByTestId("mountain-rhythm-stage-rail")).toHaveCount(0);
  358 |   await expect(mountainPanel.getByTestId("mountain-rhythm-current-status"))
  359 |     .toContainText("Current elevation:");
  360 |   await expect(page.getByText("Next elevation", { exact: true })).toHaveCount(0);
  361 | }
  362 | 
  363 | for (const route of [
  364 |   { kind: "7-day-climb", label: "7-Day Climb" },
  365 | ] as const) {
  366 |   test(`identifies the selected ${route.label} route`, async ({ page }) => {
  367 |     const ownerId = "route-selection-session";
  368 |     await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  369 |     await seedLocalData(page, [], null, { ownerId });
  370 |     await openMountainRhythm(page);
  371 | 
  372 |     await completeClimbSetup(page, route.kind);
  373 |     await expectDistinctMountainMetrics(page, route.label);
  374 |     await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText(
  375 |       "0 of 7 planned days",
  376 |     );
  377 |     await expect(page.getByTestId("button-manage-climb")).toBeVisible();
  378 |     await expect(page.getByTestId(`button-choose-${route.kind}`)).toHaveCount(0);
  379 |   });
  380 | }
  381 | 
  382 | test("keeps the 20-Day Reset locked", async ({ page }) => {
  383 |   const ownerId = "locked-reset-session";
  384 |   await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  385 |   await seedLocalData(page, [], null, { ownerId });
  386 |   await openMountainRhythm(page);
  387 | 
  388 |   const resetChoice = page.getByTestId("button-choose-20-day-reset");
  389 |   await expect(resetChoice).toBeDisabled();
  390 |   await expect(resetChoice).toContainText("Locked");
  391 |   await expect(page.getByTestId("dialog-confirm-20-day-reset")).toHaveCount(0);
  392 | });
  393 | 
  394 | test("first-time users confirm the 7-Day setup before it is saved", async ({ page }) => {
  395 |   await stubApi(page, {
  396 |     success: true,
  397 |     userId: "anonymous-mountain-session",
```