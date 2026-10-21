# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> plots each 7-Day Climb day as a separate ascent point
- Location: tests/e2e/mountain-rhythm.spec.ts:1445:1

# Error details

```
Error: expect(received).toBeCloseTo(expected, precision)

Expected: 145.2
Received: 133.20799999999997

Expected precision:    0
Expected difference: < 0.5
Received difference:   11.992000000000019
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
            - generic [ref=e38]: Complete
            - generic [ref=e39]: 100% of today’s reading
          - generic [ref=e41]:
            - generic [ref=e42]: Journey progress
            - generic [ref=e43]: 57.1%
            - generic [ref=e44]: 4 of 7 planned days
          - generic [ref=e46]:
            - generic [ref=e47]: Consistency
            - generic [ref=e48]: 100%
            - generic [ref=e49]: Steady consistency
        - generic [ref=e51]:
          - img "7-Day Climb reading-rhythm trail; current elevation 57.1%, journey progress 57.1%" [ref=e52]:
            - generic "Elevation guide lines" [ref=e60]
            - generic "Elevation level labels" [ref=e63]:
              - 'generic "Milestone: Basecamp, 0% threshold" [ref=e65]': Basecamp
              - 'generic "Milestone: On the Trail, 25% threshold" [ref=e67]': On the Trail
              - 'generic "Current stage: Gaining Elevation, 50% threshold" [ref=e69]': GainingElevation
              - 'generic "Next milestone: Ridgeline, 70% threshold" [ref=e71]': Ridgeline
              - 'generic "Milestone: Summit, 85% threshold" [ref=e73]': Summit
            - generic "Day 1, complete, readings complete, 14.3% current elevation, 14.3% earned ascent" [ref=e74]
            - generic "Day 2, complete, readings complete, 28.6% current elevation, 28.6% earned ascent" [ref=e75]
            - generic "Day 3, complete, readings complete, 42.9% current elevation, 42.9% earned ascent" [ref=e76]
            - generic "Day 4, complete, readings complete, 57.1% current elevation, 57.1% earned ascent" [ref=e77]
            - generic "Day 5, future, readings future, 57.1% current elevation, 57.1% earned ascent" [ref=e78]
            - generic "Day 6, future, readings future, 57.1% current elevation, 57.1% earned ascent" [ref=e79]
            - generic "Day 7, future, readings future, 57.1% current elevation, 57.1% earned ascent" [ref=e80]
            - generic [ref=e81]:
              - generic [ref=e82]: "1"
              - generic [ref=e84]: "2"
              - generic [ref=e86]: "3"
              - generic [ref=e88]: "4"
              - generic [ref=e90]: "5"
              - generic [ref=e92]: "6"
              - generic [ref=e94]: "7"
            - generic "Today's position at Gaining Elevation" [ref=e96]:
              - generic "Current elevation 57.1%" [ref=e98]
              - generic [ref=e99]: Today
          - list "Elevation milestones" [ref=e100]:
            - listitem [ref=e101]: "Basecamp: 0%"
            - listitem [ref=e102]: "On the Trail: 25%"
            - listitem [ref=e103]: "Gaining Elevation: 50%"
            - listitem [ref=e104]: "Ridgeline: 70%"
            - listitem [ref=e105]: "Summit: 85%"
        - paragraph [ref=e106]:
          - text: "Current: Gaining Elevation · Next: Ridgeline"
          - generic [ref=e107]: "Current elevation: Gaining Elevation · 57.1% · Today, Oct 21 · Day 4"
        - group [ref=e109]:
          - generic "How Mountain Rhythm works" [ref=e110] [cursor=pointer]
      - generic [ref=e112]:
        - generic [ref=e113]:
          - generic [ref=e114]:
            - generic [ref=e115]: Route to today
            - paragraph [ref=e120]: 7-Day Climb · future readings stay hidden until their day
          - generic [ref=e121]: 4/7 days
        - generic [ref=e122]:
          - generic [ref=e123]: Today’s next step
          - generic [ref=e124]:
            - generic [ref=e125]: Complete
            - generic [ref=e129]: 100% of today's reading complete
        - generic [ref=e130]:
          - generic [ref=e131]:
            - generic [ref=e132]:
              - button "Collapse Day 4 readings, Oct 21, 2026, Complete, 2 readings, estimated reading time 6 min" [expanded] [ref=e133]:
                - generic [ref=e134]: "4"
                - generic [ref=e135]:
                  - generic [ref=e136]:
                    - generic [ref=e137]: Oct 21, 2026
                    - generic [ref=e138]: Today
                  - generic [ref=e139]:
                    - text: 2 readings ·
                    - 'generic "Estimated reading time: about 6 min" [ref=e140]': ≈ 6 min
                  - generic [ref=e141]: Complete
              - button "Undo day" [ref=e149]
            - generic [ref=e150]:
              - button "Reading 4A" [ref=e151]
              - button "Reading 4B" [ref=e156]
          - generic [ref=e162]:
            - button "Expand Day 3 readings, Oct 20, 2026, Complete, 2 readings, estimated reading time 6 min" [ref=e163]:
              - generic [ref=e164]: "3"
              - generic [ref=e165]:
                - generic [ref=e166]: Oct 20, 2026
                - generic [ref=e168]:
                  - text: 2 readings ·
                  - 'generic "Estimated reading time: about 6 min" [ref=e169]': ≈ 6 min
                - generic [ref=e170]: Complete
            - button "Undo day" [ref=e178]
          - generic [ref=e180]:
            - button "Expand Day 2 readings, Oct 19, 2026, Complete, 2 readings, estimated reading time 6 min" [ref=e181]:
              - generic [ref=e182]: "2"
              - generic [ref=e183]:
                - generic [ref=e184]: Oct 19, 2026
                - generic [ref=e186]:
                  - text: 2 readings ·
                  - 'generic "Estimated reading time: about 6 min" [ref=e187]': ≈ 6 min
                - generic [ref=e188]: Complete
            - button "Undo day" [ref=e196]
          - generic [ref=e198]:
            - button "Expand Day 1 readings, Oct 18, 2026, Complete, 2 readings, estimated reading time 6 min" [ref=e199]:
              - generic [ref=e200]: "1"
              - generic [ref=e201]:
                - generic [ref=e202]: Oct 18, 2026
                - generic [ref=e204]:
                  - text: 2 readings ·
                  - 'generic "Estimated reading time: about 6 min" [ref=e205]': ≈ 6 min
                - generic [ref=e206]: Complete
            - button "Undo day" [ref=e214]
      - group [ref=e215]:
        - generic "Optional commitments · Prayer and fasting" [ref=e216] [cursor=pointer]
```

