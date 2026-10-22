# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: reading-completion-sync.spec.ts >> same-owner plan snapshot keeps Mountain Rhythm, Home, and the selected Calendar day aligned
- Location: tests/e2e/reading-completion-sync.spec.ts:904:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: getByTestId('dashboard-progress-selected-plan')
Expected: "Mountain Rhythm · Synthetic 7-Day Climb"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for getByTestId('dashboard-progress-selected-plan')

```

```yaml
- button "Feedback"
- heading "DISCIPLEOS" [level=1]
- text: fixture
- link "Open settings":
  - /url: /settings
- button "Sign out"
- navigation "Dashboard navigation":
  - button "Today" [pressed]
  - button "Calendar"
  - button "Plans"
  - button "Install App"
  - button "Notifications blocked"
- text: Verse of the day “Thy word is a lamp unto my feet, and a light unto my path.” Psalm 119:105
- button "Today’s Reading 1 of 1 chapters complete · 1 plan today · 2 min scheduled" [expanded]
- button "Open day view"
- text: Synthetic 7-Day Climb 1 reading · ≈ 2 min
- button "Day complete" [disabled]
- button "Open plan"
- 'button "Synthetic reading 5 Chapter 5Estimated reading time: about 2 min" [pressed]': Synthetic reading 5 Chapter 5≈ 2 min
- button "Today’s Activities No activities scheduled today"
- button "Progress" [expanded]
- text: "Next reading · Oct 23, 2026: Synthetic reading 6"
```

# Test source

```ts
  830 |   try {
  831 |     await stubAuthenticatedPlanApi(homePage, ownerId, () => [], () => [makeFutureSyntheticEvent()]);
  832 |     await homePage.goto("/");
  833 |     await homePage.getByTestId("dashboard-progress")
  834 |       .getByRole("button", { name: /^Progress/ }).click();
  835 |     await expect(homePage.getByTestId("dashboard-progress-empty")).toBeVisible();
  836 | 
  837 |     await homePage.getByTestId("dashboard-navigation-row")
  838 |       .getByRole("button", { name: "Calendar", exact: true })
  839 |       .click();
  840 |     await expect(homePage.getByText("No activities for this day yet.")).toBeVisible();
  841 |     await expect(homePage.locator('[data-testid^="calendar-plan-item-"]')).toHaveCount(0);
  842 | 
  843 |     await expect.poll(() => homePage.evaluate(() => {
  844 |       const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
  845 |       return data.plans?.length || 0;
  846 |     })).toBe(0);
  847 |     // The already-mounted Mountain Rhythm tab has no storage/focus refresh listener.
  848 |     await expect(journeyMetric).toContainText("5 of 7 planned days");
  849 |   } finally {
  850 |     await homePage.close();
  851 |   }
  852 | });
  853 | 
  854 | test("sequential same-tab navigation remounts Mountain Rhythm against the new empty server snapshot", async ({
  855 |   page,
  856 | }) => {
  857 |   const ownerId = "synthetic-climb-owner";
  858 |   const plan = makeFiveOfSevenClimb();
  859 |   const futureEvent = makeFutureSyntheticEvent();
  860 |   let homeSnapshotObserved = false;
  861 |   await page.addInitScript(({ ownerId, plan }) => {
  862 |     localStorage.setItem("discipleos-data", JSON.stringify({
  863 |       ownerId,
  864 |       plans: [plan],
  865 |       events: [],
  866 |       eventCompletions: {},
  867 |       selectedPlanId: plan.id,
  868 |     }));
  869 |   }, { ownerId, plan });
  870 |   await stubAuthenticatedPlanApi(
  871 |     page,
  872 |     ownerId,
  873 |     () => {
  874 |       if (new URL(page.url()).pathname === "/") homeSnapshotObserved = true;
  875 |       return homeSnapshotObserved ? [] : [plan];
  876 |     },
  877 |     () => [futureEvent],
  878 |   );
  879 | 
  880 |   await page.goto("/mountain-rhythm");
  881 |   const journeyMetric = page.getByTestId("mountain-rhythm-metric-journey");
  882 |   await expect(journeyMetric).toContainText("71.4%");
  883 |   await expect(journeyMetric).toContainText("5 of 7 planned days");
  884 | 
  885 |   await page.goto("/");
  886 |   await page.getByTestId("dashboard-progress")
  887 |     .getByRole("button", { name: /^Progress/ }).click();
  888 |   await expect(page.getByTestId("dashboard-progress-empty")).toBeVisible();
  889 |   await page.getByTestId("dashboard-navigation-row")
  890 |     .getByRole("button", { name: "Calendar", exact: true })
  891 |     .click();
  892 |   await expect(page.getByText("No activities for this day yet.")).toBeVisible();
  893 |   await expect(page.locator('[data-testid^="calendar-plan-item-"]')).toHaveCount(0);
  894 | 
  895 |   await page.goto("/mountain-rhythm");
  896 |   await expect(page.getByTestId("route-day-1")).toHaveCount(0);
  897 |   await expect(page.getByTestId("mountain-rhythm-metric-journey")).toHaveCount(0);
  898 |   await expect.poll(() => page.evaluate(() => {
  899 |     const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
  900 |     return data.plans?.length || 0;
  901 |   })).toBe(0);
  902 | });
  903 | 
  904 | test("same-owner plan snapshot keeps Mountain Rhythm, Home, and the selected Calendar day aligned", async ({
  905 |   page,
  906 | }) => {
  907 |   const ownerId = "synthetic-climb-owner";
  908 |   const plan = makeFiveOfSevenClimb();
  909 |   await page.addInitScript(({ ownerId, plan }) => {
  910 |     localStorage.setItem("discipleos-data", JSON.stringify({
  911 |       ownerId,
  912 |       plans: [plan],
  913 |       events: [],
  914 |       eventCompletions: {},
  915 |       selectedPlanId: plan.id,
  916 |     }));
  917 |   }, { ownerId, plan });
  918 |   await stubAuthenticatedPlanApi(page, ownerId, () => [plan]);
  919 | 
  920 |   await page.goto("/mountain-rhythm");
  921 |   await expect(page.getByTestId("mountain-rhythm-metric-journey"))
  922 |     .toContainText("5 of 7 planned days");
  923 |   await expect(page.getByTestId("mountain-rhythm-metric-today")).toContainText("Complete");
  924 | 
  925 |   await page.goto("/");
  926 |   await page.getByTestId("dashboard-progress")
  927 |     .getByRole("button", { name: /^Progress/ }).click();
  928 |   await expect(page.getByTestId("dashboard-progress-plan-choices")).toHaveCount(0);
  929 |   await expect(page.getByTestId("dashboard-progress-selected-plan"))
> 930 |     .toHaveText("Mountain Rhythm · Synthetic 7-Day Climb");
      |      ^ Error: expect(locator).toHaveText(expected) failed
  931 |   await expect(page.getByTestId("dashboard-progress-percent")).toContainText("71.4%");
  932 |   await expect(page.getByTestId("dashboard-progress-detail"))
  933 |     .not.toContainText("Today’s climb complete");
  934 |   await expect(page.getByTestId(`today-complete-day-${plan.id}`))
  935 |     .toContainText("Day complete");
  936 | 
  937 |   await page.getByTestId("dashboard-navigation-row")
  938 |     .getByRole("button", { name: "Calendar", exact: true })
  939 |     .click();
  940 |   await page.getByTestId(`calendar-day-${todayISO()}`).click();
  941 |   await expect(page.getByTestId(`calendar-plan-item-${plan.id}`)).toBeVisible();
  942 |   await expect(page.getByTestId("calendar-items-list"))
  943 |     .toContainText("Synthetic reading 5");
  944 | 
  945 |   await page.goto("/mountain-rhythm");
  946 |   await expect(page.getByTestId("mountain-rhythm-metric-journey"))
  947 |     .toContainText("5 of 7 planned days");
  948 |   await expect(page.getByTestId("mountain-rhythm-metric-today")).toContainText("Complete");
  949 | });
  950 | 
```