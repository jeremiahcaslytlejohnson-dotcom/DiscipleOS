# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-polish.spec.ts >> moves the Calendar month with adjacent-month date selections
- Location: tests/e2e/visual-polish.spec.ts:1477:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('calendar-day-2026-11-01')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - button "Feedback" [ref=e3] [cursor=pointer]:
    - generic [ref=e4]: ✦
    - text: Feedback
  - generic [ref=e6]:
    - generic [ref=e7]:
      - generic [ref=e8]:
        - heading "DISCIPLEOS" [level=1] [ref=e9]
        - link "Continue with email" [ref=e10] [cursor=pointer]:
          - /url: /sign-in
      - generic [ref=e11]:
        - paragraph [ref=e12]:
          - generic [ref=e13]: Discipline that
          - generic [ref=e14]: moves mountains.
        - paragraph [ref=e15]: Build steady habits in Scripture, prayer, and your daily walk with God.
    - navigation "Dashboard navigation" [ref=e17]:
      - button "Today" [ref=e18]
      - button "Calendar" [active] [pressed] [ref=e25]
      - button "Plans" [ref=e29]
      - link "Mountain Rhythm" [ref=e33] [cursor=pointer]:
        - /url: /mountain-rhythm
      - generic [ref=e37]:
        - button "Install App" [ref=e39]
        - button "Notifications blocked" [ref=e43]
    - generic [ref=e48]:
      - generic [ref=e49]:
        - generic [ref=e50]: Faith calendar
        - generic [ref=e53]:
          - generic [ref=e54]:
            - generic [ref=e55]:
              - generic [ref=e56]: Activities for Oct 4, 2026
              - generic [ref=e57]: Today
            - button "Today" [ref=e58]
          - button "Add Activity A short guided flow" [ref=e60]:
            - generic [ref=e63]:
              - generic [ref=e64]: Add Activity
              - generic [ref=e65]: A short guided flow
          - generic [ref=e69]:
            - generic [ref=e70]: Activities
            - generic [ref=e75]:
              - generic [ref=e76]:
                - generic [ref=e77]:
                  - generic [ref=e78]: Morning prayer
                  - generic [ref=e79]: prayer
                - generic [ref=e80]: 6:30 AM
                - generic [ref=e81]: A quiet start
              - generic [ref=e82]:
                - button "Complete activity" [ref=e83]
                - button "Edit Morning prayer" [ref=e86]
                - button "Delete Morning prayer" [ref=e90]
      - generic [ref=e94]:
        - generic [ref=e95]: Month overview
        - generic [ref=e98]:
          - button "Prev" [ref=e99]
          - generic [ref=e100]: October 2026
          - button "Next" [ref=e101]
        - generic [ref=e102]:
          - generic [ref=e103]: S
          - generic [ref=e104]: M
          - generic [ref=e105]: T
          - generic [ref=e106]: W
          - generic [ref=e107]: T
          - generic [ref=e108]: F
          - generic [ref=e109]: S
        - generic [ref=e110]:
          - button "Sep 27, 2026" [ref=e111]:
            - generic [ref=e112]: "27"
          - button "Sep 28, 2026" [ref=e113]:
            - generic [ref=e114]: "28"
          - button "Sep 29, 2026" [ref=e115]:
            - generic [ref=e116]: "29"
          - button "Sep 30, 2026" [ref=e117]:
            - generic [ref=e118]: "30"
          - button "Oct 1, 2026" [ref=e119]:
            - generic [ref=e120]: "1"
          - button "Oct 2, 2026" [ref=e121]:
            - generic [ref=e122]: "2"
          - button "Oct 3, 2026" [ref=e123]:
            - generic [ref=e124]: "3"
          - button "Oct 4, 2026, Prayer, selected" [ref=e125]:
            - generic [ref=e126]: "4"
            - generic [ref=e127]: P
          - button "Oct 5, 2026" [ref=e129]:
            - generic [ref=e130]: "5"
          - button "Oct 6, 2026" [ref=e131]:
            - generic [ref=e132]: "6"
          - button "Oct 7, 2026" [ref=e133]:
            - generic [ref=e134]: "7"
          - button "Oct 8, 2026" [ref=e135]:
            - generic [ref=e136]: "8"
          - button "Oct 9, 2026" [ref=e137]:
            - generic [ref=e138]: "9"
          - button "Oct 10, 2026" [ref=e139]:
            - generic [ref=e140]: "10"
          - button "Oct 11, 2026" [ref=e141]:
            - generic [ref=e142]: "11"
          - button "Oct 12, 2026" [ref=e143]:
            - generic [ref=e144]: "12"
          - button "Oct 13, 2026" [ref=e145]:
            - generic [ref=e146]: "13"
          - button "Oct 14, 2026" [ref=e147]:
            - generic [ref=e148]: "14"
          - button "Oct 15, 2026" [ref=e149]:
            - generic [ref=e150]: "15"
          - button "Oct 16, 2026" [ref=e151]:
            - generic [ref=e152]: "16"
          - button "Oct 17, 2026" [ref=e153]:
            - generic [ref=e154]: "17"
          - button "Oct 18, 2026" [ref=e155]:
            - generic [ref=e156]: "18"
          - button "Oct 19, 2026" [ref=e157]:
            - generic [ref=e158]: "19"
          - button "Oct 20, 2026" [ref=e159]:
            - generic [ref=e160]: "20"
          - button "Oct 21, 2026" [ref=e161]:
            - generic [ref=e162]: "21"
          - button "Oct 22, 2026" [ref=e163]:
            - generic [ref=e164]: "22"
          - button "Oct 23, 2026" [ref=e165]:
            - generic [ref=e166]: "23"
          - button "Oct 24, 2026" [ref=e167]:
            - generic [ref=e168]: "24"
          - button "Oct 25, 2026" [ref=e169]:
            - generic [ref=e170]: "25"
          - button "Oct 26, 2026" [ref=e171]:
            - generic [ref=e172]: "26"
          - button "Oct 27, 2026" [ref=e173]:
            - generic [ref=e174]: "27"
          - button "Oct 28, 2026" [ref=e175]:
            - generic [ref=e176]: "28"
          - button "Oct 29, 2026" [ref=e177]:
            - generic [ref=e178]: "29"
          - button "Oct 30, 2026" [ref=e179]:
            - generic [ref=e180]: "30"
          - button "Oct 31, 2026" [ref=e181]:
            - generic [ref=e182]: "31"
