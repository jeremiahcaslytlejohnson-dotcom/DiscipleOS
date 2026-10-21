# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> shows a full-width 20-day chart with a continuous earned and projected route
- Location: tests/e2e/mountain-rhythm.spec.ts:1665:1

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 1216
Received:   1216
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
          - generic [ref=e31]: 20-Day Reset · active reading climb
        - generic [ref=e35]:
          - generic [ref=e36]:
            - generic [ref=e37]: Today’s reading
            - generic [ref=e38]: Complete
            - generic [ref=e39]: 100% of today’s reading
          - generic [ref=e41]:
            - generic [ref=e42]: Journey progress
            - generic [ref=e43]: 35.0%
            - generic [ref=e44]: 7 of 20 planned days
          - generic [ref=e46]:
            - generic [ref=e47]: Consistency
            - generic [ref=e48]: 100%
            - generic [ref=e49]: Steady consistency
        - generic [ref=e51]:
          - img "20-Day Reset reading-rhythm trail; current elevation 35%, journey progress 35%" [ref=e52]:
            - generic "Elevation guide lines" [ref=e60]
            - generic "Elevation level labels" [ref=e64]:
              - 'generic "Milestone: Basecamp, 0% threshold" [ref=e66]': Basecamp
              - 'generic "Current stage: On the Trail, 25% threshold" [ref=e68]': On the Trail
              - 'generic "Next milestone: Gaining Elevation, 50% threshold" [ref=e70]': GainingElevation
              - 'generic "Milestone: Ridgeline, 70% threshold" [ref=e72]': Ridgeline
              - 'generic "Milestone: Summit, 85% threshold" [ref=e74]': Summit
            - generic "Day 10, future, readings future, 35% current elevation, 35% earned ascent" [ref=e75]
            - generic "Day 13, future, readings future, 35% current elevation, 35% earned ascent" [ref=e76]
            - generic "Day 16, future, readings future, 35% current elevation, 35% earned ascent" [ref=e77]
            - generic "Day 19, future, readings future, 35% current elevation, 35% earned ascent" [ref=e78]
            - generic "Day 20, future, readings future, 35% current elevation, 35% earned ascent" [ref=e79]
            - generic [ref=e80]:
              - generic [ref=e81]: "1"
              - generic [ref=e83]: "4"
              - generic [ref=e85]: "7"
              - generic [ref=e87]: "10"
              - generic [ref=e89]: "13"
              - generic [ref=e91]: "16"
              - generic [ref=e93]: "20"
            - generic "Today's position at On the Trail" [ref=e95]:
              - generic "Current elevation 35%" [ref=e97]
              - generic [ref=e98]: Today
          - list "Elevation milestones" [ref=e99]:
            - listitem [ref=e100]: "Basecamp: 0%"
            - listitem [ref=e101]: "On the Trail: 25%"
            - listitem [ref=e102]: "Gaining Elevation: 50%"
            - listitem [ref=e103]: "Ridgeline: 70%"
            - listitem [ref=e104]: "Summit: 85%"
        - paragraph [ref=e105]:
          - text: "Current: On the Trail · Next: Gaining Elevation"
          - generic [ref=e106]: "Current elevation: On the Trail · 35% · Today, Oct 21 · Day 7"
        - group [ref=e108]:
          - generic "How Mountain Rhythm works" [ref=e109] [cursor=pointer]
      - generic [ref=e111]:
        - generic [ref=e112]:
          - generic [ref=e113]:
            - generic [ref=e114]: Route to today
            - paragraph [ref=e119]: 20-Day Climb · future readings stay hidden until their day
          - generic [ref=e120]: 7/20 days
        - generic [ref=e121]:
          - generic [ref=e122]: Today’s next step
          - generic [ref=e123]:
            - generic [ref=e124]: Complete
            - generic [ref=e128]: 100% of today's reading complete
        - generic [ref=e129]:
          - generic [ref=e130]:
            - generic [ref=e131]:
              - button "Collapse Day 7 readings, Oct 21, 2026, Complete, 2 readings, estimated reading time 6 min" [expanded] [ref=e132]:
                - generic [ref=e133]: "7"
                - generic [ref=e134]:
                  - generic [ref=e135]:
                    - generic [ref=e136]: Oct 21, 2026
                    - generic [ref=e137]: Today
                  - generic [ref=e138]:
                    - text: 2 readings ·
                    - 'generic "Estimated reading time: about 6 min" [ref=e139]': ≈ 6 min
                  - generic [ref=e140]: Complete
              - button "Undo day" [ref=e148]
            - generic [ref=e149]:
              - button "Reading 7A" [ref=e150]
              - button "Reading 7B" [ref=e155]
          - generic [ref=e161]:
            - button "Expand Day 6 readings, Oct 20, 2026, Complete, 2 readings, estimated reading time 6 min" [ref=e162]:
              - generic [ref=e163]: "6"
              - generic [ref=e164]:
                - generic [ref=e165]: Oct 20, 2026
                - generic [ref=e167]:
                  - text: 2 readings ·
                  - 'generic "Estimated reading time: about 6 min" [ref=e168]': ≈ 6 min
                - generic [ref=e169]: Complete
            - button "Undo day" [ref=e177]
          - generic [ref=e179]:
            - button "Expand Day 5 readings, Oct 19, 2026, Complete, 2 readings, estimated reading time 6 min" [ref=e180]:
              - generic [ref=e181]: "5"
              - generic [ref=e182]:
                - generic [ref=e183]: Oct 19, 2026
                - generic [ref=e185]:
                  - text: 2 readings ·
                  - 'generic "Estimated reading time: about 6 min" [ref=e186]': ≈ 6 min
                - generic [ref=e187]: Complete
            - button "Undo day" [ref=e195]
          - generic [ref=e197]:
            - button "Expand Day 4 readings, Oct 18, 2026, Complete, 2 readings, estimated reading time 6 min" [ref=e198]:
              - generic [ref=e199]: "4"
              - generic [ref=e200]:
                - generic [ref=e201]: Oct 18, 2026
                - generic [ref=e203]:
                  - text: 2 readings ·
                  - 'generic "Estimated reading time: about 6 min" [ref=e204]': ≈ 6 min
                - generic [ref=e205]: Complete
            - button "Undo day" [ref=e213]
          - generic [ref=e215]:
            - button "Expand Day 3 readings, Oct 17, 2026, Complete, 2 readings, estimated reading time 6 min" [ref=e216]:
              - generic [ref=e217]: "3"
              - generic [ref=e218]:
                - generic [ref=e219]: Oct 17, 2026
                - generic [ref=e221]:
                  - text: 2 readings ·
                  - 'generic "Estimated reading time: about 6 min" [ref=e222]': ≈ 6 min
                - generic [ref=e223]: Complete
            - button "Undo day" [ref=e231]
          - generic [ref=e233]:
            - button "Expand Day 2 readings, Oct 16, 2026, Complete, 2 readings, estimated reading time 6 min" [ref=e234]:
              - generic [ref=e235]: "2"
              - generic [ref=e236]:
                - generic [ref=e237]: Oct 16, 2026
                - generic [ref=e239]:
                  - text: 2 readings ·
                  - 'generic "Estimated reading time: about 6 min" [ref=e240]': ≈ 6 min
                - generic [ref=e241]: Complete
            - button "Undo day" [ref=e249]
          - generic [ref=e251]:
            - button "Expand Day 1 readings, Oct 15, 2026, Complete, 2 readings, estimated reading time 6 min" [ref=e252]:
              - generic [ref=e253]: "1"
              - generic [ref=e254]:
                - generic [ref=e255]: Oct 15, 2026
                - generic [ref=e257]:
                  - text: 2 readings ·
                  - 'generic "Estimated reading time: about 6 min" [ref=e258]': ≈ 6 min
                - generic [ref=e259]: Complete
            - button "Undo day" [ref=e267]
      - group [ref=e268]:
        - generic "Optional commitments · Prayer and fasting" [ref=e269] [cursor=pointer]
