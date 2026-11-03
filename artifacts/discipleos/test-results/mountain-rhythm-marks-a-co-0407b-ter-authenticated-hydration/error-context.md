# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> marks a completed 7-Day Climb after authenticated hydration
- Location: tests/e2e/mountain-rhythm.spec.ts:2756:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('button-choose-7-day-climb')
Expected substring: "7-Day Climb · Complete"
Received string:    "7-Day ClimbA focused week in Genesis.Select route"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for getByTestId('button-choose-7-day-climb')
    14 × locator resolved to <button type="button" aria-pressed="false" data-component-name="button" data-testid="button-choose-7-day-climb" data-replit-metadata="artifacts/discipleos/src/components/MountainClimbSetup.tsx:79:14" class="w-full border p-4 text-left border-white/10 bg-white/[0.03] hover:border-[#D4A017]/60">…</button>
       - unexpected value "7-Day ClimbA focused week in Genesis.Select route"

```

```yaml
- button "7-Day Climb A focused week in Genesis. Select route"
```

# Test source

```ts
  2681 |     };
  2682 | 
  2683 |     await stubAuthenticatedApi(
  2684 |       page,
  2685 |       ordinaryPlan,
  2686 |       [],
  2687 |     );
  2688 |     await seedLocalData(
  2689 |       page,
  2690 |       [],
  2691 |       null,
  2692 |     );
  2693 |     await openMountainRhythm(page);
  2694 | 
  2695 |     const saveRequest = page.waitForRequest(
  2696 |       (request) =>
  2697 |         request.url().includes("/api/reading/plans") && request.method() === "POST",
  2698 |     );
  2699 |     await completeClimbSetup(page, route.kind);
  2700 |     const savedPlanRequest = await saveRequest;
  2701 |     expect(savedPlanRequest.postDataJSON()).toMatchObject({
  2702 |       journeyDays: route.days,
  2703 |       durationDays: route.days,
  2704 |       totalDays: route.days,
  2705 |       journeyKey: route.kind,
  2706 |       journeyType: route.kind,
  2707 |     });
  2708 | 
  2709 |     await expectDistinctMountainMetrics(page, route.label);
  2710 |     await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText(
  2711 |       `0 of ${route.days} planned days`,
  2712 |     );
  2713 |     await expect(
  2714 |       page.getByText(
  2715 |         new RegExp(`${persistedPlanName} · about \\d+ min/day · future readings stay hidden until their day`),
  2716 |       ),
  2717 |     ).toBeVisible();
  2718 |     await expect(page.getByTestId("route-day-1")).toBeVisible();
  2719 |     await expect(
  2720 |       page.getByTestId("route-day-estimated-reading-time-1"),
  2721 |     ).toHaveText(/≈ \d+ min/);
  2722 |     await expect(page.getByText("Ordinary reading plan", { exact: true })).toHaveCount(0);
  2723 | 
  2724 |     const metricValuesBeforeReload = await Promise.all(
  2725 |       ["today", "journey", "rhythm"].map((metric) =>
  2726 |         page.getByTestId(`mountain-rhythm-metric-${metric}`).innerText(),
  2727 |       ),
  2728 |     );
  2729 | 
  2730 |     await page.reload();
  2731 |     await openMountainRhythm(page);
  2732 |     await expectDistinctMountainMetrics(page, route.label);
  2733 |     await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText(
  2734 |       `0 of ${route.days} planned days`,
  2735 |     );
  2736 |     await expect(
  2737 |       page.getByText(
  2738 |         new RegExp(`${persistedPlanName} · about \\d+ min/day · future readings stay hidden until their day`),
  2739 |       ),
  2740 |     ).toBeVisible();
  2741 |     await expect(page.getByTestId("route-day-1")).toBeVisible();
  2742 |     await expect(page.getByText("Ordinary reading plan", { exact: true })).toHaveCount(0);
  2743 | 
  2744 |     const metricValuesAfterReload = await Promise.all(
  2745 |       ["today", "journey", "rhythm"].map((metric) =>
  2746 |         page.getByTestId(`mountain-rhythm-metric-${metric}`).innerText(),
  2747 |       ),
  2748 |     );
  2749 |     expect(metricValuesAfterReload).toEqual(metricValuesBeforeReload);
  2750 |   });
  2751 | }
  2752 | 
  2753 | for (const route of [
  2754 |   { kind: "7-day-climb", label: "7-Day Climb", days: 7 as const },
  2755 | ] as const) {
  2756 |   test(`marks a completed ${route.label} after authenticated hydration`, async ({ page }) => {
  2757 |     const today = new Date().toISOString().slice(0, 10);
  2758 |     const completed = makePlan({
  2759 |       id: `hydrated-completed-${route.kind}`,
  2760 |       days: route.days,
  2761 |       name: route.label,
  2762 |       today,
  2763 |       completedIndexes: Array.from({ length: route.days }, (_, index) => index),
  2764 |     });
  2765 |     const ordinaryPlan = {
  2766 |       ...makePlan({
  2767 |         id: `hydrated-ordinary-${route.kind}`,
  2768 |         days: 7,
  2769 |         name: "Ordinary reading plan",
  2770 |         today,
  2771 |       }),
  2772 |       journeyKey: "custom",
  2773 |       journeyType: "custom",
  2774 |     };
  2775 | 
  2776 |     await stubAuthenticatedApi(page, ordinaryPlan, [completed]);
  2777 |     await seedLocalData(page, [], null);
  2778 |     await openMountainRhythm(page);
  2779 | 
  2780 |     await expect(page.getByTestId("mountain-rhythm-complete")).toContainText(`${route.label} complete`);
> 2781 |     await expect(page.getByTestId(`button-choose-${route.kind}`)).toContainText(`${route.label} · Complete`);
       |                                                                   ^ Error: expect(locator).toContainText(expected) failed
  2782 |     await expect(page.getByTestId(`completed-climb-${route.kind}`)).toHaveCount(0);
  2783 |     await expandPastClimbs(page);
  2784 |     await expect(page.getByTestId(`completed-climb-${route.kind}`)).toContainText("100% journey progress");
  2785 |     await expect(page.getByText("Ordinary reading plan", { exact: true })).toHaveCount(0);
  2786 |   });
  2787 | }
  2788 | 
  2789 | test("shows the newest available Route to date day first and collapses earlier days independently", async ({
  2790 |   page,
  2791 | }) => {
  2792 |   const today = await page.evaluate(() => {
  2793 |     const date = new Date();
  2794 |     const month = String(date.getMonth() + 1).padStart(2, "0");
  2795 |     const day = String(date.getDate()).padStart(2, "0");
  2796 |     return `${date.getFullYear()}-${month}-${day}`;
  2797 |   });
  2798 |   const plan = makePlan({
  2799 |     id: "latest-route-day-first",
  2800 |     days: 7,
  2801 |     name: "7-Day Climb",
  2802 |     today,
  2803 |     startOffset: -2,
  2804 |     completedIndexes: [1],
  2805 |   });
  2806 | 
  2807 |   await stubApi(page);
  2808 |   await seedLocalData(page, [plan], plan.id);
  2809 |   await openMountainRhythm(page);
  2810 | 
  2811 |   const routeDays = page
  2812 |     .getByTestId("mountain-rhythm-route-days")
  2813 |     .locator("[data-route-day-number]");
  2814 |   await expect(routeDays).toHaveCount(3);
  2815 |   expect(
  2816 |     await routeDays.evaluateAll((days) =>
  2817 |       days.map((routeDay) => routeDay.getAttribute("data-route-day-number")),
  2818 |     ),
  2819 |   ).toEqual(["3", "2", "1"]);
  2820 | 
  2821 |   await expect(page.getByTestId("route-day-toggle-3")).toHaveAttribute(
  2822 |     "aria-expanded",
  2823 |     "true",
  2824 |   );
  2825 |   await expect(page.getByTestId("route-day-readings-3")).toBeVisible();
  2826 |   for (const earlierDayNumber of [1, 2]) {
  2827 |     await expect(
  2828 |       page.getByTestId(`route-day-toggle-${earlierDayNumber}`),
  2829 |     ).toHaveAttribute("aria-expanded", "false");
  2830 |     await expect(
  2831 |       page.getByTestId(`route-day-readings-${earlierDayNumber}`),
  2832 |     ).toBeHidden();
  2833 |   }
  2834 | 
  2835 |   const completedEarlierDay = page.getByTestId("route-day-2");
  2836 |   await expect(
  2837 |     completedEarlierDay.getByTestId("route-day-number-2"),
  2838 |   ).toHaveText("2");
  2839 |   await expect(
  2840 |     completedEarlierDay.getByTestId("route-day-date-2"),
  2841 |   ).not.toBeEmpty();
  2842 |   await expect(
  2843 |     completedEarlierDay.getByTestId("route-day-toggle-2"),
  2844 |   ).toContainText("2 readings");
  2845 |   await expect(
  2846 |     completedEarlierDay.getByTestId("route-day-toggle-2"),
  2847 |   ).toContainText(/≈ \d+ min/);
  2848 |   await expect(
  2849 |     completedEarlierDay.getByTestId("route-day-status-2"),
  2850 |   ).toHaveText("Complete");
  2851 |   await expect(
  2852 |     completedEarlierDay.getByTestId("button-complete-day-2"),
  2853 |   ).toHaveText("Undo day");
  2854 | 
  2855 |   await page.getByTestId("route-day-toggle-2").click();
  2856 |   await expect(page.getByTestId("route-day-readings-2")).toBeVisible();
  2857 |   await expect(page.getByTestId("route-day-readings-1")).toBeHidden();
  2858 |   await page.getByTestId("route-day-toggle-1").click();
  2859 |   await expect(page.getByTestId("route-day-readings-1")).toBeVisible();
  2860 |   await expect(page.getByTestId("route-day-readings-2")).toBeVisible();
  2861 |   await page.getByTestId("route-day-toggle-2").click();
  2862 |   await expect(page.getByTestId("route-day-readings-2")).toBeHidden();
  2863 |   await expect(page.getByTestId("route-day-readings-1")).toBeVisible();
  2864 |   await expect(page.getByTestId("route-day-readings-3")).toBeVisible();
  2865 | 
  2866 |   await expect(page.getByTestId("route-day-4")).toHaveCount(0);
  2867 | 
  2868 |   await page.reload();
  2869 |   await openMountainRhythm(page);
  2870 |   await expect(page.getByTestId("route-day-readings-3")).toBeVisible();
  2871 |   await expect(page.getByTestId("route-day-readings-2")).toBeHidden();
  2872 |   await expect(page.getByTestId("route-day-readings-1")).toBeHidden();
  2873 |   await expect(page.getByTestId("route-day-4")).toHaveCount(0);
  2874 | });
  2875 | 
  2876 | test("updates Today’s reading for a partial day without awarding ascent", async ({
  2877 |   page,
  2878 | }) => {
  2879 |   const today = new Date().toISOString().slice(0, 10);
  2880 |   const plan = makePlan({
  2881 |     id: "partial-climb",
```