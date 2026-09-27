# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-polish.spec.ts >> shows a visible reminder permission failure instead of appearing inactive
- Location: tests/e2e/visual-polish.spec.ts:380:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /Enable reminders|Notifications blocked|Try again/ }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: /Enable reminders|Notifications blocked|Try again/ }).first()

```

```yaml
- button "Feedback"
- heading "DISCIPLEOS" [level=1]
- text: Visual
- link "Open settings":
  - /url: /settings
- button "Sign out"
- paragraph: Today’s reading · keep taking the next faithful step
- text: Verse of the day “Blessed is the one who walks not in step with the wicked.” Psalm 1:1
- button "Today’s Reading 0 of 1 chapters complete" [expanded]
- text: Today’s completion 0 of 1 chapters complete ~1m estimated reading
- button "Open day view"
- text: Morning Psalms 1 reading · ~1m
- button "Complete day"
- button "Open plan"
- button "Psalm 1 Reading~1m"
- button "Today’s Activities" [expanded]
- text: No spiritual events scheduled today — add prayer, fasting, church, or a custom event.
- button "Progress Ordinary reading plans"
- button "Mountain Rhythm Long-term climb progress"
- link "Details":
  - /url: /mountain-rhythm
```

# Test source

```ts
  298 |         foreground[0] * alpha + background[0] * (1 - alpha),
  299 |         foreground[1] * alpha + background[1] * (1 - alpha),
  300 |         foreground[2] * alpha + background[2] * (1 - alpha),
  301 |       ] as [number, number, number];
  302 |     };
  303 | 
  304 |     const luminance = ([red, green, blue]: [number, number, number]) =>
  305 |       [red, green, blue]
  306 |         .map((channel) => {
  307 |           const normalized = channel / 255;
  308 |           return normalized <= 0.03928
  309 |             ? normalized / 12.92
  310 |             : ((normalized + 0.055) / 1.055) ** 2.4;
  311 |         })
  312 |         .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  313 | 
  314 |     const contrast = (foreground: [number, number, number], background: [number, number, number]) => {
  315 |       const foregroundLuminance = luminance(foreground);
  316 |       const backgroundLuminance = luminance(background);
  317 |       const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  318 |       const darker = Math.min(foregroundLuminance, backgroundLuminance);
  319 |       return (lighter + 0.05) / (darker + 0.05);
  320 |     };
  321 | 
  322 |     const renderedBackground = (element: Element) => {
  323 |       let background: [number, number, number] = [14, 18, 22];
  324 |       const ancestors: Element[] = [];
  325 |       let current: Element | null = element;
  326 |       while (current) {
  327 |         ancestors.unshift(current);
  328 |         current = current.parentElement;
  329 |       }
  330 | 
  331 |       for (const ancestor of ancestors) {
  332 |         const parsed = parseColor(getComputedStyle(ancestor).backgroundColor);
  333 |         if (parsed && parsed[3] > 0) {
  334 |           background = composite(parsed, background);
  335 |         }
  336 |       }
  337 |       return background;
  338 |     };
  339 | 
  340 |     const visible = (element: Element) => {
  341 |       const rect = element.getBoundingClientRect();
  342 |       const styles = getComputedStyle(element);
  343 |       return rect.width > 0 && rect.height > 0 && styles.visibility !== "hidden" && styles.display !== "none";
  344 |     };
  345 | 
  346 |     const elements = Array.from(
  347 |       document.querySelectorAll(".discipleos-secondary-copy, .discipleos-meta-copy, .discipleos-field-label"),
  348 |     ).filter(visible);
  349 | 
  350 |     const metrics = elements.map((element) => {
  351 |       const styles = getComputedStyle(element);
  352 |       const foregroundColor = parseColor(styles.color);
  353 |       const backgroundColor = renderedBackground(element);
  354 |       const foreground = foregroundColor
  355 |         ? composite(foregroundColor, backgroundColor)
  356 |         : [0, 0, 0] as [number, number, number];
  357 |       const ratio = foregroundColor ? contrast(foreground, backgroundColor) : 0;
  358 |       const fontSize = Number.parseFloat(styles.fontSize);
  359 |       const minimum = fontSize >= 18 ? 3 : 4.5;
  360 |       return {
  361 |         text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 140),
  362 |         className: element.className.toString(),
  363 |         color: styles.color,
  364 |         background: backgroundColor.map((channel) => Math.round(channel)),
  365 |         fontSize,
  366 |         ratio: Number(ratio.toFixed(2)),
  367 |         minimum,
  368 |       };
  369 |     });
  370 | 
  371 |     return {
  372 |       stateLabel,
  373 |       count: metrics.length,
  374 |       failures: metrics.filter((metric) => metric.ratio < metric.minimum),
  375 |       metrics,
  376 |     };
  377 |   }, label);
  378 | }
  379 | 
  380 | test("shows a visible reminder permission failure instead of appearing inactive", async ({ page }) => {
  381 |   await page.addInitScript(() => {
  382 |     Object.defineProperty(window, "Notification", {
  383 |       configurable: true,
  384 |       value: {
  385 |         permission: "default",
  386 |         requestPermission: async () => "denied",
  387 |       },
  388 |     });
  389 |   });
  390 |   const plan = makeOrdinaryPlan();
  391 |   await stubHomeApi(page, plan, [], { authenticated: true });
  392 |   await seedPlans(page, [plan]);
  393 |   await page.goto("/");
  394 | 
  395 |   const reminderButton = page.getByRole("button", {
  396 |     name: /Enable reminders|Notifications blocked|Try again/,
  397 |   }).first();
> 398 |   await expect(reminderButton).toBeVisible();
      |                                ^ Error: expect(locator).toBeVisible() failed
  399 |   await reminderButton.click();
  400 | 
  401 |   await expect(
  402 |     page.getByRole("button", { name: "Notifications blocked", exact: true }).first(),
  403 |   ).toBeVisible();
  404 |   await expect(
  405 |     page.getByRole("alert").filter({ hasText: "Notifications are blocked" }).first(),
  406 |   ).toBeVisible();
  407 | });
  408 | 
  409 | test("keeps audited secondary text readable across responsive DiscipleOS states", async ({ page }) => {
  410 |   const plan = makeOrdinaryPlan();
  411 |   await stubHomeApi(page, plan);
  412 |   await seedPlans(page, [plan]);
  413 | 
  414 |   for (const width of [360, 1280]) {
  415 |     await page.setViewportSize({ width, height: 900 });
  416 |     await page.goto("/");
  417 |     await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  418 |     await expect(page.getByTestId("dashboard-assigned-reading-overview")).toBeVisible();
  419 | 
  420 |     const todayAudit = await auditSecondaryText(page, `Today ${width}px`);
  421 |     expect(todayAudit.count).toBeGreaterThan(0);
  422 |     expect(todayAudit.failures).toEqual([]);
  423 | 
  424 |     const navigation = await openDashboardNavigation(page);
  425 |     await navigation.getByRole("button", { name: "Calendar", exact: true }).click();
  426 |     await expect(page.getByTestId("dashboard-calendar-content")).toBeVisible();
  427 |     const calendarAudit = await auditSecondaryText(page, `Calendar ${width}px`);
  428 |     expect(calendarAudit.count).toBeGreaterThan(0);
  429 |     expect(calendarAudit.failures).toEqual([]);
  430 | 
  431 |     await openDashboardNavigation(page);
  432 |     const plansNavigation = width >= 768
  433 |       ? page.getByTestId("dashboard-navigation-row")
  434 |       : page.getByTestId("dashboard-navigation-panel");
  435 |     await plansNavigation.getByRole("button", { name: "Plans", exact: true }).click();
  436 |     await expect(page.getByTestId("dashboard-plans-list")).toBeVisible();
  437 |     const plansAudit = await auditSecondaryText(page, `Plans ${width}px`);
  438 |     expect(plansAudit.count).toBeGreaterThan(0);
  439 |     expect(plansAudit.failures).toEqual([]);
  440 | 
  441 |     const buildStatePage = await openCreatePlanFromEmptyState(page, width);
  442 |     const buildAudit = await auditSecondaryText(buildStatePage, `Create Plan ${width}px`);
  443 |     expect(buildAudit.count).toBeGreaterThan(0);
  444 |     expect(buildAudit.failures).toEqual([]);
  445 |     await buildStatePage.getByTestId("plan-create-preset-newTestament").click();
  446 | 
  447 |     const stateColors = await buildStatePage.evaluate(() => {
  448 |       const selectedJourney = document.querySelector('[data-testid="dashboard-build-form"] button[aria-pressed="true"]');
  449 |       const unselectedJourney = document.querySelector('[data-testid="dashboard-build-form"] button[aria-pressed="false"]');
  450 |       const continueButton = document.querySelector('[data-testid="plan-create-next"]');
  451 |       return {
  452 |         selectedBackground: selectedJourney ? getComputedStyle(selectedJourney).backgroundColor : "",
  453 |         unselectedBackground: unselectedJourney ? getComputedStyle(unselectedJourney).backgroundColor : "",
  454 |         selectedClass: selectedJourney?.className?.toString() || "",
  455 |         unselectedClass: unselectedJourney?.className?.toString() || "",
  456 |         continueButtonColor: continueButton ? getComputedStyle(continueButton).color : "",
  457 |         continueButtonOpacity: continueButton ? getComputedStyle(continueButton).opacity : "",
  458 |       };
  459 |     });
  460 |     expect(stateColors.selectedClass).not.toBe(stateColors.unselectedClass);
  461 |     expect(stateColors.continueButtonColor).toBe("rgb(0, 0, 0)");
  462 |     expect(stateColors.continueButtonOpacity).toBe("1");
  463 |     await buildStatePage.close();
  464 |   }
  465 | });
  466 | 
  467 | test("completes a plan day in one tap, persists it, and avoids duplicate writes", async ({ page }) => {
  468 |   const today = todayISO();
  469 |   const plan = {
  470 |     ...makeOrdinaryPlan("complete-day-plan", "Complete Day Plan"),
  471 |     assignments: [
  472 |       {
  473 |         date: today,
  474 |         readings: [
  475 |           { key: "complete-day-1", label: "Psalm 1" },
  476 |           { key: "complete-day-2", label: "Psalm 2" },
  477 |           { key: "complete-day-3", label: "Psalm 3" },
  478 |         ],
  479 |       },
  480 |     ],
  481 |     completed: { "complete-day-1": true },
  482 |   };
  483 |   let dayCompletionWrites = 0;
  484 |   await stubHomeApi(page, plan);
  485 |   await seedPlans(page, [plan], [], true);
  486 |   page.on("request", (request) => {
  487 |     if (request.url().includes("/api/reading/day-complete") && request.method() === "POST") {
  488 |       dayCompletionWrites += 1;
  489 |     }
  490 |   });
  491 | 
  492 |   await page.goto("/");
  493 |   await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  494 |   await (await openDashboardNavigation(page)).getByRole("button", { name: "Plans", exact: true }).click();
  495 |   await page.getByTestId("planned-reading-card-complete-day-plan").click();
  496 | 
  497 |   const completeDay = page.getByTestId("button-complete-plan-day-1");
  498 |   await expect(completeDay).toHaveText("Complete day");
```