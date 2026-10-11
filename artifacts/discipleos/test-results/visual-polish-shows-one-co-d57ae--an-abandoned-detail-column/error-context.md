# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-polish.spec.ts >> shows one contained empty Plans state without an abandoned detail column
- Location: tests/e2e/visual-polish.spec.ts:2817:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "rgb(226, 232, 240)"
Received: "rgb(201, 205, 211)"
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - button "Feedback" [ref=e3] [cursor=pointer]:
    - generic [ref=e4]: ✦
    - text: Feedback
  - generic [ref=e8]:
    - generic [ref=e10]:
      - heading "DISCIPLEOS" [level=1] [ref=e11]
      - link "Continue with email" [ref=e12] [cursor=pointer]:
        - /url: /sign-in
    - button "Open menu" [ref=e15]:
      - generic [ref=e18]: Menu
    - region "Reading paths" [ref=e23]:
      - heading "Choose a reading path" [level=2] [ref=e24]
      - generic [ref=e25]:
        - article [ref=e26]:
          - button "Guided Climb New to reading the Bible? Start with a guided 27-day journey that introduces Scripture one step at a time." [ref=e27]:
            - generic [ref=e28]:
              - generic [ref=e29]: Guided Climb
              - generic [ref=e37]: New to reading the Bible? Start with a guided 27-day journey that introduces Scripture one step at a time.
        - article [ref=e38]:
          - link "Mountain Rhythm Struggling to read consistently? Build a lasting habit with structured climbs, reminders, and progress tracking." [ref=e39] [cursor=pointer]:
            - /url: /mountain-rhythm
            - generic [ref=e40]:
              - generic [ref=e41]: Mountain Rhythm
              - generic [ref=e49]: Struggling to read consistently? Build a lasting habit with structured climbs, reminders, and progress tracking.
        - article [ref=e50]:
          - button "Free Climb Already reading regularly? Choose and combine Bible reading plans that fit your interests and schedule." [ref=e51]:
            - generic [ref=e52]:
              - generic [ref=e53]: Free Climb
              - generic [ref=e62]: Already reading regularly? Choose and combine Bible reading plans that fit your interests and schedule.
