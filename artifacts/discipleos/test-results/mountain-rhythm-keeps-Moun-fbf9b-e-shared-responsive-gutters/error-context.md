# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> keeps Mountain Rhythm sections inside shared responsive gutters
- Location: tests/e2e/mountain-rhythm.spec.ts:2081:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('mountain-rhythm-route')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('mountain-rhythm-route')

```

```yaml
- button "Feedback"
- banner:
  - button "Back"
- main:
  - text: My Ascent
  - heading "Mountain Rhythm" [level=1]
  - paragraph: One clear route for Scripture consistency. Choose a structured climb, then take the next faithful step.
  - text: Mountain Rhythm Choose a 7-, 20-, or 40-day reading climb No current elevation yet
  - paragraph: Choose the 7-Day Climb to begin.
  - text: Step 1 of 3 · Choose your climb
  - paragraph: Choose one structured route. Your other reading plans remain unchanged.
  - button "7-Day Climb A focused week in Genesis. Select route"
  - button "20-Day Reset The four Gospels and Acts over 20 days. Currently locked. Locked" [disabled]
  - button "40-Day Climb A 40-day route from 1 Samuel through Nehemiah. Coming Later" [disabled]
  - button "Close"
  - button "Next" [disabled]
  - text: Choose a route above to see the full ascent, daily readings, milestones, and today's next step.
  - group: Optional commitments · Prayer and fasting
