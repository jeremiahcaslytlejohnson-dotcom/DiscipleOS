# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> pins current elevation to 1 of 7 earned days
- Location: tests/e2e/mountain-rhythm.spec.ts:1620:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 2
+ Received  + 2

  Array [
-   "Basecamp 0%",
-   "On the Trail 25%",
+   "Basecamp",
+   "On the Trail",
  ]
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - button "Feedback" [ref=e3] [cursor=pointer]:
    - generic [ref=e4]: ✦
    - text: Feedback
  - generic [ref=e8]:
    - banner [ref=e9]:
      - button "Back" [ref=e10]
    - main [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]: My Ascent
        - heading "Mountain Rhythm" [level=1] [ref=e20]
        - paragraph [ref=e21]: One clear route for Scripture consistency. Choose a structured climb, then take the next faithful step.
      - generic [ref=e23]:
        - generic [ref=e25]:
          - generic [ref=e26]: Mountain Rhythm
          - generic [ref=e29]: 7-Day Climb · active reading climb
        - generic [ref=e33]:
          - generic [ref=e34]:
            - generic [ref=e35]: Today’s reading
            - generic [ref=e36]: Complete
            - generic [ref=e37]: 100% read
          - generic [ref=e39]:
            - generic [ref=e40]: Journey progress
            - generic [ref=e41]: 14.3%
            - generic [ref=e42]: 1/7 days
          - generic [ref=e44]:
            - generic [ref=e45]: Consistency
            - generic [ref=e46]: 100%
            - generic [ref=e47]: Steady
        - generic [ref=e48]:
          - img "7-Day Climb reading-rhythm trail; current elevation 14.3%, journey progress 14.3%" [ref=e49]:
            - generic "Elevation guide lines" [ref=e57]
            - generic "Elevation level labels" [ref=e58]:
              - 'generic "Current stage: Basecamp, 0% threshold" [ref=e60]': Basecamp
              - 'generic "Next milestone: On the Trail, 25% threshold" [ref=e62]': On the Trail
            - generic "Day 1, complete, readings complete, 14.3% current elevation, 14.3% earned ascent" [ref=e63]
            - generic "Day 2, future, readings future, 14.3% current elevation, 14.3% earned ascent" [ref=e64]
            - generic "Day 3, future, readings future, 14.3% current elevation, 14.3% earned ascent" [ref=e65]
            - generic "Day 4, future, readings future, 14.3% current elevation, 14.3% earned ascent" [ref=e66]
            - generic "Day 5, future, readings future, 14.3% current elevation, 14.3% earned ascent" [ref=e67]
            - generic "Day 6, future, readings future, 14.3% current elevation, 14.3% earned ascent" [ref=e68]
            - generic "Day 7, future, readings future, 14.3% current elevation, 14.3% earned ascent" [ref=e69]
            - generic [ref=e70]:
              - generic [ref=e71]: "1"
              - generic [ref=e73]: "2"
              - generic [ref=e75]: "3"
              - generic [ref=e77]: "4"
              - generic [ref=e79]: "5"
              - generic [ref=e81]: "6"
              - generic [ref=e83]: "7"
            - generic "Today's position at Basecamp" [ref=e85]:
              - generic "Current elevation 14.3%" [ref=e87]
              - generic [ref=e88]: Today
          - list "Elevation milestones" [ref=e89]:
            - listitem [ref=e90]: "Basecamp: 0%"
            - listitem [ref=e91]: "On the Trail: 25%"
            - listitem [ref=e92]: "Gaining Elevation: 50%"
            - listitem [ref=e93]: "Ridgeline: 70%"
            - listitem [ref=e94]: "Summit: 85%"
        - paragraph [ref=e95]:
          - text: "Current: Basecamp · Next: On the Trail"
          - generic [ref=e96]: "Current elevation: Basecamp · 14.3% · Today, Oct 20 · Day 1"
        - group [ref=e98]:
          - generic "How Mountain Rhythm works" [ref=e99] [cursor=pointer]
      - generic [ref=e100]:
        - generic [ref=e101]:
          - generic [ref=e102]: Choose your climb
          - paragraph [ref=e105]: Only the selected structured climb shapes your ascent. Ordinary reading plans stay available in Plans.
          - generic [ref=e106]:
            - button "7-Day Climb · In Progress A focused week in Genesis. In Progress" [ref=e107]:
              - generic [ref=e109]:
                - generic [ref=e110]: 7-Day Climb · In Progress
                - generic [ref=e111]: A focused week in Genesis.
              - generic [ref=e114]: In Progress
            - button "20-Day Reset The four Gospels and Acts over 20 days. Currently locked. Locked" [disabled] [ref=e115]:
              - generic [ref=e117]:
                - generic [ref=e118]: 20-Day Reset
                - generic [ref=e119]: The four Gospels and Acts over 20 days. Currently locked.
              - generic [ref=e124]: Locked
            - button "40-Day Climb A 40-day route from 1 Samuel through Nehemiah. Coming Later" [disabled] [ref=e125]:
              - generic [ref=e127]:
                - generic [ref=e128]: 40-Day Climb
                - generic [ref=e129]: A 40-day route from 1 Samuel through Nehemiah.
              - generic [ref=e134]: Coming Later
          - button "Cancel active climb" [ref=e136]
          - generic [ref=e137]: Your ascent is saved on this device. Sign in from the home page when you are ready to sync it.
        - generic [ref=e140]:
          - heading "Add Prayer or Fasting to Your Rhythm" [level=2] [ref=e141]
          - paragraph [ref=e142]: These optional commitments stay separate from Scripture completion and climb progress.
          - group "Optional prayer and fasting commitments" [ref=e143]:
            - generic [ref=e144] [cursor=pointer]:
              - checkbox "Prayer Set aside time to pray" [ref=e145]
              - generic [ref=e149]:
                - generic [ref=e150]: Prayer
                - generic [ref=e151]: Set aside time to pray
            - generic [ref=e153] [cursor=pointer]:
              - checkbox "Fasting Set your own fasting schedule" [ref=e154]
              - generic [ref=e159]:
                - generic [ref=e160]: Fasting
                - generic [ref=e161]: Set your own fasting schedule
          - generic [ref=e163]:
            - button "Save choices" [ref=e164]
            - button "Neither / Not now" [ref=e165]
      - generic [ref=e166]:
        - generic [ref=e167]:
          - generic [ref=e168]:
            - generic [ref=e169]:
              - generic [ref=e170]: Route to date
              - paragraph [ref=e175]: 7-Day Climb · future readings stay hidden until their day
            - generic [ref=e176]: 1/7 days
          - generic [ref=e178]:
            - generic [ref=e179]:
              - button "Collapse Day 1 readings, Oct 20, 2026, Complete, 2 readings, estimated reading time 6 min" [expanded] [ref=e180]:
                - generic [ref=e181]: "1"
                - generic [ref=e182]:
                  - generic [ref=e183]:
                    - generic [ref=e184]: Oct 20, 2026
                    - generic [ref=e185]: Today
                  - generic [ref=e186]:
                    - text: 2 readings ·
                    - 'generic "Estimated reading time: about 6 min" [ref=e187]': ≈ 6 min
                  - generic [ref=e188]: Complete
              - button "Undo day" [ref=e196]
            - generic [ref=e197]:
              - button "Reading 1A" [ref=e198]
              - button "Reading 1B" [ref=e203]
        - generic [ref=e209]:
          - generic [ref=e210]: Today’s next step
          - generic [ref=e211]:
            - generic [ref=e212]: Complete
            - generic [ref=e216]: 100% of today's reading complete