```

# Test source

```ts
  1589 |           top: box.top,
  1590 |           bottom: box.bottom,
  1591 |         };
  1592 |       }),
  1593 |     );
  1594 |     const markedBoxes = await chart.locator('[data-testid^="mountain-rhythm-day-point-"]').evaluateAll(
  1595 |       (points) => points.map((point) => {
  1596 |         const box = point.getBoundingClientRect();
  1597 |         return {
  1598 |           name: point.getAttribute("data-testid"),
  1599 |           left: box.left,
  1600 |           right: box.right,
  1601 |           top: box.top,
  1602 |           bottom: box.bottom,
  1603 |         };
  1604 |       }),
  1605 |     );
  1606 |     const dayNumberBoxes = await chart.getByTestId("mountain-rhythm-day-labels").locator("text").evaluateAll(
  1607 |       (labels) => labels.map((label) => {
  1608 |         const box = label.getBoundingClientRect();
  1609 |         return {
  1610 |           name: label.textContent,
  1611 |           left: box.left,
  1612 |           right: box.right,
  1613 |           top: box.top,
  1614 |           bottom: box.bottom,
  1615 |         };
  1616 |       }),
  1617 |     );
  1618 |     const flagRect = {
  1619 |       left: flagBox!.x,
  1620 |       right: flagBox!.x + flagBox!.width,
  1621 |       top: flagBox!.y,
  1622 |       bottom: flagBox!.y + flagBox!.height,
  1623 |     };
  1624 |     for (const labelBox of landmarkBoxes) {
  1625 |       expect(labelBox.left).toBeGreaterThanOrEqual(chartBox!.x);
  1626 |       expect(labelBox.right).toBeLessThanOrEqual(chartBox!.x + chartBox!.width);
  1627 |       for (const otherBox of [...markedBoxes, ...dayNumberBoxes, { ...flagRect, name: "Today flag" }]) {
  1628 |         const overlaps = labelBox.left < otherBox.right &&
  1629 |           labelBox.right > otherBox.left &&
  1630 |           labelBox.top < otherBox.bottom &&
  1631 |           labelBox.bottom > otherBox.top;
  1632 |         expect(
  1633 |           overlaps,
  1634 |           `${labelBox.name} overlaps ${otherBox.name} at ${width}px: ${JSON.stringify({ labelBox, otherBox })}`,
  1635 |         ).toBe(false);
  1636 |       }
  1637 |     }
  1638 |     const guidesByTop = [...landmarkBoxes].sort((left, right) => left.top - right.top);
  1639 |     for (let index = 1; index < guidesByTop.length; index++) {
  1640 |       expect(guidesByTop[index].top).toBeGreaterThanOrEqual(guidesByTop[index - 1].bottom);
  1641 |     }
  1642 |     if (width === 320) {
  1643 |       await page.getByTestId("mountain-rhythm-panel").screenshot({
  1644 |         path: "/tmp/discipleos-mountain-4-of-7-320.png",
  1645 |       });
  1646 |     } else if (width === 375) {
  1647 |       await page.getByTestId("mountain-rhythm-panel").screenshot({
  1648 |         path: "/tmp/discipleos-mountain-4-of-7-375.png",
  1649 |       });
  1650 |     } else if (width === 1280) {
  1651 |       await page.getByTestId("mountain-rhythm-panel").screenshot({
  1652 |         path: "/tmp/discipleos-mountain-4-of-7-desktop.png",
  1653 |       });
  1654 |     }
  1655 |   }
  1656 |   const earnedRouteBeforeReload = await earnedRoute.getAttribute("d");
  1657 |   await page.reload();
  1658 |   await openMountainRhythm(page);
  1659 |   await expect(page.getByTestId("mountain-rhythm-earned-route")).toHaveAttribute(
  1660 |     "d",
  1661 |     earnedRouteBeforeReload!,
  1662 |   );
  1663 | });
  1664 | 
  1665 | test("shows a full-width 20-day chart with a continuous earned and projected route", async ({ page }) => {
  1666 |   const today = new Date().toISOString().slice(0, 10);
  1667 |   const ownerId = "mountain-rhythm-twenty-day-visual-owner";
  1668 |   const plan = makePlan({
  1669 |     id: "twenty-day-wide-chart",
  1670 |     days: 20,
  1671 |     name: "20-Day Climb",
  1672 |     today,
  1673 |     startOffset: -6,
  1674 |     completedIndexes: [0, 1, 2, 3, 4, 5, 6],
  1675 |   });
  1676 |   await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  1677 |   await seedLocalData(page, [plan], plan.id, { ownerId });
  1678 |   await page.setViewportSize({ width: 1440, height: 1000 });
  1679 |   await openMountainRhythm(page);
  1680 | 
  1681 |   const card = page.getByTestId("mountain-rhythm-panel");
  1682 |   const chart = page.getByTestId("mountain-rhythm-mountain");
  1683 |   const earned = chart.getByTestId("mountain-rhythm-earned-route");
  1684 |   const projected = chart.getByTestId("mountain-rhythm-projected-route");
  1685 |   const cardBox = await card.boundingBox();
  1686 |   const chooseBox = await page.getByTestId("mountain-rhythm-choose").boundingBox();
  1687 |   expect(cardBox).not.toBeNull();
  1688 |   expect(chooseBox).not.toBeNull();
> 1689 |   expect(cardBox!.width).toBeGreaterThan(chooseBox!.width);
       |                          ^ Error: expect(received).toBeGreaterThan(expected)
  1690 |   expect(cardBox!.y).toBeLessThan(chooseBox!.y);
  1691 | 
  1692 |   await expect(earned).toBeVisible();
  1693 |   await expect(projected).toBeVisible();
  1694 |   await expect(chart.locator('[data-chart-line="earned"]')).toHaveCount(1);
  1695 |   await expect(chart.locator('[data-chart-line="projected"]')).toHaveCount(1);
  1696 |   await expect(projected).toHaveAttribute("stroke-dasharray", "4 5");
  1697 |   await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("7 of 20 planned days");
  1698 |   await expect(page.getByTestId("mountain-rhythm-current-status")).toContainText("Current: On the Trail · Next: Gaining Elevation");
  1699 |   const dayLabels = await chart.getByTestId("mountain-rhythm-day-labels").locator("text").allTextContents();
  1700 |   expect(dayLabels).toEqual(["1", "4", "7", "10", "13", "16", "20"]);
  1701 |   await page.getByTestId("mountain-rhythm-panel").screenshot({
  1702 |     path: "/tmp/discipleos-mountain-20-day-desktop.png",
  1703 |   });
  1704 |   for (const width of [375, 768]) {
  1705 |     await page.setViewportSize({ width, height: 900 });
  1706 |     const chartBox = await chart.boundingBox();
  1707 |     const flagBox = await chart.getByTestId("mountain-rhythm-current-flag-label").boundingBox();
  1708 |     expect(chartBox).not.toBeNull();
  1709 |     expect(flagBox).not.toBeNull();
  1710 |     expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  1711 |     expect(flagBox!.x).toBeGreaterThanOrEqual(chartBox!.x);
  1712 |     expect(flagBox!.x + flagBox!.width).toBeLessThanOrEqual(chartBox!.x + chartBox!.width + 1);
  1713 |     await expect(chart.getByTestId("mountain-rhythm-projected-route")).toBeVisible();
  1714 |   }
  1715 | });
  1716 | 
  1717 | test("pins current elevation to 1 of 7 earned days", async ({ page }) => {
  1718 |   const today = new Date().toISOString().slice(0, 10);
  1719 |   const plan = makePlan({
  1720 |     id: "single-earned-day",
  1721 |     days: 7,
  1722 |     name: "7-Day Climb",
  1723 |     today,
  1724 |     completedIndexes: [0],
  1725 |   });
  1726 |   const ownerId = "single-earned-day-owner";
  1727 |   await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  1728 |   await seedLocalData(page, [plan], plan.id, { ownerId });
  1729 |   await openMountainRhythm(page);
  1730 |   await expect(page.getByTestId("mountain-rhythm-current-status"))
  1731 |     .toContainText("Current elevation: Basecamp · 14.3%");
  1732 |   const chart = page.getByTestId("mountain-rhythm-mountain");
  1733 |   await expect(chart.getByTestId("mountain-rhythm-day-point-1"))
  1734 |     .toHaveAttribute("fill", "none");
  1735 |   await expect(chart.getByTestId("mountain-rhythm-current-elevation-marker"))
  1736 |     .toHaveAttribute("fill", "#F4D77A");
  1737 |   const markerTransform = await page.locator('g[aria-label^="Today"]').getAttribute("transform");
  1738 |   expect(Number(markerTransform?.match(/translate\([\d.-]+\s+([\d.-]+)/)?.[1]) + 22)
  1739 |     .toBeCloseTo(222.26, 1);
  1740 |   await expect(page.getByTestId("mountain-rhythm-elevation-label-25"))
  1741 |     .toHaveAttribute("aria-label", "Next milestone: On the Trail, 25% threshold");
  1742 |   for (const width of [320, 375, 1280]) {
  1743 |     await page.setViewportSize({ width, height: width === 375 ? 667 : 844 });
  1744 |     const guideLabels = page.getByTestId("mountain-rhythm-elevation-guides").locator("text:visible");
  1745 |     const flagLabel = await chart.getByTestId("mountain-rhythm-current-flag-label").boundingBox();
  1746 |     const guideBoxes = await guideLabels.evaluateAll((labels) =>
  1747 |       labels.map((label) => {
  1748 |         const box = label.getBoundingClientRect();
  1749 |         return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
  1750 |       }),
  1751 |     );
  1752 |     expect(flagLabel).not.toBeNull();
  1753 |     for (const guide of guideBoxes) {
  1754 |       const overlaps = flagLabel!.x < guide.right &&
  1755 |         flagLabel!.x + flagLabel!.width > guide.left &&
  1756 |         flagLabel!.y < guide.bottom &&
  1757 |         flagLabel!.y + flagLabel!.height > guide.top;
  1758 |       expect(overlaps, `Today flag label overlaps a guide at ${width}px`).toBe(false);
  1759 |     }
  1760 |     await expect(guideLabels).toHaveCount(width < 640 ? 2 : 5);
  1761 |     const guideText = await guideLabels.evaluateAll((labels) =>
  1762 |       labels.map((label) => label.textContent?.trim()),
  1763 |     );
  1764 |     if (width < 640) {
  1765 |       expect(guideText).toEqual(["Basecamp", "On the Trail"]);
  1766 |       await expect(page.getByTestId("mountain-rhythm-current-status"))
  1767 |         .toContainText("Current elevation: Basecamp · 14.3% · Today,");
  1768 |     } else {
  1769 |       expect(guideText).toEqual([
  1770 |         "Basecamp",
  1771 |         "On the Trail",
  1772 |         "GainingElevation",
  1773 |         "Ridgeline",
  1774 |         "Summit",
  1775 |       ]);
  1776 |     }
  1777 |     await page.getByTestId("mountain-rhythm-panel").screenshot({
  1778 |       path: `/tmp/discipleos-mountain-1-of-7-${width}.png`,
  1779 |     });
  1780 |   }
  1781 | });
  1782 | 
  1783 | test("keeps a near-Summit Today flag, guides, and day labels inside the reframed chart", async ({ page }) => {
  1784 |   const today = new Date().toISOString().slice(0, 10);
  1785 |   const ownerId = "near-summit-visual-owner";
  1786 |   const plan = makePlan({
  1787 |     id: "near-summit-visual",
  1788 |     days: 7,
  1789 |     name: "7-Day Climb",
```