```

# Test source

```ts
  1993 |   const today = new Date().toISOString().slice(0, 10);
  1994 |   const malformedPlan = {
  1995 |     id: "malformed-seven-day",
  1996 |     name: "7-Day Climb",
  1997 |     journeyKey: "7-day-climb",
  1998 |     journeyType: "7-day-climb",
  1999 |     journeyDays: 7,
  2000 |     durationDays: 7,
  2001 |     totalDays: 7,
  2002 |     selectedBooks: ["Genesis"],
  2003 |     startDate: today,
  2004 |     endDate: addDays(today, 6),
  2005 |     assignments: Array.from({ length: 7 }, (_, dayIndex) => ({
  2006 |       date: addDays(today, dayIndex),
  2007 |       readings: Array.from({ length: dayIndex === 0 ? 38 : 37 }, (_, readingIndex) => ({
  2008 |         key: `Genesis-${dayIndex}-${readingIndex}`,
  2009 |         label: `Genesis ${dayIndex * 37 + readingIndex + 1}`,
  2010 |       })),
  2011 |     })),
  2012 |     completed: {
  2013 |       "Genesis-1": true,
  2014 |       "Genesis-50": true,
  2015 |     },
  2016 |   };
  2017 | 
  2018 |   await stubApi(page);
  2019 |   await seedLocalData(page, [malformedPlan], malformedPlan.id);
  2020 |   await openMountainRhythm(page);
  2021 | 
  2022 |   await expect.poll(async () => page.evaluate(() => {
  2023 |     const parsed = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
  2024 |     const plan = parsed.plans?.find((item: any) => item.id === "malformed-seven-day");
  2025 |     return {
  2026 |       assignmentCount: plan?.assignments?.length || 0,
  2027 |       readingCount: plan?.assignments?.flatMap((day: any) => day.readings || []).length || 0,
  2028 |       chapterCounts: plan?.assignments?.map((day: any) => day.readings?.length || 0) || [],
  2029 |       preservedCompletion: Boolean(plan?.completed?.["Genesis-1"]),
  2030 |     };
  2031 |   })).toEqual({
  2032 |     assignmentCount: 7,
  2033 |     readingCount: 50,
  2034 |     chapterCounts: [8, 7, 7, 7, 7, 7, 7],
  2035 |     preservedCompletion: true,
  2036 |   });
  2037 | });
  2038 | 
  2039 | test("does not offer a locked 20-Day Reset after the 7-Day Climb", async ({ page }) => {
  2040 |     const today = new Date().toISOString().slice(0, 10);
  2041 |     const completed = makePlan({
  2042 |       id: "completed-7-day-climb",
  2043 |       days: 7,
  2044 |       name: "7-Day Climb",
  2045 |       today,
  2046 |       completedIndexes: Array.from({ length: 7 }, (_, index) => index),
  2047 |     });
  2048 | 
  2049 |     await stubApi(page, {
  2050 |       success: true,
  2051 |       userId: "anonymous-completed-session",
  2052 |       authenticated: false,
  2053 |       established: false,
  2054 |     });
  2055 |     await seedLocalData(page, [completed], completed.id, {
  2056 |       ownerId: "anonymous-completed-session",
  2057 |     });
  2058 |     await openMountainRhythm(page);
  2059 | 
  2060 |     await expect(page.getByTestId("mountain-rhythm-complete")).toContainText("7-Day Climb complete");
  2061 |     await expect(page.getByTestId("completed-climb-7-day-climb")).toHaveCount(0);
  2062 |     await expandPastClimbs(page);
  2063 |     await expect(page.getByTestId("completed-climb-7-day-climb")).toContainText("100% journey progress");
  2064 |   await expect(page.getByTestId("mountain-rhythm-mountain")).toHaveCount(0);
  2065 |     await expect(page.getByTestId("button-start-next-20-day-reset")).toHaveCount(0);
  2066 |     await expect(page.getByTestId("button-choose-20-day-reset")).toBeDisabled();
  2067 |     await expect(page.getByTestId("button-choose-20-day-reset")).toContainText("Locked");
  2068 | });
  2069 | 
  2070 | test("keeps the unreleased 40-Day Climb unavailable", async ({ page }) => {
  2071 |   const ownerId = "unreleased-route-session";
  2072 |   await stubApi(page, { success: true, userId: ownerId, authenticated: false, established: false });
  2073 |   await seedLocalData(page, [], null, { ownerId });
  2074 |   await openMountainRhythm(page);
  2075 | 
  2076 |   const fortyDayChoice = page.getByTestId("button-choose-40-day-climb");
  2077 |   await expect(fortyDayChoice).toBeDisabled();
  2078 |   await expect(fortyDayChoice).toContainText("Coming Later");
  2079 | });
  2080 | 
  2081 | test("keeps Mountain Rhythm sections inside shared responsive gutters", async ({ page }) => {
  2082 |   await stubApi(page, {
  2083 |     success: true,
  2084 |     userId: "anonymous-gutter-session",
  2085 |     authenticated: false,
  2086 |     established: false,
  2087 |   });
  2088 |   await seedLocalData(page, [], null);
  2089 | 
  2090 |   for (const width of [360, 768, 1280]) {
  2091 |     await page.setViewportSize({ width, height: 900 });
  2092 |     await openMountainRhythm(page);
> 2093 |     await expect(page.getByTestId("mountain-rhythm-route")).toBeVisible();
       |                                                             ^ Error: expect(locator).toBeVisible() failed
  2094 | 
  2095 |     const layout = await page.evaluate(() => {
  2096 |       const testIds = [
  2097 |         "mountain-rhythm-panel",
  2098 |         "mountain-rhythm-choose",
  2099 |         "mountain-rhythm-route",
  2100 |       ];
  2101 |       return {
  2102 |         viewportWidth: window.innerWidth,
  2103 |         documentWidth: document.documentElement.scrollWidth,
  2104 |         surfaces: testIds.map((testId) => {
  2105 |           const element = document.querySelector(`[data-testid="${testId}"]`);
  2106 |           const rect = element?.getBoundingClientRect();
  2107 |           return {
  2108 |             testId,
  2109 |             left: rect ? Math.round(rect.left) : -1,
  2110 |             right: rect ? Math.round(rect.right) : Infinity,
  2111 |           };
  2112 |         }),
  2113 |       };
  2114 |     });
  2115 | 
  2116 |     expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  2117 |     for (const surface of layout.surfaces) {
  2118 |       expect(surface.left).toBeGreaterThanOrEqual(12);
  2119 |       expect(surface.right).toBeLessThanOrEqual(width - 12);
  2120 |     }
  2121 |   }
  2122 | });
  2123 | 
  2124 | for (const route of [
  2125 |   { kind: "7-day-climb", label: "7-Day Climb", days: 7 },
  2126 | ] as const) {
  2127 |   test(`keeps the authenticated ${route.label} selected after reload and hydration`, async ({
  2128 |     page,
  2129 |   }) => {
  2130 |     const persistedPlanName = route.label;
  2131 |     const ordinaryPlan = {
  2132 |       ...makePlan({
  2133 |         id: `ordinary-${route.kind}`,
  2134 |         days: 7,
  2135 |         name: "Ordinary reading plan",
  2136 |         today: new Date().toISOString().slice(0, 10),
  2137 |       }),
  2138 |       journeyKey: "custom",
  2139 |       journeyType: "custom",
  2140 |       updatedAt: "2026-09-01T12:00:00.000Z",
  2141 |     };
  2142 | 
  2143 |     await stubAuthenticatedApi(
  2144 |       page,
  2145 |       ordinaryPlan,
  2146 |       [],
  2147 |     );
  2148 |     await seedLocalData(
  2149 |       page,
  2150 |       [],
  2151 |       null,
  2152 |     );
  2153 |     await openMountainRhythm(page);
  2154 | 
  2155 |     const saveRequest = page.waitForRequest(
  2156 |       (request) =>
  2157 |         request.url().includes("/api/reading/plans") && request.method() === "POST",
  2158 |     );
  2159 |     await completeClimbSetup(page, route.kind);
  2160 |     const savedPlanRequest = await saveRequest;
  2161 |     expect(savedPlanRequest.postDataJSON()).toMatchObject({
  2162 |       journeyDays: route.days,
  2163 |       durationDays: route.days,
  2164 |       totalDays: route.days,
  2165 |       journeyKey: route.kind,
  2166 |       journeyType: route.kind,
  2167 |     });
  2168 | 
  2169 |     await expectDistinctMountainMetrics(page, route.label);
  2170 |     await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText(
  2171 |       `0 of ${route.days} planned days`,
  2172 |     );
  2173 |     await expect(
  2174 |       page.getByText(
  2175 |         new RegExp(`${persistedPlanName} · about \\d+ min/day · future readings stay hidden until their day`),
  2176 |       ),
  2177 |     ).toBeVisible();
  2178 |     await expect(page.getByTestId("route-day-1")).toBeVisible();
  2179 |     await expect(
  2180 |       page.getByTestId("route-day-estimated-reading-time-1"),
  2181 |     ).toHaveText(/≈ \d+ min/);
  2182 |     await expect(page.getByText("Ordinary reading plan", { exact: true })).toHaveCount(0);
  2183 | 
  2184 |     const metricValuesBeforeReload = await Promise.all(
  2185 |       ["today", "journey", "rhythm"].map((metric) =>
  2186 |         page.getByTestId(`mountain-rhythm-metric-${metric}`).innerText(),
  2187 |       ),
  2188 |     );
  2189 | 
  2190 |     await page.reload();
  2191 |     await openMountainRhythm(page);
  2192 |     await expectDistinctMountainMetrics(page, route.label);
  2193 |     await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText(
```