```

# Test source

```ts
  1568 |     }
  1569 |   }
  1570 |   const earnedRouteBeforeReload = await earnedRoute.getAttribute("d");
  1571 |   await page.reload();
  1572 |   await openMountainRhythm(page);
  1573 |   await expect(page.getByTestId("mountain-rhythm-earned-route")).toHaveAttribute(
  1574 |     "d",
  1575 |     earnedRouteBeforeReload!,
  1576 |   );
  1577 | });
  1578 | 
  1579 | test("shows a full-width 20-day chart with a continuous earned and projected route", async ({ page }) => {
  1580 |   const today = new Date().toISOString().slice(0, 10);
  1581 |   const ownerId = "mountain-rhythm-twenty-day-visual-owner";
  1582 |   const plan = makePlan({
  1583 |     id: "twenty-day-wide-chart",
  1584 |     days: 20,
  1585 |     name: "20-Day Climb",
  1586 |     today,
  1587 |     startOffset: -6,
  1588 |     completedIndexes: [0, 1, 2, 3, 4, 5, 6],
  1589 |   });
  1590 |   await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  1591 |   await seedLocalData(page, [plan], plan.id, { ownerId });
  1592 |   await page.setViewportSize({ width: 1440, height: 1000 });
  1593 |   await openMountainRhythm(page);
  1594 | 
  1595 |   const card = page.getByTestId("mountain-rhythm-panel");
  1596 |   const chart = page.getByTestId("mountain-rhythm-mountain");
  1597 |   const earned = chart.getByTestId("mountain-rhythm-earned-route");
  1598 |   const projected = chart.getByTestId("mountain-rhythm-projected-route");
  1599 |   const cardBox = await card.boundingBox();
  1600 |   const chooseBox = await page.getByTestId("mountain-rhythm-choose").boundingBox();
  1601 |   expect(cardBox).not.toBeNull();
  1602 |   expect(chooseBox).not.toBeNull();
  1603 |   expect(cardBox!.width).toBeGreaterThan(chooseBox!.width);
  1604 |   expect(cardBox!.y).toBeLessThan(chooseBox!.y);
  1605 | 
  1606 |   await expect(earned).toBeVisible();
  1607 |   await expect(projected).toBeVisible();
  1608 |   await expect(chart.locator('[data-chart-line="earned"]')).toHaveCount(1);
  1609 |   await expect(chart.locator('[data-chart-line="projected"]')).toHaveCount(1);
  1610 |   await expect(projected).toHaveAttribute("stroke-dasharray", "4 5");
  1611 |   await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("7 of 20 planned days");
  1612 |   await expect(page.getByTestId("mountain-rhythm-current-status")).toContainText("Current: On the Trail · Next: Gaining Elevation");
  1613 |   const dayLabels = await chart.getByTestId("mountain-rhythm-day-labels").locator("text").allTextContents();
  1614 |   expect(dayLabels).toEqual(["1", "4", "7", "10", "13", "16", "20"]);
  1615 |   await page.getByTestId("mountain-rhythm-panel").screenshot({
  1616 |     path: "/tmp/discipleos-mountain-20-day-desktop.png",
  1617 |   });
  1618 | });
  1619 | 
  1620 | test("pins current elevation to 1 of 7 earned days", async ({ page }) => {
  1621 |   const today = new Date().toISOString().slice(0, 10);
  1622 |   const plan = makePlan({
  1623 |     id: "single-earned-day",
  1624 |     days: 7,
  1625 |     name: "7-Day Climb",
  1626 |     today,
  1627 |     completedIndexes: [0],
  1628 |   });
  1629 |   const ownerId = "single-earned-day-owner";
  1630 |   await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  1631 |   await seedLocalData(page, [plan], plan.id, { ownerId });
  1632 |   await openMountainRhythm(page);
  1633 |   await expect(page.getByTestId("mountain-rhythm-current-status"))
  1634 |     .toContainText("Current elevation: Basecamp · 14.3%");
  1635 |   const chart = page.getByTestId("mountain-rhythm-mountain");
  1636 |   await expect(chart.getByTestId("mountain-rhythm-day-point-1"))
  1637 |     .toHaveAttribute("fill", "none");
  1638 |   await expect(chart.getByTestId("mountain-rhythm-current-elevation-marker"))
  1639 |     .toHaveAttribute("fill", "#F4D77A");
  1640 |   const markerTransform = await page.locator('g[aria-label^="Today"]').getAttribute("transform");
  1641 |   expect(Number(markerTransform?.match(/translate\([\d.-]+\s+([\d.-]+)/)?.[1]) + 22)
  1642 |     .toBeCloseTo(222.26, 1);
  1643 |   await expect(page.getByTestId("mountain-rhythm-elevation-label-25"))
  1644 |     .toHaveAttribute("aria-label", "Next milestone: On the Trail, 25% threshold");
  1645 |   for (const width of [320, 375, 1280]) {
  1646 |     await page.setViewportSize({ width, height: width === 375 ? 667 : 844 });
  1647 |     const guideLabels = page.getByTestId("mountain-rhythm-elevation-guides").locator("text:visible");
  1648 |     const flagLabel = await chart.getByTestId("mountain-rhythm-current-flag-label").boundingBox();
  1649 |     const guideBoxes = await guideLabels.evaluateAll((labels) =>
  1650 |       labels.map((label) => {
  1651 |         const box = label.getBoundingClientRect();
  1652 |         return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
  1653 |       }),
  1654 |     );
  1655 |     expect(flagLabel).not.toBeNull();
  1656 |     for (const guide of guideBoxes) {
  1657 |       const overlaps = flagLabel!.x < guide.right &&
  1658 |         flagLabel!.x + flagLabel!.width > guide.left &&
  1659 |         flagLabel!.y < guide.bottom &&
  1660 |         flagLabel!.y + flagLabel!.height > guide.top;
  1661 |       expect(overlaps, `Today flag label overlaps a guide at ${width}px`).toBe(false);
  1662 |     }
  1663 |     await expect(guideLabels).toHaveCount(width < 640 ? 2 : 5);
  1664 |     const guideText = await guideLabels.evaluateAll((labels) =>
  1665 |       labels.map((label) => label.textContent?.trim()),
  1666 |     );
  1667 |     if (width < 640) {
> 1668 |       expect(guideText).toEqual(["Basecamp 0%", "On the Trail 25%"]);
       |                         ^ Error: expect(received).toEqual(expected) // deep equality
  1669 |       await expect(page.getByTestId("mountain-rhythm-current-status"))
  1670 |         .toContainText("Current elevation: Basecamp · 14.3% · Today,");
  1671 |     } else {
  1672 |       expect(guideText).toEqual([
  1673 |         "Basecamp 0%",
  1674 |         "On the Trail 25%",
  1675 |         "Gaining Elevation 50%",
  1676 |         "Ridgeline 70%",
  1677 |         "Summit 85%",
  1678 |       ]);
  1679 |     }
  1680 |     await page.getByTestId("mountain-rhythm-panel").screenshot({
  1681 |       path: `/tmp/discipleos-mountain-1-of-7-${width}.png`,
  1682 |     });
  1683 |   }
  1684 | });
  1685 | 
  1686 | test("keeps a near-Summit Today flag, guides, and day labels inside the reframed chart", async ({ page }) => {
  1687 |   const today = new Date().toISOString().slice(0, 10);
  1688 |   const ownerId = "near-summit-visual-owner";
  1689 |   const plan = makePlan({
  1690 |     id: "near-summit-visual",
  1691 |     days: 7,
  1692 |     name: "7-Day Climb",
  1693 |     today,
  1694 |     startOffset: -6,
  1695 |     completedIndexes: [0, 1, 2, 3, 4, 5],
  1696 |   });
  1697 |   await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  1698 |   await seedLocalData(page, [plan], plan.id, { ownerId });
  1699 |   await openMountainRhythm(page);
  1700 |   await expect(page.getByTestId("mountain-rhythm-current-status"))
  1701 |     .toContainText("Current elevation: Summit");
  1702 | 
  1703 |   const chart = page.getByTestId("mountain-rhythm-mountain");
  1704 |   for (const width of [320, 375, 1280]) {
  1705 |     await page.setViewportSize({ width, height: width === 375 ? 667 : 844 });
  1706 |     const chartBox = await chart.boundingBox();
  1707 |     const flagLabelBox = await chart.getByTestId("mountain-rhythm-current-flag-label").boundingBox();
  1708 |     const dayLabelBoxes = await chart.getByTestId("mountain-rhythm-day-labels")
  1709 |       .locator("text")
  1710 |       .evaluateAll((labels) => labels.map((label) => {
  1711 |         const box = label.getBoundingClientRect();
  1712 |         return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
  1713 |       }));
  1714 |     expect(chartBox).not.toBeNull();
  1715 |     expect(flagLabelBox).not.toBeNull();
  1716 |     expect(flagLabelBox!.x).toBeGreaterThanOrEqual(chartBox!.x);
  1717 |     expect(flagLabelBox!.x + flagLabelBox!.width)
  1718 |       .toBeLessThanOrEqual(chartBox!.x + chartBox!.width + 1);
  1719 |     expect(dayLabelBoxes).toHaveLength(7);
  1720 |     for (const label of dayLabelBoxes) {
  1721 |       expect(label.left).toBeGreaterThanOrEqual(chartBox!.x);
  1722 |       expect(label.right).toBeLessThanOrEqual(chartBox!.x + chartBox!.width + 1);
  1723 |       expect(label.bottom).toBeLessThanOrEqual(chartBox!.y + chartBox!.height + 1);
  1724 |     }
  1725 |     await expect(chart.getByTestId("mountain-rhythm-elevation-guides").locator("text:visible"))
  1726 |       .toHaveCount(width < 640 ? 1 : 5);
  1727 |     expect(await page.evaluate(() => document.documentElement.scrollWidth))
  1728 |       .toBeLessThanOrEqual(width + 1);
  1729 |     await page.getByTestId("mountain-rhythm-panel").screenshot({
  1730 |       path: `/tmp/discipleos-mountain-near-summit-${width}.png`,
  1731 |     });
  1732 |   }
  1733 | });
  1734 | 
  1735 | test("keeps Today on its calendar date when Day 4 is only the latest completed day", async ({ page }) => {
  1736 |   const today = new Date().toISOString().slice(0, 10);
  1737 |   const plan = makePlan({
  1738 |     id: "today-is-day-five",
  1739 |     days: 7,
  1740 |     name: "7-Day Climb",
  1741 |     today,
  1742 |     startOffset: -4,
  1743 |     completedIndexes: [0, 1, 2, 3],
  1744 |   });
  1745 |   const ownerId = "today-day-five-owner";
  1746 |   await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  1747 |   await seedLocalData(page, [plan], plan.id, { ownerId });
  1748 |   await openMountainRhythm(page);
  1749 |   await expect(page.getByTestId("mountain-rhythm-current-status"))
  1750 |     .toContainText(`Today, ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${today}T12:00:00`))} · Day 5`);
  1751 |   await expect(page.getByTestId("mountain-rhythm-current-flag-label")).toHaveText("Today");
  1752 |   const points = await page.getByTestId("mountain-rhythm-mountain")
  1753 |     .locator('[data-testid^="mountain-rhythm-day-point-"]')
  1754 |     .evaluateAll((nodes) => nodes.map((node) => Number(node.getAttribute("cx"))));
  1755 |   const flagTransform = await page.locator('g[aria-label^="Today"]').getAttribute("transform");
  1756 |   const flagTranslateX = Number(flagTransform?.match(/translate\(([\d.-]+)/)?.[1]);
  1757 |   expect(flagTranslateX + 5).toBe(points[4]);
  1758 | });
  1759 | 
  1760 | test("distinguishes Today from Latest and Next when a scheduled date is skipped", async ({ page }) => {
  1761 |   const today = new Date().toISOString().slice(0, 10);
  1762 |   const plan = makePlan({
  1763 |     id: "today-gap",
  1764 |     days: 7,
  1765 |     name: "7-Day Climb",
  1766 |     today,
  1767 |     startOffset: -3,
  1768 |     completedIndexes: [0, 2],
```