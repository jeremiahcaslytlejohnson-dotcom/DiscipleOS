# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-polish.spec.ts >> keeps audited secondary text readable across responsive DiscipleOS states
- Location: tests/e2e/visual-polish.spec.ts:409:1

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - status "Loading DiscipleOS" [ref=f1e3]
  - button "Feedback" [ref=f1e4] [cursor=pointer]:
    - generic [ref=f1e5]: ✦
    - text: Feedback
  - generic [ref=f1e7]:
    - generic [ref=f1e8]:
      - generic [ref=f1e9]:
        - heading "DISCIPLEOS" [level=1] [ref=f1e10]
        - link "Continue with email" [ref=f1e11] [cursor=pointer]:
          - /url: /sign-in
      - paragraph [ref=f1e13]: Today’s reading · keep taking the next faithful step
    - generic [ref=f1e14]:
      - generic [ref=f1e17]:
        - generic [ref=f1e18]: Verse of the day
        - generic [ref=f1e19]: “Blessed is the one who walks not in step with the wicked.”
        - generic [ref=f1e20]: Psalm 1:1
      - generic [ref=f1e21]:
        - button "Today’s Reading 0 of 1 chapters complete" [expanded] [ref=f1e23]:
          - generic [ref=f1e27]:
            - generic [ref=f1e28]: Today’s Reading
            - generic [ref=f1e29]: 0 of 1 chapters complete
        - generic [ref=f1e32]:
          - generic [ref=f1e33]:
            - generic [ref=f1e34]:
              - generic [ref=f1e35]: Today’s completion
              - generic [ref=f1e36]: 0 of 1 chapters complete
              - generic [ref=f1e37]: ~1m estimated reading
            - button "Open day view" [ref=f1e38]
          - generic [ref=f1e39]:
            - generic [ref=f1e40]:
              - generic [ref=f1e41]:
                - generic [ref=f1e42]: Morning Psalms
                - generic [ref=f1e43]: 1 reading · ~1m
              - generic [ref=f1e44]:
                - button "Complete day" [ref=f1e45]
                - button "Open plan" [ref=f1e46]
            - button "Psalm 1 Reading~1m" [ref=f1e50]:
              - generic [ref=f1e51]:
                - generic [ref=f1e52]: Psalm 1
                - generic [ref=f1e53]:
                  - text: Reading
                  - generic [ref=f1e54]: ~1m
      - generic [ref=f1e57]:
        - generic [ref=f1e58]:
          - button "Today’s Activities" [expanded]
        - generic [ref=f1e61]:
          - generic [ref=f1e62]:
            - generic [ref=f1e63]: prayer
            - generic [ref=f1e64]:
              - button "Complete activity" [ref=f1e65]
              - button "Edit Morning prayer" [ref=f1e68]
          - generic [ref=f1e72]: Morning prayer
          - generic [ref=f1e73]: 6:30 AM today
          - generic [ref=f1e74]: A quiet start
      - button "Progress Ordinary reading plans" [ref=f1e77]:
        - generic [ref=f1e81]:
          - generic [ref=f1e82]: Progress
          - generic [ref=f1e83]: Ordinary reading plans
      - generic [ref=f1e87]:
        - button "Mountain Rhythm Long-term climb progress" [ref=f1e88]:
          - generic [ref=f1e92]:
            - generic [ref=f1e93]: Mountain Rhythm
            - generic [ref=f1e94]: Long-term climb progress
        - link "Details" [ref=f1e97] [cursor=pointer]:
          - /url: /mountain-rhythm
```

# Test source

```ts
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
  398 |   await expect(reminderButton).toBeVisible();
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
> 421 |     expect(todayAudit.count).toBeGreaterThan(0);
      |                              ^ Error: expect(received).toBeGreaterThan(expected)
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
  499 |   await completeDay.click();
  500 |   await expect(completeDay).toHaveText("Day complete");
  501 |   await expect(completeDay).toBeDisabled();
  502 |   await expect(page.getByTestId("plan-reading-complete-day-2")).toHaveClass(/bg-\[#10B981\]\/10/);
  503 |   expect(dayCompletionWrites).toBe(1);
  504 | 
  505 |   await completeDay.click({ force: true });
  506 |   expect(dayCompletionWrites).toBe(1);
  507 | 
  508 |   await expect.poll(async () => {
  509 |     const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("discipleos-data") || "{}"));
  510 |     const storedPlan = stored.plans?.find((item: any) => item.id === "complete-day-plan");
  511 |     return storedPlan?.completed?.["complete-day-3"] === true;
  512 |   }).toBe(true);
  513 |   await page.reload();
  514 |   await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  515 |   await (await openDashboardNavigation(page)).getByRole("button", { name: "Plans", exact: true }).click();
  516 |   await expect(page.getByTestId("button-complete-plan-day-1")).toHaveText("Day complete");
  517 |   await expect(page.getByTestId("button-complete-plan-day-1")).toBeDisabled();
  518 |   await expect(page.getByTestId("plan-reading-complete-day-3")).toHaveClass(/bg-\[#10B981\]\/10/);
  519 |   expect(dayCompletionWrites).toBe(1);
  520 | });
  521 | 
```