```

# Test source

```ts
  1394 |     await form.getByRole("button", { name: "Reminder on", exact: true }).click();
  1395 |     await expect(form.getByLabel("Reminder lead time")).toHaveCount(0);
  1396 |     await form.getByLabel("Notes").fill("Keep this draft while checking the calendar.");
  1397 |     await form.getByRole("button", { name: /Hide/ }).click();
  1398 |     await expect(page.getByTestId("calendar-event-form")).toHaveCount(0);
  1399 | 
  1400 |     await page.getByTestId("calendar-add-event-control").click();
  1401 |     const reopenedForm = page.getByTestId("calendar-event-form");
  1402 |     await expect(reopenedForm.getByTestId("calendar-step-review")).toBeVisible();
  1403 |     await expect(reopenedForm.getByTestId("calendar-step-review")).toContainText("Personal event");
  1404 |     await expect(reopenedForm.getByLabel("Notes")).toHaveValue("Keep this draft while checking the calendar.");
  1405 |     await expect(reopenedForm.getByTestId("calendar-more-options")).toHaveCount(0);
  1406 |     await expect(reopenedForm.getByTestId("calendar-optional-details")).toBeVisible();
  1407 | 
  1408 |     await reopenedForm.getByRole("button", { name: "Reset", exact: true }).click();
  1409 |     await expect(reopenedForm.getByTestId("calendar-step-activity")).toBeVisible();
  1410 |     await expect(reopenedForm.getByLabel("Activity name")).toHaveCount(0);
  1411 |     await expect(reopenedForm.getByTestId("calendar-repeat-controls")).toHaveCount(0);
  1412 |     await expect(reopenedForm.getByTestId("calendar-optional-details")).toHaveCount(0);
  1413 |     await expect(reopenedForm.getByTestId("calendar-more-options")).toHaveCount(0);
  1414 |     await expect(reopenedForm.getByTestId("calendar-save-activity")).toHaveCount(0);
  1415 | 
  1416 |     await reopenedForm.getByTestId("calendar-activity-type-event").click();
  1417 |     await reopenedForm.getByTestId("calendar-step-continue").click();
  1418 |     await reopenedForm.getByTestId("calendar-step-continue").click();
  1419 |     await reopenedForm.getByTestId("calendar-repeat-yes").click();
  1420 |     await reopenedForm.getByLabel("Repeat pattern").selectOption("weekly");
  1421 |     await reopenedForm.getByTestId("calendar-step-continue").click();
  1422 |     const saveRequest = page.waitForRequest(
  1423 |       (request) => new URL(request.url()).pathname.endsWith("/api/events") && request.method() === "POST",
  1424 |     );
  1425 |     await reopenedForm.getByRole("button", { name: "Add Activity", exact: true }).click();
  1426 |     const savedEventRequest = await saveRequest;
  1427 |     expect(savedEventRequest.postDataJSON()).toMatchObject({
  1428 |       title: "Personal event",
  1429 |       repeat: "weekly",
  1430 |     });
  1431 |     await expect(page.getByText("Personal event", { exact: true })).toBeVisible();
  1432 |     await expect(page.getByTestId("calendar-activity-feedback")).toContainText("Activity added");
  1433 |     await expect(page.getByTestId("calendar-activity-feedback").getByRole("button", { name: "Edit activity", exact: true })).toBeVisible();
  1434 |     await expect(page.getByTestId("calendar-activity-feedback").getByRole("button", { name: "Add another", exact: true })).toBeVisible();
  1435 |     await expect(page.getByTestId("calendar-activity-feedback").getByRole("button", { name: "Done", exact: true })).toBeVisible();
  1436 |     await expect(page.getByTestId("calendar-event-form")).toHaveCount(0);
  1437 | 
  1438 |     await page.getByTestId(`calendar-day-${todayISO()}`).click();
  1439 |     const morningPrayerRow = activities.locator(".discipleos-flat-row").filter({ hasText: "Morning prayer" }).first();
  1440 |     await morningPrayerRow.getByRole("button", { name: "Edit Morning prayer", exact: true }).click();
  1441 |     const editForm = page.getByTestId("calendar-event-form");
  1442 |     await expect(editForm.getByLabel("Title")).toHaveValue("Morning prayer");
  1443 |     await editForm.getByRole("button", { name: width < 430 ? "Cancel" : "Cancel edit", exact: true }).click();
  1444 |     await expect(editForm.getByLabel("Title")).toHaveCount(0);
  1445 |   }
  1446 | });
  1447 | 
  1448 | test("keeps the Calendar activity form open when changing the selected day", async ({ page }) => {
  1449 |   const plan = makeOrdinaryPlan("calendar-date-change-plan", "Calendar reading");
  1450 |   await stubHomeApi(page, plan);
  1451 |   await seedPlans(page, [plan]);
  1452 | 
  1453 |   for (const width of [320, 1280]) {
  1454 |     await page.setViewportSize({ width, height: 900 });
  1455 |     await page.goto("/");
  1456 |     const navigation = await openDashboardNavigation(page);
  1457 |     await navigation.getByRole("button", { name: "Calendar", exact: true }).click();
  1458 | 
  1459 |     await page.getByTestId("calendar-add-event-control").click();
  1460 |     const form = page.getByTestId("calendar-event-form");
  1461 |     await form.getByTestId("calendar-activity-type-event").click();
  1462 |     await form.getByTestId("calendar-step-continue").click();
  1463 |     await expect(form.getByTestId("calendar-step-when")).toBeVisible();
  1464 | 
  1465 |     const chosenDate = tomorrowISO();
  1466 |     await page.getByTestId(`calendar-day-${chosenDate}`).click();
  1467 | 
  1468 |     await expect(page.getByTestId("calendar-event-form")).toHaveCount(1);
  1469 |     await expect(form).toBeVisible();
  1470 |     await expect(form.getByLabel("Selected date")).toHaveValue(chosenDate);
  1471 |     await expect(page.getByTestId("dashboard-calendar-activities")).toHaveCount(1);
  1472 |     await expect(page.getByTestId("calendar-items-list")).toHaveCount(1);
  1473 |     await expect(page.getByTestId(`calendar-day-${chosenDate}`)).toHaveAttribute("aria-label", /selected/);
  1474 |   }
  1475 | });
  1476 | 
  1477 | test("moves the Calendar month with adjacent-month date selections", async ({ page }) => {
  1478 |   const today = new Date(`${todayISO()}T12:00:00`);
  1479 |   const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  1480 |   const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  1481 |   const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  1482 |   const toISODate = (date: Date) =>
  1483 |     `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  1484 |   const monthLabel = (date: Date) =>
  1485 |     date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  1486 | 
  1487 |   await stubHomeApi(page, []);
  1488 |   await seedPlans(page, []);
  1489 |   await page.goto("/");
  1490 |   await (await openDashboardNavigation(page)).getByRole("button", { name: "Calendar", exact: true }).click();
  1491 | 
  1492 |   const month = page.getByTestId("dashboard-calendar-month");
  1493 |   const nextMonthDate = toISODate(nextMonthStart);
> 1494 |   await page.getByTestId(`calendar-day-${nextMonthDate}`).click();
       |                                                           ^ Error: locator.click: Test timeout of 30000ms exceeded.
  1495 |   await expect(month.getByText(monthLabel(nextMonthStart), { exact: true })).toBeVisible();
  1496 |   await expect(page.getByTestId(`calendar-day-${nextMonthDate}`)).toHaveAttribute("aria-label", /selected/);
  1497 | 
  1498 |   const previousMonthDate = toISODate(currentMonthEnd);
  1499 |   await page.getByTestId(`calendar-day-${previousMonthDate}`).click();
  1500 |   await expect(month.getByText(monthLabel(currentMonthStart), { exact: true })).toBeVisible();
  1501 |   await expect(page.getByTestId(`calendar-day-${previousMonthDate}`)).toHaveAttribute("aria-label", /selected/);
  1502 | });
  1503 | 
  1504 | test("keeps mobile pages inside the viewport and wraps active route labels", async ({ page }) => {
  1505 |   await page.setViewportSize({ width: 320, height: 800 });
  1506 |   const plan = makeOrdinaryPlan();
  1507 |   await stubHomeApi(page, plan);
  1508 |   await seedPlans(page, [plan]);
  1509 |   await page.goto("/");
  1510 | 
  1511 |   const homeLayout = await page.evaluate(() => ({
  1512 |     viewportWidth: window.innerWidth,
  1513 |     documentWidth: document.documentElement.scrollWidth,
  1514 |   }));
  1515 |   expect(homeLayout.documentWidth).toBeLessThanOrEqual(homeLayout.viewportWidth + 1);
  1516 | 
  1517 |   const today = todayISO();
  1518 |   const resetPlan = {
  1519 |     ...makeOrdinaryPlan(),
  1520 |     id: "visual-polish-reset",
  1521 |     name: "20-Day Reset",
  1522 |     journeyKey: "20-day-reset",
  1523 |     journeyType: "20-day-reset",
  1524 |     durationDays: 20,
  1525 |     totalDays: 20,
  1526 |     assignments: Array.from({ length: 20 }, (_, index) => ({
  1527 |       date: index === 0 ? today : today,
  1528 |       readings: [{ key: `visual-polish-reset-${index}`, label: `Reset reading ${index + 1}` }],
  1529 |     })),
  1530 |   };
  1531 |   await page.unrouteAll();
  1532 |   await stubMountainApi(page);
  1533 |   await seedPlans(page, [resetPlan]);
  1534 |   await page.goto("/mountain-rhythm");
  1535 |   const resetButton = page.getByTestId("button-choose-20-day-reset");
  1536 |   await expect(resetButton).toContainText("20-Day Reset · In Progress");
  1537 |   const buttonLayout = await resetButton.evaluate((element) => ({
  1538 |     scrollWidth: element.scrollWidth,
  1539 |     clientWidth: element.clientWidth,
  1540 |   }));
  1541 |   expect(buttonLayout.scrollWidth).toBeLessThanOrEqual(buttonLayout.clientWidth + 1);
  1542 | 
  1543 |   const mountainLayout = await page.evaluate(() => ({
  1544 |     viewportWidth: window.innerWidth,
  1545 |     documentWidth: document.documentElement.scrollWidth,
  1546 |   }));
  1547 |   expect(mountainLayout.documentWidth).toBeLessThanOrEqual(mountainLayout.viewportWidth + 1);
  1548 | });
  1549 | 
  1550 | test("prioritizes Today’s Reading across supported dashboard widths", async ({ page }) => {
  1551 |   const firstPlan = makeOrdinaryPlan("visual-polish-morning", "Morning Psalms");
  1552 |   const secondPlan = makeOrdinaryPlan("visual-polish-evening", "Evening Proverbs");
  1553 |   await stubHomeApi(page, [firstPlan, secondPlan]);
  1554 |   await seedPlans(page, [firstPlan, secondPlan]);
  1555 |   await page.addInitScript(() => localStorage.removeItem("discipleos:dashboard-disclosures"));
  1556 | 
  1557 |   for (const width of [320, 390, 480, 1280]) {
  1558 |     await page.setViewportSize({ width, height: 900 });
  1559 |     await page.goto("/");
  1560 | 
  1561 |     await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  1562 |     await expect(page.getByTestId("dashboard-verse-of-day")).toBeVisible();
  1563 |     await expect(page.getByTestId("dashboard-today-content").getByText("Today’s Walk", { exact: true })).toHaveCount(0);
  1564 |     await expect(page.getByTestId("dashboard-stats")).toHaveCount(0);
  1565 | 
  1566 |     const assigned = page.getByTestId("dashboard-assigned-reading");
  1567 |     const activities = page.getByTestId("dashboard-schedule");
  1568 |     const progress = page.getByTestId("dashboard-progress");
  1569 |     const mountain = page.getByTestId("dashboard-mountain-rhythm");
  1570 |     await expect(assigned.getByRole("button", { name: /Today’s Reading/ })).toHaveAttribute("aria-expanded", "true");
  1571 |     await expect(assigned.getByTestId("dashboard-assigned-reading-values")).toContainText("0 of 2 chapters complete");
  1572 |     await expect(assigned.getByText("Morning Psalms", { exact: true })).toBeVisible();
  1573 |     await expect(assigned.getByText("Evening Proverbs", { exact: true })).toBeVisible();
  1574 |     await expect(activities.getByRole("button", { name: /Today’s Activities/ })).toHaveAttribute("aria-expanded", "true");
  1575 |     await expect(progress.getByRole("button", { name: /^Progress/ })).toHaveAttribute("aria-expanded", "false");
  1576 |     await expect(mountain.getByRole("button", { name: /Mountain Rhythm/ })).toHaveAttribute("aria-expanded", "false");
  1577 | 
  1578 |     const layout = await page.evaluate(() => {
  1579 |       const top = (testId: string) =>
  1580 |         document.querySelector(`[data-testid="${testId}"]`)?.getBoundingClientRect().top ?? Infinity;
  1581 |       return {
  1582 |         viewportWidth: window.innerWidth,
  1583 |         documentWidth: document.documentElement.scrollWidth,
  1584 |         verse: top("dashboard-verse-of-day"),
  1585 |         assigned: top("dashboard-assigned-reading"),
  1586 |         activities: top("dashboard-schedule"),
  1587 |         progress: top("dashboard-progress"),
  1588 |         mountain: top("dashboard-mountain-rhythm"),
  1589 |       };
  1590 |     });
  1591 | 
  1592 |     expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  1593 |     expect(layout.verse).toBeLessThan(layout.assigned);
  1594 |     expect(layout.assigned).toBeLessThan(layout.activities);
```