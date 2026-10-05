# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-polish.spec.ts >> collapses Calendar reading plans independently while keeping the summary and completion action visible
- Location: tests/e2e/visual-polish.spec.ts:523:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('dashboard-calendar-activities').getByTestId('calendar-plan-item-calendar-collapsible-climb').getByRole('button', { name: 'Complete day', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('dashboard-calendar-activities').getByTestId('calendar-plan-item-calendar-collapsible-climb').getByRole('button', { name: 'Complete day', exact: true })

```

```yaml
- button "Feedback"
- heading "DISCIPLEOS" [level=1]
- link "Continue with email":
  - /url: /sign-in
- paragraph: Today’s reading · keep taking the next faithful step
- navigation "Dashboard navigation":
  - button "Today"
  - button "Calendar" [pressed]
  - button "Plans"
  - link "Mountain Rhythm":
    - /url: /mountain-rhythm
  - button "Install App"
  - button "Notifications blocked"
- text: Faith calendar Activities for Oct 5, 2026 Today
- button "Today"
- button "Add Activity A short guided flow"
- text: Reading
- button "Expand 7-Day Climb readings": 7-Day Climb bible
- text: 6:45 AM 3 chapters assigned
- button "Undo day"
- button "Expand Prayer & Purpose readings": Prayer & Purpose bible
- text: 8:15 AM 2 chapters assigned
- button "Complete day"
- text: Activities Morning prayer prayer 6:30 AM A quiet start
- button "Complete activity"
- button "Edit Morning prayer"
- button "Delete Morning prayer"
- text: Month overview
- button "Prev"
- text: October 2026
- button "Next"
- text: S M T W T F S
- button "Sep 27, 2026": "27"
- button "Sep 28, 2026": "28"
- button "Sep 29, 2026": "29"
- button "Sep 30, 2026": "30"
- button "Oct 1, 2026": "1"
- button "Oct 2, 2026": "2"
- button "Oct 3, 2026": "3"
- button "Oct 4, 2026": "4"
- button "Oct 5, 2026, Bible reading, Prayer, Mountain Rhythm, selected": "5"
- button "Oct 6, 2026": "6"
- button "Oct 7, 2026": "7"
- button "Oct 8, 2026": "8"
- button "Oct 9, 2026": "9"
- button "Oct 10, 2026": "10"
- button "Oct 11, 2026": "11"
- button "Oct 12, 2026": "12"
- button "Oct 13, 2026": "13"
- button "Oct 14, 2026": "14"
- button "Oct 15, 2026": "15"
- button "Oct 16, 2026": "16"
- button "Oct 17, 2026": "17"
- button "Oct 18, 2026": "18"
- button "Oct 19, 2026": "19"
- button "Oct 20, 2026": "20"
- button "Oct 21, 2026": "21"
- button "Oct 22, 2026": "22"
- button "Oct 23, 2026": "23"
- button "Oct 24, 2026": "24"
- button "Oct 25, 2026": "25"
- button "Oct 26, 2026": "26"
- button "Oct 27, 2026": "27"
- button "Oct 28, 2026": "28"
- button "Oct 29, 2026": "29"
- button "Oct 30, 2026": "30"
- button "Oct 31, 2026": "31"
```

# Test source

```ts
  480 |       },
  481 |     ],
  482 |     completed: { "complete-day-1": true },
  483 |   };
  484 |   let dayCompletionWrites = 0;
  485 |   await stubHomeApi(page, plan);
  486 |   await seedPlans(page, [plan], [], true);
  487 |   page.on("request", (request) => {
  488 |     if (request.url().includes("/api/reading/day-complete") && request.method() === "POST") {
  489 |       dayCompletionWrites += 1;
  490 |     }
  491 |   });
  492 | 
  493 |   await page.goto("/");
  494 |   await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  495 |   await (await openDashboardNavigation(page)).getByRole("button", { name: "Plans", exact: true }).click();
  496 |   await page.getByTestId("planned-reading-card-complete-day-plan").click();
  497 | 
  498 |   const completeDay = page.getByTestId("button-complete-plan-day-1");
  499 |   await expect(completeDay).toHaveText("Complete day");
  500 |   await completeDay.click();
  501 |   await expect(completeDay).toHaveText("Day complete");
  502 |   await expect(completeDay).toBeDisabled();
  503 |   await expect(page.getByTestId("plan-reading-complete-day-2")).toHaveClass(/bg-\[#10B981\]\/10/);
  504 |   expect(dayCompletionWrites).toBe(1);
  505 | 
  506 |   await completeDay.click({ force: true });
  507 |   expect(dayCompletionWrites).toBe(1);
  508 | 
  509 |   await expect.poll(async () => {
  510 |     const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("discipleos-data") || "{}"));
  511 |     const storedPlan = stored.plans?.find((item: any) => item.id === "complete-day-plan");
  512 |     return storedPlan?.completed?.["complete-day-3"] === true;
  513 |   }).toBe(true);
  514 |   await page.reload();
  515 |   await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  516 |   await (await openDashboardNavigation(page)).getByRole("button", { name: "Plans", exact: true }).click();
  517 |   await expect(page.getByTestId("button-complete-plan-day-1")).toHaveText("Day complete");
  518 |   await expect(page.getByTestId("button-complete-plan-day-1")).toBeDisabled();
  519 |   await expect(page.getByTestId("plan-reading-complete-day-3")).toHaveClass(/bg-\[#10B981\]\/10/);
  520 |   expect(dayCompletionWrites).toBe(1);
  521 | });
  522 | 
  523 | test("collapses Calendar reading plans independently while keeping the summary and completion action visible", async ({ page }) => {
  524 |   const today = todayISO();
  525 |   const firstPlan = {
  526 |     ...makeOrdinaryPlan("calendar-collapsible-climb", "7-Day Climb"),
  527 |     readingTime: "06:45",
  528 |     assignments: [
  529 |       {
  530 |         date: today,
  531 |         readings: [
  532 |           { key: "calendar-collapsible-1", label: "Psalm 1" },
  533 |           { key: "calendar-collapsible-2", label: "Psalm 2" },
  534 |           { key: "calendar-collapsible-3", label: "Psalm 3" },
  535 |         ],
  536 |       },
  537 |     ],
  538 |     completed: {},
  539 |   };
  540 |   const secondPlan = {
  541 |     ...makeOrdinaryPlan("calendar-collapsible-purpose", "Prayer & Purpose"),
  542 |     readingTime: "08:15",
  543 |     assignments: [
  544 |       {
  545 |         date: today,
  546 |         readings: [
  547 |           { key: "calendar-purpose-1", label: "Matthew 1" },
  548 |           { key: "calendar-purpose-2", label: "Matthew 2" },
  549 |         ],
  550 |       },
  551 |     ],
  552 |     completed: {},
  553 |   };
  554 |   await stubHomeApi(page, [firstPlan, secondPlan], []);
  555 |   await seedPlans(page, [firstPlan, secondPlan]);
  556 | 
  557 |   for (const width of [390, 1280]) {
  558 |     await page.setViewportSize({ width, height: 900 });
  559 |     await page.goto("/");
  560 |     const navigation = await openDashboardNavigation(page);
  561 |     await navigation.getByRole("button", { name: "Calendar", exact: true }).click();
  562 | 
  563 |     const activities = page.getByTestId("dashboard-calendar-activities");
  564 |     const firstRow = activities.getByTestId(`calendar-plan-item-${firstPlan.id}`);
  565 |     const secondRow = activities.getByTestId(`calendar-plan-item-${secondPlan.id}`);
  566 |     const firstToggle = firstRow.getByTestId(`calendar-plan-toggle-${firstPlan.id}`);
  567 |     const secondToggle = secondRow.getByTestId(`calendar-plan-toggle-${secondPlan.id}`);
  568 |     const firstReadings = firstRow.getByTestId(`calendar-plan-readings-${firstPlan.id}`);
  569 |     const secondReadings = secondRow.getByTestId(`calendar-plan-readings-${secondPlan.id}`);
  570 | 
  571 |     await expect(firstToggle).toHaveAttribute("aria-expanded", "false");
  572 |     await expect(secondToggle).toHaveAttribute("aria-expanded", "false");
  573 |     await expect(firstReadings).toBeHidden();
  574 |     await expect(secondReadings).toBeHidden();
  575 | 
  576 |     await expect(firstRow).toContainText("7-Day Climb");
  577 |     await expect(firstRow).toContainText("bible");
  578 |     await expect(firstRow).toContainText(/6:45/);
  579 |     await expect(firstRow).toContainText("3 chapters assigned");
> 580 |     await expect(firstRow.getByRole("button", { name: "Complete day", exact: true })).toBeVisible();
      |                                                                                       ^ Error: expect(locator).toBeVisible() failed
  581 |     await expect(secondRow).toContainText("Prayer & Purpose");
  582 |     await expect(secondRow).toContainText("2 chapters assigned");
  583 |     await expect(secondRow.getByRole("button", { name: "Complete day", exact: true })).toBeVisible();
  584 | 
  585 |     const toggleBox = await firstToggle.boundingBox();
  586 |     expect(toggleBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  587 | 
  588 |     await firstToggle.click();
  589 |     await expect(firstToggle).toHaveAttribute("aria-expanded", "true");
  590 |     await expect(firstReadings).toBeVisible();
  591 |     await expect(firstReadings.getByRole("button", { name: "Psalm 1" })).toBeVisible();
  592 |     await expect(secondReadings).toBeHidden();
  593 | 
  594 |     await firstReadings.getByRole("button", { name: "Psalm 1" }).click();
  595 |     await expect(firstReadings.getByRole("button", { name: "Psalm 1" })).toHaveClass(/border-emerald-400/);
  596 |     await firstToggle.click();
  597 |     await expect(firstReadings).toBeHidden();
  598 | 
  599 |     await firstRow.getByRole("button", { name: "Complete day", exact: true }).click();
  600 |     await expect(firstRow.getByRole("button", { name: "Undo day", exact: true })).toBeVisible();
  601 |     await expect(firstReadings).toBeHidden();
  602 |   }
  603 | });
  604 | 
  605 | test("undoes a completed Calendar day while preserving its earned history", async ({ page }) => {
  606 |   const today = todayISO();
  607 |   const plan = {
  608 |     ...makeOrdinaryPlan("calendar-undo-plan", "Calendar Undo Plan"),
  609 |     assignments: [
  610 |       {
  611 |         date: today,
  612 |         readings: [
  613 |           { key: "calendar-undo-1", label: "Psalm 1" },
  614 |           { key: "calendar-undo-2", label: "Psalm 2" },
  615 |         ],
  616 |       },
  617 |     ],
  618 |     completed: { "calendar-undo-1": true, "calendar-undo-2": true },
  619 |     earnedDayKeys: [today],
  620 |     dayCompletionDates: { [today]: today },
  621 |   };
  622 |   const dayCompletionWrites: any[] = [];
  623 |   await stubHomeApi(page, plan);
  624 |   await seedPlans(page, [plan], [], true);
  625 |   page.on("request", (request) => {
  626 |     if (request.url().includes("/api/reading/day-complete") && request.method() === "POST") {
  627 |       dayCompletionWrites.push(request.postDataJSON());
  628 |     }
  629 |   });
  630 | 
  631 |   await page.goto("/");
  632 |   await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  633 |   await (await openDashboardNavigation(page)).getByRole("button", { name: "Calendar", exact: true }).click();
  634 |   await page.getByTestId(`calendar-day-${today}`).click();
  635 | 
  636 |   const activities = page.getByTestId("dashboard-calendar-activities");
  637 |   await activities.getByRole("button", { name: "Undo day", exact: true }).click();
  638 |   await expect(activities.getByRole("button", { name: "Complete day", exact: true })).toBeVisible();
  639 |   await expect.poll(() => dayCompletionWrites.length).toBe(1);
  640 |   expect(dayCompletionWrites[0]).toMatchObject({
  641 |     planId: plan.id,
  642 |     date: today,
  643 |     completed: false,
  644 |   });
  645 | 
  646 |   const storedPlanState = await page.evaluate(() => {
  647 |     const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
  648 |     const storedPlan = data.plans?.find((item: any) => item.id === "calendar-undo-plan");
  649 |     return {
  650 |       completed: storedPlan?.completed,
  651 |       earnedDayKeys: storedPlan?.earnedDayKeys,
  652 |       dayCompletionDates: storedPlan?.dayCompletionDates,
  653 |     };
  654 |   });
  655 |   expect(storedPlanState).toEqual({
  656 |     completed: { "calendar-undo-1": false, "calendar-undo-2": false },
  657 |     earnedDayKeys: [today],
  658 |     dayCompletionDates: { [today]: today },
  659 |   });
  660 | 
  661 |   await page.reload();
  662 |   await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  663 |   await (await openDashboardNavigation(page)).getByRole("button", { name: "Calendar", exact: true }).click();
  664 |   await page.getByTestId(`calendar-day-${today}`).click();
  665 |   await expect(
  666 |     page.getByTestId("dashboard-calendar-activities").getByRole("button", { name: "Complete day", exact: true }),
  667 |   ).toBeVisible();
  668 |   const persistedHistory = await page.evaluate(() => {
  669 |     const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
  670 |     const storedPlan = data.plans?.find((item: any) => item.id === "calendar-undo-plan");
  671 |     return {
  672 |       earnedDayKeys: storedPlan?.earnedDayKeys,
  673 |       dayCompletionDates: storedPlan?.dayCompletionDates,
  674 |     };
  675 |   });
  676 |   expect(persistedHistory).toEqual({
  677 |     earnedDayKeys: [today],
  678 |     dayCompletionDates: { [today]: today },
  679 |   });
  680 | });
```