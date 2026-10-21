# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> keeps the three summary cards readable across target widths
- Location: tests/e2e/mountain-rhythm.spec.ts:2578:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByTestId('mountain-rhythm-day-labels').locator('text').first()
Expected: "14"
Received: "11"
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByTestId('mountain-rhythm-day-labels').locator('text').first()
    14 × locator resolved to <text x="132" y="238" fill="#C9CDD3" font-size="11" stroke="#0B1418" stroke-width="2.5" text-anchor="middle" paint-order="stroke" data-component-name="text" data-replit-metadata="artifacts/discipleos/src/components/MountainRhythmCard.tsx:462:20">1</text>
       - unexpected value "11"

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
            - generic [ref=e43]: 14.3%
            - generic [ref=e44]: 1 of 7 planned days
          - generic [ref=e46]:
            - generic [ref=e47]: Consistency
            - generic [ref=e48]: 50%
            - generic [ref=e49]: Recovering consistency
        - generic [ref=e51]:
          - img "7-Day Climb reading-rhythm trail; current elevation 14.3%, journey progress 14.3%" [ref=e52]:
            - generic "Elevation guide lines" [ref=e60]
            - generic "Elevation level labels" [ref=e62]:
              - 'generic "Current stage: Basecamp, 0% threshold" [ref=e64]': Basecamp
              - 'generic "Next milestone: On the Trail, 25% threshold" [ref=e66]': On the Trail
              - 'generic "Milestone: Gaining Elevation, 50% threshold" [ref=e68]': GainingElevation
              - 'generic "Milestone: Ridgeline, 70% threshold" [ref=e70]': Ridgeline
              - 'generic "Milestone: Summit, 85% threshold" [ref=e72]': Summit
            - generic "Day 1, complete, readings complete, 14.3% current elevation, 14.3% earned ascent" [ref=e73]
            - generic "Day 2, missed, readings missed, 14.3% current elevation, 14.3% earned ascent" [ref=e74]
            - generic "Day 3, future, readings future, 14.3% current elevation, 14.3% earned ascent" [ref=e75]
            - generic "Day 4, future, readings future, 14.3% current elevation, 14.3% earned ascent" [ref=e76]
            - generic "Day 5, future, readings future, 14.3% current elevation, 14.3% earned ascent" [ref=e77]
            - generic "Day 6, future, readings future, 14.3% current elevation, 14.3% earned ascent" [ref=e78]
            - generic "Day 7, future, readings future, 14.3% current elevation, 14.3% earned ascent" [ref=e79]
            - generic [ref=e80]:
              - generic [ref=e81]: "1"
              - generic [ref=e83]: "2"
              - generic [ref=e85]: "3"
              - generic [ref=e87]: "4"
              - generic [ref=e89]: "5"
              - generic [ref=e91]: "6"
              - generic [ref=e93]: "7"
            - generic "Today's position at Basecamp" [ref=e95]:
              - generic "Current elevation 14.3%" [ref=e97]
              - generic [ref=e98]: Today
          - list "Elevation milestones" [ref=e99]:
            - listitem [ref=e100]: "Basecamp: 0%"
            - listitem [ref=e101]: "On the Trail: 25%"
            - listitem [ref=e102]: "Gaining Elevation: 50%"
            - listitem [ref=e103]: "Ridgeline: 70%"
            - listitem [ref=e104]: "Summit: 85%"
        - paragraph [ref=e105]:
          - text: "Current: Basecamp · Next: On the Trail"
          - generic [ref=e106]: "Current elevation: Basecamp · 14.3% · Today, Oct 21 · Day 2"
        - group [ref=e108]:
          - generic "How Mountain Rhythm works" [ref=e109] [cursor=pointer]
      - generic [ref=e111]:
        - generic [ref=e112]:
          - generic [ref=e113]:
            - generic [ref=e114]: Route to today
            - paragraph [ref=e119]: 7-Day Climb · future readings stay hidden until their day
          - generic [ref=e120]: 1/7 days
        - generic [ref=e121]:
          - generic [ref=e122]: Today’s next step
          - generic [ref=e123]:
            - generic [ref=e124]: Ready for today
            - generic [ref=e126]: 0% of today's reading complete
        - generic [ref=e127]:
          - generic [ref=e128]:
            - generic [ref=e129]:
              - button "Collapse Day 2 readings, Oct 21, 2026, Next step, 2 readings, estimated reading time 6 min" [expanded] [ref=e130]:
                - generic [ref=e131]: "2"
                - generic [ref=e132]:
                  - generic [ref=e133]:
                    - generic [ref=e134]: Oct 21, 2026
                    - generic [ref=e135]: Today
                  - generic [ref=e136]:
                    - text: 2 readings ·
                    - 'generic "Estimated reading time: about 6 min" [ref=e137]': ≈ 6 min
                  - generic [ref=e138]: Next step
              - button "Complete day" [ref=e144]
            - generic [ref=e145]:
              - button "Reading 2A" [ref=e146]
              - button "Reading 2B" [ref=e150]
          - generic [ref=e155]:
            - button "Expand Day 1 readings, Oct 20, 2026, Complete, 2 readings, estimated reading time 6 min" [ref=e156]:
              - generic [ref=e157]: "1"
              - generic [ref=e158]:
                - generic [ref=e159]: Oct 20, 2026
                - generic [ref=e161]:
                  - text: 2 readings ·
                  - 'generic "Estimated reading time: about 6 min" [ref=e162]': ≈ 6 min
                - generic [ref=e163]: Complete
            - button "Undo day" [ref=e171]
      - group [ref=e172]:
        - generic "Optional commitments · Prayer and fasting" [ref=e173] [cursor=pointer]