# Test source

```ts
  1375 |     expect(layout.commitments!.y).toBeGreaterThan(layout.setup!.y + layout.setup!.height);
  1376 |     expect(Math.abs(layout.card!.x - layout.setup!.x)).toBeLessThanOrEqual(1);
  1377 |   }
  1378 | });
  1379 | 
  1380 | test("does not replace an unsynced fresh climb with an expired server record", async ({
  1381 |   page,
  1382 | }) => {
  1383 |   const today = await page.evaluate(() => {
  1384 |     const date = new Date();
  1385 |     return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
  1386 |       date.getDate(),
  1387 |     ).padStart(2, "0")}`;
  1388 |   });
  1389 |   const expiredPlan = makePlan({
  1390 |     id: "expired-server-climb",
  1391 |     days: 7,
  1392 |     name: "7-Day Climb",
  1393 |     today,
  1394 |     startOffset: -14,
  1395 |   });
  1396 |   const freshPlan = makePlan({
  1397 |     id: "fresh-unsynced-climb",
  1398 |     days: 7,
  1399 |     name: "7-Day Climb",
  1400 |     today,
  1401 |   });
  1402 |   const ordinaryPlan = {
  1403 |     id: "ordinary-reading-plan",
  1404 |     name: "Ordinary plan",
  1405 |     assignments: [],
  1406 |     completed: {},
  1407 |   };
  1408 | 
  1409 |   await stubAuthenticatedApi(page, ordinaryPlan, [expiredPlan], {
  1410 |     failPlanPosts: true,
  1411 |   });
  1412 |   await seedLocalData(page, [expiredPlan, freshPlan], freshPlan.id, {
  1413 |     ownerId: "authenticated-mountain-user",
  1414 |     pendingOps: [
  1415 |       {
  1416 |         type: "upsert-plan",
  1417 |         payload: freshPlan,
  1418 |         ts: 1,
  1419 |       },
  1420 |     ],
  1421 |   });
  1422 |   await openMountainRhythm(page);
  1423 | 
  1424 |   await expect(
  1425 |     page.getByText("7-Day Climb · active reading climb", { exact: true }),
  1426 |   ).toBeVisible();
  1427 |   await expect.poll(async () =>
  1428 |     page.evaluate(() => {
  1429 |       const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
  1430 |       return data.selectedPlanId;
  1431 |     }),
  1432 |   ).toBe(freshPlan.id);
  1433 |   await expect.poll(async () =>
  1434 |     page.evaluate(() => {
  1435 |       const pending = JSON.parse(
  1436 |         localStorage.getItem("discipleos:pendingOps") || "{}",
  1437 |       );
  1438 |       return pending.ops?.some(
  1439 |         (op: any) => op.type === "upsert-plan" && op.payload?.id === "fresh-unsynced-climb",
  1440 |       );
  1441 |     }),
  1442 |   ).toBe(true);
  1443 | });
  1444 | 
  1445 | test("plots each 7-Day Climb day as a separate ascent point", async ({ page }) => {
  1446 |   const today = new Date().toISOString().slice(0, 10);
  1447 |   const ownerId = "mountain-rhythm-visual-owner";
  1448 |   const plan = makePlan({
  1449 |     id: "point-by-point-climb",
  1450 |     days: 7,
  1451 |     name: "7-Day Climb",
  1452 |     today,
  1453 |     startOffset: -3,
  1454 |     completedIndexes: [0, 1, 2, 3],
  1455 |   });
  1456 | 
  1457 |   await stubApi(page, {
  1458 |     success: true,
  1459 |     userId: ownerId,
  1460 |     authenticated: false,
  1461 |     established: false,
  1462 |   });
  1463 |   await seedLocalData(page, [plan], plan.id, { ownerId });
  1464 |   await openMountainRhythm(page);
  1465 | 
  1466 |   const chart = page.getByTestId("mountain-rhythm-mountain");
  1467 |   await expect(chart.locator('[aria-label="Basecamp cabin"]')).toHaveCount(0);
  1468 |   const pointY = await chart.locator('[data-testid^="mountain-rhythm-day-point-"]').evaluateAll(
  1469 |     (points) => points.map((point) => Number(point.getAttribute("cy"))),
  1470 |   );
  1471 |   expect(pointY).toHaveLength(7);
  1472 |   expect(pointY[0]).toBeGreaterThan(pointY[1]);
  1473 |   expect(pointY[1]).toBeGreaterThan(pointY[2]);
  1474 |   expect(pointY[2]).toBeGreaterThan(pointY[3]);
> 1475 |   expect(pointY[3]).toBeCloseTo(145.2, 0);
       |                     ^ Error: expect(received).toBeCloseTo(expected, precision)
  1476 |   expect(pointY.slice(4)).toEqual([223, 201, 190]);
  1477 |   expect(pointY.every((y) => y >= 68 && y <= 248)).toBe(true);
  1478 |   const mainRidge = chart.getByTestId("mountain-rhythm-main-ridge");
  1479 |   const mainRidgeData = await mainRidge.getAttribute("d");
  1480 |   expect(mainRidgeData).toContain("Q96 212 125 204");
  1481 |   expect(mainRidgeData).toContain("Q146 205 165 215");
  1482 |   expect(mainRidgeData).not.toContain("C");
  1483 |   expect(mainRidgeData?.match(/L/g)?.length).toBeGreaterThan(8);
  1484 |   expect(mainRidgeData?.match(/L/g)?.length).toBeLessThan(15);
  1485 |   await expect(chart.getByTestId("mountain-rhythm-far-range")).toBeVisible();
  1486 |   await expect(chart.getByTestId("mountain-rhythm-mid-range")).toBeVisible();
  1487 |   await expect(chart.getByTestId("mountain-rhythm-distant-ridges").locator("path")).toHaveCount(2);
  1488 |   await expect(chart.getByTestId("mountain-rhythm-foreground-facets")).toHaveCount(0);
  1489 |   const farRangeData = await chart.getByTestId("mountain-rhythm-far-range").getAttribute("d");
  1490 |   const midRangeData = await chart.getByTestId("mountain-rhythm-mid-range").getAttribute("d");
  1491 |   expect(farRangeData).not.toBe(midRangeData);
  1492 |   await expect(chart.getByTestId("mountain-rhythm-day-path")).toHaveCount(0);
  1493 |   const earnedRoute = chart.getByTestId("mountain-rhythm-earned-route");
  1494 |   await expect(chart.locator('[data-chart-line="earned"]')).toHaveCount(1);
  1495 |   const earnedRouteData = await earnedRoute.getAttribute("d");
  1496 |   expect(earnedRouteData?.match(/M/g)).toHaveLength(1);
  1497 |   const dayPoints = await chart.locator('[data-testid^="mountain-rhythm-day-point-"]').evaluateAll(
  1498 |     (points) =>
  1499 |       points.map((point) => ({
  1500 |         x: Number(point.getAttribute("cx")),
  1501 |         y: Number(point.getAttribute("cy")),
  1502 |       })),
  1503 |   );
  1504 |   const completedRouteEndpoints = earnedRouteData?.match(/L[\d.]+ [\d.]+/g);
  1505 |   const completedRouteEndpoint = completedRouteEndpoints?.at(-1)?.match(/L([\d.]+) ([\d.]+)/);
  1506 |   expect(completedRouteEndpoint).not.toBeNull();
  1507 |   expect(Number(completedRouteEndpoint![1])).toBe(dayPoints[3].x);
  1508 |    expect(Number(completedRouteEndpoint![2])).toBeCloseTo(145.2, 0);
  1509 |   const labelXs = await chart.getByTestId("mountain-rhythm-day-labels").locator("text").evaluateAll(
  1510 |     (labels) => labels.map((label) => Number(label.getAttribute("x"))),
  1511 |   );
  1512 |   expect(labelXs).toEqual(dayPoints.map((point) => point.x));
  1513 |   await expect(chart.getByTestId("mountain-rhythm-day-labels").locator("text")).toHaveCount(7);
  1514 |   await expect(chart.getByTestId("mountain-rhythm-current-flag-label")).toHaveText("Today");
  1515 |   const plannedTodayPoint = chart.getByTestId("mountain-rhythm-day-point-4");
  1516 |   await expect(plannedTodayPoint).toHaveAttribute("fill", "none");
  1517 |   await expect(plannedTodayPoint).toHaveAttribute("stroke", "#A9C0AE");
  1518 |   await expect(plannedTodayPoint).toHaveAttribute("stroke-opacity", "0.55");
  1519 |   await expect(chart.getByTestId("mountain-rhythm-current-elevation-marker"))
  1520 |     .toHaveAttribute("fill", "#F4D77A");
  1521 |   const flagAnchor = await chart
  1522 |     .locator('g[aria-label^="Today"]')
  1523 |     .evaluate((flag) => {
  1524 |       const transform = flag.getAttribute("transform") || "";
  1525 |       const match = transform.match(/translate\(([\d.-]+)\s+([\d.-]+)\)/);
  1526 |       const pole = flag.querySelector("line");
  1527 |       return [
  1528 |         Number(match?.[1]) + Number(pole?.getAttribute("x1")),
  1529 |         Number(match?.[2]) + Number(pole?.getAttribute("y1")),
  1530 |       ];
  1531 |     });
  1532 |   expect(flagAnchor[0]).toBe(dayPoints[3].x);
  1533 |   expect(flagAnchor[1]).toBeCloseTo(145.2, 0);
  1534 |   await expect(page.getByTestId("mountain-rhythm-current-status"))
  1535 |     .toContainText("Current elevation: Gaining Elevation · 57.1%");
  1536 |   await expect(chart.getByTestId("mountain-rhythm-elevation-label-50"))
  1537 |     .toHaveAttribute("aria-label", "Current stage: Gaining Elevation, 50% threshold");
  1538 |   for (const width of [320, 360, 375, 390, 768, 1280]) {
  1539 |     await page.setViewportSize({ width, height: width === 375 ? 667 : 844 });
  1540 |     const chartBox = await chart.boundingBox();
  1541 |     const flagBox = await chart.getByTestId("mountain-rhythm-current-flag-label").boundingBox();
  1542 |     expect(chartBox).not.toBeNull();
  1543 |     expect(flagBox).not.toBeNull();
  1544 |     expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  1545 |     expect(flagBox!.x).toBeGreaterThanOrEqual(chartBox!.x);
  1546 |     expect(flagBox!.x + flagBox!.width).toBeLessThanOrEqual(chartBox!.x + chartBox!.width + 1);
  1547 |     const guideLabels = chart.getByTestId("mountain-rhythm-elevation-guides").locator("text");
  1548 |     await expect(guideLabels).toHaveCount(5);
  1549 |     const visibleGuideLabels = chart.getByTestId("mountain-rhythm-elevation-guides").locator("text:visible");
  1550 |     await expect(visibleGuideLabels).toHaveCount(width < 640 ? 2 : 5);
  1551 |     const guideAnchors = await visibleGuideLabels.evaluateAll((labels) =>
  1552 |       labels.map((label) => ({
  1553 |         x: label.getAttribute("x"),
  1554 |         anchor: label.getAttribute("text-anchor"),
  1555 |       })),
  1556 |     );
  1557 |     expect(guideAnchors).toEqual(
  1558 |       Array.from({ length: width < 640 ? 2 : 5 }, () => ({ x: "8", anchor: "start" })),
  1559 |     );
  1560 |     const activeGuideText = await visibleGuideLabels.evaluateAll((labels) =>
  1561 |       labels.map((label) => label.textContent?.trim()),
  1562 |     );
  1563 |     if (width < 640) {
  1564 |       expect(activeGuideText).toEqual(["GainingElevation", "Ridgeline"]);
  1565 |       await expect(page.getByTestId("mountain-rhythm-current-status"))
  1566 |         .toContainText("Current elevation: Gaining Elevation · 57.1%");
  1567 |       const metricOverflow = await page.getByTestId("mountain-rhythm-panel")
  1568 |         .locator('[data-testid^="mountain-rhythm-metric-"]')
  1569 |         .evaluateAll((metrics) => metrics.some((metric) => metric.scrollWidth > metric.clientWidth + 1));
  1570 |       expect(metricOverflow).toBe(false);
  1571 |     } else {
  1572 |       expect(activeGuideText).toEqual([
  1573 |         "Basecamp",
  1574 |         "On the Trail",
  1575 |         "GainingElevation",
```