# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> keeps the chart at Basecamp when every reading is unchecked
- Location: tests/e2e/mountain-rhythm.spec.ts:1957:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 7
+ Received  + 7

  Array [
-   248,
-   231,
-   235,
-   219,
-   223,
-   201,
-   190,
+   220,
+   207,
+   211,
+   195,
+   199,
+   181,
+   170,
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
            - generic [ref=e43]: 0.0%
            - generic [ref=e44]: 0 of 7 planned days
          - generic [ref=e46]:
            - generic [ref=e47]: Consistency
            - generic [ref=e48]: 100%
            - generic [ref=e49]: Steady consistency
        - generic [ref=e51]:
          - img "7-Day Climb reading-rhythm trail; current elevation 0%, journey progress 0%" [ref=e52]:
            - generic "Elevation guide lines" [ref=e60]
            - generic "Elevation level labels" [ref=e61]:
              - 'generic "Current stage: Basecamp, 0% threshold" [ref=e63]': Basecamp
              - 'generic "Next milestone: On the Trail, 25% threshold" [ref=e65]': On the Trail
              - 'generic "Milestone: Gaining Elevation, 50% threshold" [ref=e67]': GainingElevation
              - 'generic "Milestone: Ridgeline, 70% threshold" [ref=e69]': Ridgeline
              - 'generic "Milestone: Summit, 85% threshold" [ref=e71]': Summit
            - generic "Day 1, complete, readings missed, 0% current elevation, 0% earned ascent" [ref=e72]
            - generic "Day 2, future, readings future, 0% current elevation, 0% earned ascent" [ref=e73]
            - generic "Day 3, future, readings future, 0% current elevation, 0% earned ascent" [ref=e74]
            - generic "Day 4, future, readings future, 0% current elevation, 0% earned ascent" [ref=e75]
            - generic "Day 5, future, readings future, 0% current elevation, 0% earned ascent" [ref=e76]
            - generic "Day 6, future, readings future, 0% current elevation, 0% earned ascent" [ref=e77]
            - generic "Day 7, future, readings future, 0% current elevation, 0% earned ascent" [ref=e78]
            - generic [ref=e79]:
              - generic [ref=e80]: "1"
              - generic [ref=e82]: "2"
              - generic [ref=e84]: "3"
              - generic [ref=e86]: "4"
              - generic [ref=e88]: "5"
              - generic [ref=e90]: "6"
              - generic [ref=e92]: "7"
            - generic "Today's position at Basecamp" [ref=e94]:
              - generic "Current elevation 0%" [ref=e96]
              - generic [ref=e97]: Today
          - list "Elevation milestones" [ref=e98]:
            - listitem [ref=e99]: "Basecamp: 0%"
            - listitem [ref=e100]: "On the Trail: 25%"
            - listitem [ref=e101]: "Gaining Elevation: 50%"
            - listitem [ref=e102]: "Ridgeline: 70%"
            - listitem [ref=e103]: "Summit: 85%"
        - paragraph [ref=e104]:
          - text: "Current: Basecamp · Next: On the Trail"
          - generic [ref=e105]: "Current elevation: Basecamp · 0% · Today, Oct 21 · Day 1"
        - group [ref=e107]:
          - generic "How Mountain Rhythm works" [ref=e108] [cursor=pointer]
      - generic [ref=e110]:
        - generic [ref=e111]:
          - generic [ref=e112]:
            - generic [ref=e113]: Route to today
            - paragraph [ref=e118]: 7-Day Climb · future readings stay hidden until their day
          - generic [ref=e119]: 0/7 days
        - generic [ref=e120]:
          - generic [ref=e121]: Today’s next step
          - generic [ref=e122]:
            - generic [ref=e123]: Ready for today
            - generic [ref=e125]: 0% of today's reading complete
        - generic [ref=e127]:
          - generic [ref=e128]:
            - button "Collapse Day 1 readings, Oct 21, 2026, Next step, 2 readings, estimated reading time 6 min" [expanded] [ref=e129]:
              - generic [ref=e130]: "1"
              - generic [ref=e131]:
                - generic [ref=e132]:
                  - generic [ref=e133]: Oct 21, 2026
                  - generic [ref=e134]: Today
                - generic [ref=e135]:
                  - text: 2 readings ·
                  - 'generic "Estimated reading time: about 6 min" [ref=e136]': ≈ 6 min
                - generic [ref=e137]: Next step
            - button "Complete day" [ref=e143]
          - generic [ref=e144]:
            - button "Reading 1A" [ref=e145]
            - button "Reading 1B" [ref=e149]
      - group [ref=e153]:
        - generic "Optional commitments · Prayer and fasting" [ref=e154] [cursor=pointer]
```

# Test source

```ts
  1887 |   });
  1888 | });
  1889 | 
  1890 | test("keeps the Day 1 route entirely planned when no reading is complete", async ({ page }) => {
  1891 |   const today = new Date().toISOString().slice(0, 10);
  1892 |   const ownerId = "mountain-rhythm-day-one-owner";
  1893 |   const plan = makePlan({
  1894 |     id: "day-one-no-completion",
  1895 |     days: 7,
  1896 |     name: "7-Day Climb",
  1897 |     today,
  1898 |   });
  1899 | 
  1900 |   await stubApi(page, {
  1901 |     success: true,
  1902 |     userId: ownerId,
  1903 |     authenticated: false,
  1904 |     established: false,
  1905 |   });
  1906 |   await seedLocalData(page, [plan], plan.id, { ownerId });
  1907 |   await openMountainRhythm(page);
  1908 | 
  1909 |   const chart = page.getByTestId("mountain-rhythm-mountain");
  1910 |   await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("0 of 7");
  1911 |   await expect(chart.getByTestId("mountain-rhythm-earned-route")).toHaveCount(0);
  1912 |   await expect(chart.getByTestId("mountain-rhythm-day-path")).toHaveCount(0);
  1913 |   await expect(chart.getByTestId("mountain-rhythm-current-flag-label")).toHaveText("Today");
  1914 | });
  1915 | 
  1916 | test("highlights only the first completed day on Day 2 of a 1-of-7 climb", async ({ page }) => {
  1917 |   const today = new Date().toISOString().slice(0, 10);
  1918 |   const ownerId = "mountain-rhythm-day-two-owner";
  1919 |   const plan = makePlan({
  1920 |     id: "day-two-one-complete",
  1921 |     days: 7,
  1922 |     name: "7-Day Climb",
  1923 |     today,
  1924 |     startOffset: -1,
  1925 |     completedIndexes: [0],
  1926 |   });
  1927 | 
  1928 |   await stubApi(page, {
  1929 |     success: true,
  1930 |     userId: ownerId,
  1931 |     authenticated: false,
  1932 |     established: false,
  1933 |   });
  1934 |   await seedLocalData(page, [plan], plan.id, { ownerId });
  1935 |   await openMountainRhythm(page);
  1936 | 
  1937 |   const chart = page.getByTestId("mountain-rhythm-mountain");
  1938 |   await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("1 of 7");
  1939 |   const earnedRouteData = await chart
  1940 |     .getByTestId("mountain-rhythm-earned-route")
  1941 |     .getAttribute("d");
  1942 |   expect(earnedRouteData?.match(/M/g)).toHaveLength(1);
  1943 |   const todayPoint = await chart.getByTestId("mountain-rhythm-day-point-2").evaluate((point) => ({
  1944 |     x: Number(point.getAttribute("cx")),
  1945 |     y: Number(point.getAttribute("cy")),
  1946 |   }));
  1947 |   const completedRouteEndpoint = earnedRouteData?.match(/L([\d.]+) ([\d.]+)/);
  1948 |   expect(completedRouteEndpoint).not.toBeNull();
  1949 |   expect(Number(completedRouteEndpoint![1])).toBe(todayPoint.x);
  1950 |   expect(Number(completedRouteEndpoint![2])).toBeCloseTo(todayPoint.y, 1);
  1951 |   await expect(chart.getByTestId("mountain-rhythm-day-point-2")).toHaveAttribute(
  1952 |     "aria-label",
  1953 |     /Day 2, missed/,
  1954 |   );
  1955 | });
  1956 | 
  1957 | test("keeps the chart at Basecamp when every reading is unchecked", async ({ page }) => {
  1958 |   const today = new Date().toISOString().slice(0, 10);
  1959 |   const ownerId = "mountain-rhythm-visual-owner";
  1960 |   const plan = makePlan({
  1961 |     id: "stale-earned-history",
  1962 |     days: 7,
  1963 |     name: "7-Day Climb",
  1964 |     today,
  1965 |     completedIndexes: [],
  1966 |   });
  1967 |   const firstDay = plan.assignments[0].date;
  1968 |   plan.earnedDayKeys = [firstDay];
  1969 |   plan.dayCompletionDates = { [firstDay]: firstDay };
  1970 | 
  1971 |   await stubApi(page, {
  1972 |     success: true,
  1973 |     userId: ownerId,
  1974 |     authenticated: false,
  1975 |     established: false,
  1976 |   });
  1977 |   await seedLocalData(page, [plan], plan.id, { ownerId });
  1978 |   await openMountainRhythm(page);
  1979 | 
  1980 |   const pointY = await page
  1981 |     .getByTestId("mountain-rhythm-mountain")
  1982 |     .locator('[data-testid^="mountain-rhythm-day-point-"]')
  1983 |     .evaluateAll((points) =>
  1984 |       points.map((point) => Number(point.getAttribute("cy"))),
  1985 |     );
  1986 |   expect(pointY).toHaveLength(7);
> 1987 |   expect(pointY).toEqual([248, 231, 235, 219, 223, 201, 190]);
       |                  ^ Error: expect(received).toEqual(expected) // deep equality
  1988 |   await expect(page.getByTestId("mountain-rhythm-earned-route")).toHaveCount(0);
  1989 |   await expect(page.getByTestId("mountain-rhythm-current-status")).toContainText("Current elevation: Basecamp");
  1990 | });
  1991 | 
  1992 | test("repairs an oversized saved 7-Day Climb schedule", async ({ page }) => {
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
```