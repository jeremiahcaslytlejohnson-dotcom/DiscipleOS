# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> pins current elevation to 1 of 7 earned days
- Location: tests/e2e/mountain-rhythm.spec.ts:1717:1

# Error details

```
Error: expect(received).toBeCloseTo(expected, precision)

Expected: 222.26
Received: 198.264

Expected precision:    1
Expected difference: < 0.05
Received difference:   23.99599999999998
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
            - generic [ref=e43]: 14.3%
            - generic [ref=e44]: 1 of 7 planned days
          - generic [ref=e46]:
            - generic [ref=e47]: Consistency
            - generic [ref=e48]: 100%
            - generic [ref=e49]: Steady consistency
        - generic [ref=e51]:
          - img "7-Day Climb reading-rhythm trail; current elevation 14.3%, journey progress 14.3%" [ref=e52]:
            - generic "Elevation guide lines" [ref=e60]
            - generic "Elevation level labels" [ref=e61]:
              - 'generic "Current stage: Basecamp, 0% threshold" [ref=e63]': Basecamp
              - 'generic "Next milestone: On the Trail, 25% threshold" [ref=e65]': On the Trail
              - 'generic "Milestone: Gaining Elevation, 50% threshold" [ref=e67]': GainingElevation
              - 'generic "Milestone: Ridgeline, 70% threshold" [ref=e69]': Ridgeline
              - 'generic "Milestone: Summit, 85% threshold" [ref=e71]': Summit
            - generic "Day 1, complete, readings complete, 14.3% current elevation, 14.3% earned ascent" [ref=e72]
            - generic "Day 2, future, readings future, 14.3% current elevation, 14.3% earned ascent" [ref=e73]
            - generic "Day 3, future, readings future, 14.3% current elevation, 14.3% earned ascent" [ref=e74]
            - generic "Day 4, future, readings future, 14.3% current elevation, 14.3% earned ascent" [ref=e75]
            - generic "Day 5, future, readings future, 14.3% current elevation, 14.3% earned ascent" [ref=e76]
            - generic "Day 6, future, readings future, 14.3% current elevation, 14.3% earned ascent" [ref=e77]
            - generic "Day 7, future, readings future, 14.3% current elevation, 14.3% earned ascent" [ref=e78]
            - generic [ref=e79]:
              - generic [ref=e80]: "1"
              - generic [ref=e82]: "2"
              - generic [ref=e84]: "3"
              - generic [ref=e86]: "4"
              - generic [ref=e88]: "5"
              - generic [ref=e90]: "6"
              - generic [ref=e92]: "7"
            - generic "Today's position at Basecamp" [ref=e94]:
              - generic "Current elevation 14.3%" [ref=e96]
              - generic [ref=e97]: Today
          - list "Elevation milestones" [ref=e98]:
            - listitem [ref=e99]: "Basecamp: 0%"
            - listitem [ref=e100]: "On the Trail: 25%"
            - listitem [ref=e101]: "Gaining Elevation: 50%"
            - listitem [ref=e102]: "Ridgeline: 70%"
            - listitem [ref=e103]: "Summit: 85%"
        - paragraph [ref=e104]:
          - text: "Current: Basecamp · Next: On the Trail"
          - generic [ref=e105]: "Current elevation: Basecamp · 14.3% · Today, Oct 21 · Day 1"
        - group [ref=e107]:
          - generic "How Mountain Rhythm works" [ref=e108] [cursor=pointer]
      - generic [ref=e110]:
        - generic [ref=e111]:
          - generic [ref=e112]:
            - generic [ref=e113]: Route to today
            - paragraph [ref=e118]: 7-Day Climb · future readings stay hidden until their day
          - generic [ref=e119]: 1/7 days
        - generic [ref=e120]:
          - generic [ref=e121]: Today’s next step
          - generic [ref=e122]:
            - generic [ref=e123]: Complete
            - generic [ref=e127]: 100% of today's reading complete
        - generic [ref=e129]:
          - generic [ref=e130]:
            - button "Collapse Day 1 readings, Oct 21, 2026, Complete, 2 readings, estimated reading time 6 min" [expanded] [ref=e131]:
              - generic [ref=e132]: "1"
              - generic [ref=e133]:
                - generic [ref=e134]:
                  - generic [ref=e135]: Oct 21, 2026
                  - generic [ref=e136]: Today
                - generic [ref=e137]:
                  - text: 2 readings ·
                  - 'generic "Estimated reading time: about 6 min" [ref=e138]': ≈ 6 min
                - generic [ref=e139]: Complete
            - button "Undo day" [ref=e147]
          - generic [ref=e148]:
            - button "Reading 1A" [ref=e149]
            - button "Reading 1B" [ref=e154]
      - group [ref=e159]:
        - generic "Optional commitments · Prayer and fasting" [ref=e160] [cursor=pointer]
```