```

# Test source

```ts
  2759 | 
  2760 | test("keeps dashboard tab containers lean and inside shared gutters", async ({ page }) => {
  2761 |   const plan = makeOrdinaryPlan();
  2762 |   await stubHomeApi(page, plan);
  2763 |   await seedPlans(page, [plan]);
  2764 | 
  2765 |   for (const width of [360, 768, 1280]) {
  2766 |     await page.setViewportSize({ width, height: 900 });
  2767 |     await page.goto("/");
  2768 | 
  2769 |     const tabs = ["Calendar", "Plans"];
  2770 | 
  2771 |     for (const tab of tabs) {
  2772 |       const navigation = await openDashboardNavigation(page);
  2773 |       await navigation.getByRole("button", { name: tab, exact: true }).click();
  2774 | 
  2775 |       const contentTestIds = tab === "Calendar"
  2776 |         ? ["dashboard-calendar-activities", "dashboard-calendar-month"]
  2777 |         : ["dashboard-plans-list", "dashboard-plan-details"];
  2778 |       for (const testId of contentTestIds) {
  2779 |         await expect(page.getByTestId(testId)).toBeVisible();
  2780 |       }
  2781 | 
  2782 |       const layout = await page.evaluate((testIds) => {
  2783 |         const surfaces = testIds.map((testId) => {
  2784 |           const element = document.querySelector(`[data-testid="${testId}"]`);
  2785 |           const rect = element?.getBoundingClientRect();
  2786 |           const styles = element ? getComputedStyle(element) : null;
  2787 |           return {
  2788 |             testId,
  2789 |             left: rect ? Math.round(rect.left) : -1,
  2790 |             right: rect ? Math.round(rect.right) : Infinity,
  2791 |             border: styles?.borderTopWidth || "",
  2792 |             background: styles?.backgroundColor || "",
  2793 |           };
  2794 |         });
  2795 |         return {
  2796 |           viewportWidth: window.innerWidth,
  2797 |           documentWidth: document.documentElement.scrollWidth,
  2798 |           surfaces,
  2799 |         };
  2800 |       }, contentTestIds);
  2801 | 
  2802 |       expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  2803 |       for (const surface of layout.surfaces) {
  2804 |         expect(surface.left).toBeGreaterThanOrEqual(12);
  2805 |         expect(surface.right).toBeLessThanOrEqual(width - 12);
  2806 |         expect(surface.border).toBe("1px");
  2807 |         expect(surface.background).not.toBe("rgba(0, 0, 0, 0)");
  2808 |       }
  2809 | 
  2810 |       if (tab === "Calendar") {
  2811 |         await expect(page.getByTestId("calendar-event-form").locator(".discipleos-functional-surface")).toHaveCount(0);
  2812 |       }
  2813 |     }
  2814 |   }
  2815 | });
  2816 | 
  2817 | test("shows one contained empty Plans state without an abandoned detail column", async ({ page }) => {
  2818 |   await stubHomeApi(page, []);
  2819 |   await seedPlans(page, []);
  2820 | 
  2821 |   for (const viewport of [
  2822 |     { width: 375, height: 667 },
  2823 |     { width: 390, height: 844 },
  2824 |     { width: 360, height: 800 },
  2825 |     { width: 1440, height: 900 },
  2826 |   ]) {
  2827 |     const { width } = viewport;
  2828 |     await page.setViewportSize(viewport);
  2829 |     await page.goto("/");
  2830 | 
  2831 |     const navigation = await openDashboardNavigation(page);
  2832 |     await navigation.getByRole("button", { name: "Plans", exact: true }).click();
  2833 | 
  2834 |     const emptyState = page.getByTestId("dashboard-plans-empty-state");
  2835 |     await expect(emptyState).toHaveCount(1);
  2836 |     await expect(emptyState.getByTestId("reading-path-guided")).toBeVisible();
  2837 |     await expect(emptyState.getByTestId("reading-path-mountain-rhythm")).toBeVisible();
  2838 |     await expect(emptyState.getByTestId("reading-path-free-climb")).toBeVisible();
  2839 |     await expect(page.getByText("No reading plan selected yet", { exact: false })).toHaveCount(0);
  2840 |     await expect(page.getByTestId("dashboard-plan-details")).toHaveCount(0);
  2841 |     await expect(page.getByTestId("reading-path-free-climb-action")).toBeVisible();
  2842 |     const pathTitle = emptyState.getByTestId("reading-path-guided-title");
  2843 |     const pathDescription = emptyState.getByTestId("reading-path-guided-description");
  2844 |     expect(
  2845 |       Number.parseFloat(
  2846 |         await pathTitle.evaluate((element) => getComputedStyle(element).fontSize),
  2847 |       ),
  2848 |     ).toBeGreaterThanOrEqual(16);
  2849 |     const descriptionStyle = await pathDescription.evaluate((element) => {
  2850 |       const style = getComputedStyle(element);
  2851 |       return {
  2852 |         fontSize: Number.parseFloat(style.fontSize),
  2853 |         lineHeight: Number.parseFloat(style.lineHeight),
  2854 |         color: style.color,
  2855 |       };
  2856 |     });
  2857 |     expect(descriptionStyle.fontSize).toBeGreaterThanOrEqual(14);
  2858 |     expect(descriptionStyle.lineHeight).toBeGreaterThanOrEqual(20);
> 2859 |     expect(descriptionStyle.color).toBe("rgb(226, 232, 240)");
       |                                    ^ Error: expect(received).toBe(expected) // Object.is equality
  2860 |     await expect(page.getByTestId("reading-path-mountain-rhythm-action")).toHaveAttribute(
  2861 |       "href",
  2862 |       "/mountain-rhythm",
  2863 |     );
  2864 | 
  2865 |     const layout = await page.evaluate(() => {
  2866 |       const empty = document.querySelector('[data-testid="dashboard-plans-empty-state"]');
  2867 |       const list = document.querySelector('[data-testid="dashboard-plans-list"]');
  2868 |       const emptyRect = empty?.getBoundingClientRect();
  2869 |       const listRect = list?.getBoundingClientRect();
  2870 |       return {
  2871 |         viewportWidth: window.innerWidth,
  2872 |         documentWidth: document.documentElement.scrollWidth,
  2873 |         empty: emptyRect
  2874 |           ? { left: emptyRect.left, right: emptyRect.right, height: emptyRect.height }
  2875 |           : null,
  2876 |         list: listRect ? { left: listRect.left, right: listRect.right } : null,
  2877 |       };
  2878 |     });
  2879 |     expect(layout.documentWidth).toBeLessThanOrEqual(width + 1);
  2880 |     expect(layout.empty?.left ?? -1).toBeGreaterThanOrEqual(12);
  2881 |     expect(layout.empty?.right ?? Infinity).toBeLessThanOrEqual(width - 12);
  2882 |     expect(layout.empty?.height ?? 0).toBeGreaterThan(80);
  2883 |     expect(layout.empty?.height ?? Infinity).toBeLessThan(1000);
  2884 |     expect(layout.list?.left ?? -1).toBeGreaterThanOrEqual(12);
  2885 |     expect(layout.list?.right ?? Infinity).toBeLessThanOrEqual(width - 12);
  2886 |     if (width <= 600) {
  2887 |       const viewportLayout = await page.evaluate(() => {
  2888 |         const content = document.querySelector(".discipleos-app-content");
  2889 |         const contentRect = content?.getBoundingClientRect();
  2890 |         return {
  2891 |           content: contentRect
  2892 |             ? { top: contentRect.top, bottom: contentRect.bottom }
  2893 |             : null,
  2894 |           cards: Array.from(
  2895 |             document.querySelectorAll<HTMLElement>('[data-testid^="reading-path-"][data-testid$="-action"]'),
  2896 |           ).map((card) => {
  2897 |             const rect = card.getBoundingClientRect();
  2898 |             return { top: rect.top, bottom: rect.bottom };
  2899 |           }),
  2900 |         };
  2901 |       });
  2902 |       expect(
  2903 |         viewportLayout.cards.every(
  2904 |           (card) =>
  2905 |             card.top >= (viewportLayout.content?.top ?? Infinity) &&
  2906 |             card.bottom <= (viewportLayout.content?.bottom ?? -Infinity),
  2907 |         ),
  2908 |         `${width}x${viewport.height}: ${JSON.stringify(viewportLayout)}`,
  2909 |       ).toBe(true);
  2910 |     }
  2911 | 
  2912 |     await page.getByTestId("reading-path-free-climb-action").click();
  2913 |     const buildForm = page.getByTestId("dashboard-build-form");
  2914 |     await expect(buildForm).toBeVisible();
  2915 |     const newTestamentChoice = page.getByTestId("plan-create-preset-newTestament");
  2916 |     const newTestamentLabel = newTestamentChoice.getByText("New Testament", { exact: true });
  2917 |     const newTestamentDetail = newTestamentChoice.getByText(
  2918 |       "Read through the New Testament.",
  2919 |       { exact: true },
  2920 |     );
  2921 |     expect(
  2922 |       Number.parseFloat(
  2923 |         await newTestamentLabel.evaluate((element) => getComputedStyle(element).fontSize),
  2924 |       ),
  2925 |     ).toBeGreaterThanOrEqual(16);
  2926 |     expect(
  2927 |       Number.parseFloat(
  2928 |         await newTestamentDetail.evaluate((element) => getComputedStyle(element).fontSize),
  2929 |       ),
  2930 |     ).toBeGreaterThanOrEqual(14);
  2931 |     await expect(newTestamentDetail).toHaveCSS("color", "rgb(226, 232, 240)");
  2932 |   }
  2933 | });
  2934 | 
  2935 | test("shows the browser install action inside the mobile navigation menu", async ({ page }) => {
  2936 |   const plan = makeOrdinaryPlan();
  2937 |   await stubHomeApi(page, plan);
  2938 |   await seedPlans(page, [plan]);
  2939 |   await page.setViewportSize({ width: 390, height: 844 });
  2940 |   await page.goto("/");
  2941 | 
  2942 |   await page.locator(".launch-splash").waitFor({ state: "detached" }).catch(() => {});
  2943 |   await expect(page.getByTestId("dashboard-navigation-toggle")).toBeVisible();
  2944 |   await expect(page.getByTestId("install-app-menu-button")).toBeHidden();
  2945 |   await page.getByTestId("dashboard-navigation-toggle").click();
  2946 |   const navigationPanel = page.getByTestId("dashboard-navigation-panel");
  2947 |   const installButton = navigationPanel.getByTestId("install-app-menu-button");
  2948 |   await expect(installButton).toBeVisible();
  2949 | 
  2950 |   await page.evaluate(() => {
  2951 |     const promptEvent = new Event("beforeinstallprompt", { cancelable: true });
  2952 |     Object.assign(promptEvent, {
  2953 |       prompt: async () => {
  2954 |         (window as Window & { __installPromptCalled?: boolean }).__installPromptCalled = true;
  2955 |       },
  2956 |       userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
  2957 |     });
  2958 |     window.dispatchEvent(promptEvent);
  2959 |   });
```