```

# Test source

```ts
  2540 |   expect(after[3]).toBeLessThan(before[2]);
  2541 | });
  2542 | 
  2543 | test("keeps on-schedule consistency separate from current reading checkboxes", async ({
  2544 |   page,
  2545 | }) => {
  2546 |   const today = new Date().toISOString().slice(0, 10);
  2547 |   const plan = makePlan({
  2548 |     id: "missed-climb",
  2549 |     days: 7,
  2550 |     name: "7-Day Climb",
  2551 |     today,
  2552 |     startOffset: -4,
  2553 |     completedIndexes: [0, 1, 2, 3],
  2554 |   });
  2555 | 
  2556 |   await stubApi(page);
  2557 |   await seedLocalData(page, [plan], plan.id);
  2558 |   await openMountainRhythm(page);
  2559 | 
  2560 |   const journeyMetric = page.getByTestId("mountain-rhythm-metric-journey");
  2561 |   const rhythmMetric = page.getByTestId("mountain-rhythm-metric-rhythm");
  2562 |   await expect(journeyMetric).toContainText("57.1%");
  2563 |   await expect(rhythmMetric).toContainText("80%");
  2564 | 
  2565 |   await page.getByTestId("route-day-toggle-2").click();
  2566 |   const missedDayReadings = page
  2567 |     .getByTestId("route-day-2")
  2568 |     .locator('button[data-testid^="button-reading-"]');
  2569 |   await missedDayReadings.nth(0).click();
  2570 |   await missedDayReadings.nth(1).click();
  2571 | 
  2572 |   await expect(journeyMetric).toContainText("57.1%");
  2573 |   await expect(rhythmMetric).toContainText("80%");
  2574 |   await expect(page.getByTestId("mountain-rhythm-panel").getByTestId("mountain-rhythm-metric-elevation")).toHaveCount(0);
  2575 |   await expect(page.getByTestId("route-day-2")).toContainText("Next step");
  2576 | });
  2577 | 
  2578 | test("keeps the three summary cards readable across target widths", async ({ page }) => {
  2579 |   const ownerId = "mobile-climb-owner";
  2580 |   const today = new Date().toISOString().slice(0, 10);
  2581 |   const plan = makePlan({
  2582 |     id: "mobile-climb",
  2583 |     days: 7,
  2584 |     name: "7-Day Climb",
  2585 |     today,
  2586 |     startOffset: -1,
  2587 |     completedIndexes: [0],
  2588 |   });
  2589 | 
  2590 |   await stubApi(page, {
  2591 |     success: true,
  2592 |     userId: ownerId,
  2593 |     authenticated: false,
  2594 |     established: false,
  2595 |   });
  2596 |   await seedLocalData(page, [plan], plan.id, { ownerId });
  2597 |   await openMountainRhythm(page);
  2598 |   await expect(page.getByTestId("button-manage-climb")).toBeVisible();
  2599 |   await expect(page.getByTestId("button-choose-7-day-climb")).toHaveCount(0);
  2600 |   await page.getByTestId("button-manage-climb").click();
  2601 |   await expect(page.getByTestId("button-choose-7-day-climb")).toBeVisible();
  2602 |   await page.getByRole("button", { name: "Close", exact: true }).click();
  2603 | 
  2604 |   const metrics = page.locator('[data-testid^="mountain-rhythm-metric-"]');
  2605 |   for (const width of [320, 360, 390]) {
  2606 |     await page.setViewportSize({ width, height: 844 });
  2607 |     await expect(metrics).toHaveCount(3);
  2608 |     for (let index = 0; index < 3; index += 1) {
  2609 |       await expect(metrics.nth(index)).toBeVisible();
  2610 |       const box = await metrics.nth(index).boundingBox();
  2611 |       expect(box).not.toBeNull();
  2612 |       expect(box!.x).toBeGreaterThanOrEqual(0);
  2613 |       expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  2614 |       const typeScale = await metrics.nth(index).evaluate((element) => {
  2615 |         const children = Array.from(element.children) as HTMLElement[];
  2616 |         return {
  2617 |           label: Number.parseFloat(getComputedStyle(children[0]).fontSize),
  2618 |           value: Number.parseFloat(getComputedStyle(children[1]).fontSize),
  2619 |           detail: Number.parseFloat(getComputedStyle(children[2]).fontSize),
  2620 |         };
  2621 |       });
  2622 |       expect(typeScale.label).toBeGreaterThanOrEqual(width < 640 ? 10 : 12);
  2623 |       expect(typeScale.value).toBeGreaterThanOrEqual(width < 640 ? 14 : 18);
  2624 |       expect(typeScale.detail).toBeGreaterThanOrEqual(width < 640 ? 10 : 13);
  2625 |     }
  2626 |     expect(
  2627 |       await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  2628 |     ).toBe(true);
  2629 |   }
  2630 |   await page.setViewportSize({ width: 1440, height: 900 });
  2631 |   expect(
  2632 |     await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  2633 |   ).toBe(true);
  2634 |   await expect(page.getByTestId("mountain-rhythm-mountain")).toBeVisible();
  2635 |   await expect(page.getByTestId("mountain-rhythm-elevation-guides").locator("g")).toHaveCount(5);
  2636 |   await expect(page.getByTestId("mountain-rhythm-milestones")).toHaveCount(0);
  2637 |   await expect(page.getByTestId("mountain-rhythm-status")).toContainText("Today’s next step");
  2638 |   await expect(page.getByTestId("mountain-rhythm-elevation-label-50")).toHaveText("GainingElevation");
  2639 |   const dayLabels = page.getByTestId("mountain-rhythm-day-labels").locator("text");
> 2640 |   await expect(dayLabels.first()).toHaveAttribute("font-size", "14");
       |                                   ^ Error: expect(locator).toHaveAttribute(expected) failed
  2641 |   const helpToggle = page.getByTestId("mountain-rhythm-help-toggle");
  2642 |   await expect(helpToggle).toBeVisible();
  2643 |   await expect(page.getByTestId("mountain-rhythm-help-copy")).toBeHidden();
  2644 |   await helpToggle.click();
  2645 |   await expect(page.getByTestId("mountain-rhythm-help-copy")).toBeVisible();
  2646 | });
  2647 | 
  2648 | test("keeps Mountain Rhythm hierarchy single-layer with compact corners", async ({ page }) => {
  2649 |   const ownerId = "visual-hierarchy-owner";
  2650 |   const today = new Date().toISOString().slice(0, 10);
  2651 |   const plan = makePlan({
  2652 |     id: "visual-hierarchy-climb",
  2653 |     days: 7,
  2654 |     name: "7-Day Climb",
  2655 |     today,
  2656 |   });
  2657 |   await stubApi(page, {
  2658 |     success: true,
  2659 |     userId: ownerId,
  2660 |     authenticated: false,
  2661 |     established: false,
  2662 |   });
  2663 |   await seedLocalData(page, [plan], plan.id, { ownerId });
  2664 |   await openMountainRhythm(page);
  2665 | 
  2666 |   const hierarchy = await page.evaluate(() => {
  2667 |     const styleFor = (testId: string) => {
  2668 |       const element = document.querySelector(`[data-testid="${testId}"]`);
  2669 |       if (!element) return null;
  2670 |       const styles = getComputedStyle(element);
  2671 |       return {
  2672 |         border: styles.borderTopWidth,
  2673 |         background: styles.backgroundColor,
  2674 |         radius: styles.borderTopLeftRadius,
  2675 |       };
  2676 |     };
  2677 |     const chart = document.querySelector('[data-testid="mountain-rhythm-mountain"]')?.parentElement;
  2678 |     return {
  2679 |       choose: styleFor("mountain-rhythm-choose"),
  2680 |       route: styleFor("mountain-rhythm-route"),
  2681 |       status: styleFor("mountain-rhythm-status"),
  2682 |       chartRadius: chart ? getComputedStyle(chart).borderTopLeftRadius : "",
  2683 |     };
  2684 |   });
  2685 | 
  2686 |   for (const section of [hierarchy.choose, hierarchy.route, hierarchy.status]) {
  2687 |     expect(section).not.toBeNull();
  2688 |     expect(section?.background).toBe("rgba(0, 0, 0, 0)");
  2689 |   }
  2690 |   expect(hierarchy.choose?.border).toBe("0px");
  2691 |   expect(hierarchy.route?.border).toBe("0px");
  2692 |   expect(hierarchy.status?.border).toBe("0px");
  2693 |   expect(hierarchy.chartRadius).toBe("0px");
  2694 | });
```