# Test source

```ts
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
  1689 |   expect(cardBox!.width).toBeGreaterThan(chooseBox!.width);
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
> 1739 |     .toBeCloseTo(222.26, 1);
       |      ^ Error: expect(received).toBeCloseTo(expected, precision)
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
  1790 |     today,
  1791 |     startOffset: -6,
  1792 |     completedIndexes: [0, 1, 2, 3, 4, 5],
  1793 |   });
  1794 |   await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  1795 |   await seedLocalData(page, [plan], plan.id, { ownerId });
  1796 |   await openMountainRhythm(page);
  1797 |   await expect(page.getByTestId("mountain-rhythm-current-status"))
  1798 |     .toContainText("Current elevation: Summit");
  1799 | 
  1800 |   const chart = page.getByTestId("mountain-rhythm-mountain");
  1801 |   for (const width of [320, 375, 1280]) {
  1802 |     await page.setViewportSize({ width, height: width === 375 ? 667 : 844 });
  1803 |     const chartBox = await chart.boundingBox();
  1804 |     const flagLabelBox = await chart.getByTestId("mountain-rhythm-current-flag-label").boundingBox();
  1805 |     const dayLabelBoxes = await chart.getByTestId("mountain-rhythm-day-labels")
  1806 |       .locator("text")
  1807 |       .evaluateAll((labels) => labels.map((label) => {
  1808 |         const box = label.getBoundingClientRect();
  1809 |         return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
  1810 |       }));
  1811 |     expect(chartBox).not.toBeNull();
  1812 |     expect(flagLabelBox).not.toBeNull();
  1813 |     expect(flagLabelBox!.x).toBeGreaterThanOrEqual(chartBox!.x);
  1814 |     expect(flagLabelBox!.x + flagLabelBox!.width)
  1815 |       .toBeLessThanOrEqual(chartBox!.x + chartBox!.width + 1);
  1816 |     expect(dayLabelBoxes).toHaveLength(7);
  1817 |     for (const label of dayLabelBoxes) {
  1818 |       expect(label.left).toBeGreaterThanOrEqual(chartBox!.x);
  1819 |       expect(label.right).toBeLessThanOrEqual(chartBox!.x + chartBox!.width + 1);
  1820 |       expect(label.bottom).toBeLessThanOrEqual(chartBox!.y + chartBox!.height + 1);
  1821 |     }
  1822 |     await expect(chart.getByTestId("mountain-rhythm-elevation-guides").locator("text:visible"))
  1823 |       .toHaveCount(width < 640 ? 1 : 5);
  1824 |     expect(await page.evaluate(() => document.documentElement.scrollWidth))
  1825 |       .toBeLessThanOrEqual(width + 1);
  1826 |     await page.getByTestId("mountain-rhythm-panel").screenshot({
  1827 |       path: `/tmp/discipleos-mountain-near-summit-${width}.png`,
  1828 |     });
  1829 |   }
  1830 | });
  1831 | 
  1832 | test("keeps Today on its calendar date when Day 4 is only the latest completed day", async ({ page }) => {
  1833 |   const today = new Date().toISOString().slice(0, 10);
  1834 |   const plan = makePlan({
  1835 |     id: "today-is-day-five",
  1836 |     days: 7,
  1837 |     name: "7-Day Climb",
  1838 |     today,
  1839 |     startOffset: -4,
```