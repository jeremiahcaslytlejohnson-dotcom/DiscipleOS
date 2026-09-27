# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-polish.spec.ts >> keeps every desktop and tablet navigation control visible without overflow
- Location: tests/e2e/visual-polish.spec.ts:1994:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByTestId('dashboard-navigation-row')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('dashboard-navigation-row')
    14 × locator resolved to <div role="navigation" data-component-name="div" aria-label="Dashboard navigation" data-testid="dashboard-navigation-row" data-replit-metadata="artifacts/discipleos/src/pages/Home.tsx:4153:10" class="hidden w-full max-w-full flex-wrap items-center justify-center gap-1 overflow-visible md:mx-auto md:flex lg:gap-2">…</div>
       - unexpected value "hidden"

```

```yaml
- button "Feedback"
- heading "DISCIPLEOS" [level=1]
- link "Continue with email":
  - /url: /sign-in
- paragraph: Today’s reading · keep taking the next faithful step
- text: Verse of the day “Blessed is the one who walks not in step with the wicked.” Psalm 1:1
- button "Today’s Reading 0 of 1 chapters complete" [expanded]
- text: Today’s completion 0 of 1 chapters complete ~1m estimated reading
- button "Open day view"
- text: Morning Psalms 1 reading · ~1m
- button "Complete day"
- button "Open plan"
- button "Psalm 1 Reading~1m"
- button "Today’s Activities" [expanded]
- text: prayer
- button "Complete activity"
- button "Edit Morning prayer"
- text: Morning prayer 6:30 AM today A quiet start
- button "Progress Ordinary reading plans"
- button "Mountain Rhythm Long-term climb progress"
- link "Details":
  - /url: /mountain-rhythm
```

# Test source

```ts
  1904 |       const navigation = await openDashboardNavigation(page);
  1905 |       await navigation.getByRole("button", { name: tab, exact: true }).click();
  1906 | 
  1907 |       const contentTestIds = tab === "Calendar"
  1908 |         ? ["dashboard-calendar-activities", "dashboard-calendar-month"]
  1909 |         : ["dashboard-plans-list", "dashboard-plan-details"];
  1910 |       for (const testId of contentTestIds) {
  1911 |         await expect(page.getByTestId(testId)).toBeVisible();
  1912 |       }
  1913 | 
  1914 |       const layout = await page.evaluate((testIds) => {
  1915 |         const surfaces = testIds.map((testId) => {
  1916 |           const element = document.querySelector(`[data-testid="${testId}"]`);
  1917 |           const rect = element?.getBoundingClientRect();
  1918 |           const styles = element ? getComputedStyle(element) : null;
  1919 |           return {
  1920 |             testId,
  1921 |             left: rect ? Math.round(rect.left) : -1,
  1922 |             right: rect ? Math.round(rect.right) : Infinity,
  1923 |             border: styles?.borderTopWidth || "",
  1924 |             background: styles?.backgroundColor || "",
  1925 |           };
  1926 |         });
  1927 |         return {
  1928 |           viewportWidth: window.innerWidth,
  1929 |           documentWidth: document.documentElement.scrollWidth,
  1930 |           surfaces,
  1931 |         };
  1932 |       }, contentTestIds);
  1933 | 
  1934 |       expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  1935 |       for (const surface of layout.surfaces) {
  1936 |         expect(surface.left).toBeGreaterThanOrEqual(12);
  1937 |         expect(surface.right).toBeLessThanOrEqual(width - 12);
  1938 |         expect(surface.border).toBe("1px");
  1939 |         expect(surface.background).not.toBe("rgba(0, 0, 0, 0)");
  1940 |       }
  1941 | 
  1942 |       if (tab === "Calendar") {
  1943 |         await expect(page.getByTestId("calendar-event-form").locator(".discipleos-functional-surface")).toHaveCount(0);
  1944 |       }
  1945 |     }
  1946 |   }
  1947 | });
  1948 | 
  1949 | test("shows one contained empty Plans state without an abandoned detail column", async ({ page }) => {
  1950 |   await stubHomeApi(page, []);
  1951 |   await seedPlans(page, []);
  1952 | 
  1953 |   for (const width of [360, 1280]) {
  1954 |     await page.setViewportSize({ width, height: 900 });
  1955 |     await page.goto("/");
  1956 | 
  1957 |     const navigation = await openDashboardNavigation(page);
  1958 |     await navigation.getByRole("button", { name: "Plans", exact: true }).click();
  1959 | 
  1960 |     const emptyState = page.getByTestId("dashboard-plans-empty-state");
  1961 |     await expect(emptyState).toHaveCount(1);
  1962 |     await expect(emptyState.getByText("No reading plans yet.", { exact: true })).toHaveCount(1);
  1963 |     await expect(page.getByText("No reading plan selected yet", { exact: false })).toHaveCount(0);
  1964 |     await expect(page.getByTestId("dashboard-plan-details")).toHaveCount(0);
  1965 |     await expect(page.getByTestId("plans-empty-create-button")).toBeVisible();
  1966 | 
  1967 |     const layout = await page.evaluate(() => {
  1968 |       const empty = document.querySelector('[data-testid="dashboard-plans-empty-state"]');
  1969 |       const list = document.querySelector('[data-testid="dashboard-plans-list"]');
  1970 |       const emptyRect = empty?.getBoundingClientRect();
  1971 |       const listRect = list?.getBoundingClientRect();
  1972 |       return {
  1973 |         viewportWidth: window.innerWidth,
  1974 |         documentWidth: document.documentElement.scrollWidth,
  1975 |         empty: emptyRect
  1976 |           ? { left: emptyRect.left, right: emptyRect.right, height: emptyRect.height }
  1977 |           : null,
  1978 |         list: listRect ? { left: listRect.left, right: listRect.right } : null,
  1979 |       };
  1980 |     });
  1981 |     expect(layout.documentWidth).toBeLessThanOrEqual(width + 1);
  1982 |     expect(layout.empty?.left ?? -1).toBeGreaterThanOrEqual(12);
  1983 |     expect(layout.empty?.right ?? Infinity).toBeLessThanOrEqual(width - 12);
  1984 |     expect(layout.empty?.height ?? 0).toBeGreaterThan(80);
  1985 |     expect(layout.empty?.height ?? Infinity).toBeLessThan(260);
  1986 |     expect(layout.list?.left ?? -1).toBeGreaterThanOrEqual(12);
  1987 |     expect(layout.list?.right ?? Infinity).toBeLessThanOrEqual(width - 12);
  1988 | 
  1989 |     await page.getByTestId("plans-empty-create-button").click();
  1990 |     await expect(page.getByTestId("dashboard-build-form")).toBeVisible();
  1991 |   }
  1992 | });
  1993 | 
  1994 | test("keeps every desktop and tablet navigation control visible without overflow", async ({ page }) => {
  1995 |   const plan = makeOrdinaryPlan();
  1996 |   await stubHomeApi(page, plan);
  1997 |   await seedPlans(page, [plan]);
  1998 | 
  1999 |   for (const width of [1024, 1280, 1366, 1440]) {
  2000 |     await page.setViewportSize({ width, height: 900 });
  2001 |     await page.goto("/");
  2002 | 
  2003 |     const navigation = page.getByTestId("dashboard-navigation-row");
> 2004 |     await expect(navigation).toBeVisible();
       |                              ^ Error: expect(locator).toBeVisible() failed
  2005 |     await expect(navigation.getByRole("button", { name: "Today", exact: true })).toBeVisible();
  2006 |     const layout = await navigation.evaluate((element) => {
  2007 |       const rect = element.getBoundingClientRect();
  2008 |       const controls = Array.from(
  2009 |         element.querySelectorAll<HTMLElement>(
  2010 |           'button[aria-pressed], a[data-testid="link-mountain-rhythm-entry"], button:not([aria-pressed])',
  2011 |         ),
  2012 |       ).filter((control) => {
  2013 |         const rect = control.getBoundingClientRect();
  2014 |         const styles = getComputedStyle(control);
  2015 |         return rect.width > 0 && rect.height > 0 && styles.visibility !== "hidden" && styles.display !== "none";
  2016 |       }).map((control) => {
  2017 |         const controlRect = control.getBoundingClientRect();
  2018 |         const textRect = document.createRange();
  2019 |         textRect.selectNodeContents(control);
  2020 |         const textBounds = Array.from(textRect.getClientRects()).filter(
  2021 |           ({ width: textWidth, height: textHeight }) => textWidth > 0 && textHeight > 0,
  2022 |         );
  2023 |         return {
  2024 |           label: control.textContent?.trim(),
  2025 |           left: controlRect.left,
  2026 |           right: controlRect.right,
  2027 |           height: controlRect.height,
  2028 |           textRight: Math.max(...textBounds.map(({ right }) => right)),
  2029 |           controlRight: controlRect.right,
  2030 |         };
  2031 |       });
  2032 |       return {
  2033 |         viewportWidth: window.innerWidth,
  2034 |         documentWidth: document.documentElement.scrollWidth,
  2035 |         rowLeft: rect.left,
  2036 |         rowRight: rect.right,
  2037 |         rowScrollWidth: element.scrollWidth,
  2038 |         rowClientWidth: element.clientWidth,
  2039 |         overflowX: getComputedStyle(element).overflowX,
  2040 |         controls,
  2041 |       };
  2042 |     });
  2043 |     expect(layout.documentWidth).toBeLessThanOrEqual(width + 1);
  2044 |     expect(layout.rowLeft).toBeGreaterThanOrEqual(0);
  2045 |     expect(layout.rowRight).toBeLessThanOrEqual(width);
  2046 |     expect(layout.rowScrollWidth).toBeLessThanOrEqual(layout.rowClientWidth + 1);
  2047 |     expect(layout.overflowX).not.toMatch(/auto|scroll/);
  2048 |     expect(layout.controls).toHaveLength(6);
  2049 |     for (const control of layout.controls) {
  2050 |       expect(control.left).toBeGreaterThanOrEqual(layout.rowLeft - 1);
  2051 |       expect(control.right).toBeLessThanOrEqual(layout.rowRight + 1);
  2052 |       expect(control.height).toBeGreaterThanOrEqual(44);
  2053 |       expect(control.textRight).toBeLessThanOrEqual(control.controlRight + 1);
  2054 |     }
  2055 |   }
  2056 | });
  2057 | 
  2058 | test("keeps long content inset and fully visible across responsive dashboard widths", async ({ page }) => {
  2059 |   const longPlanName = "A very long morning Scripture plan that should wrap instead of clipping";
  2060 |   const longReadingLabel = "Psalm 119:105 — a long assigned reading label that should remain readable";
  2061 |   const longEventTitle = "A long prayer and fellowship event title that should wrap inside the calendar row";
  2062 |   const longEventNotes = "A longer note with enough words to expose fixed-width children and unintended horizontal overflow.";
  2063 |   const plan = makeOrdinaryPlan("visual-inset-plan", longPlanName);
  2064 |   plan.assignments[0].readings[0].label = longReadingLabel;
  2065 |   const event = {
  2066 |     id: "visual-inset-event",
  2067 |     title: longEventTitle,
  2068 |     type: "prayer",
  2069 |     date: todayISO(),
  2070 |     time: "06:30",
  2071 |     notes: longEventNotes,
  2072 |     remind: false,
  2073 |     repeat: "none",
  2074 |   };
  2075 | 
  2076 |   await stubHomeApi(page, plan, [event]);
  2077 |   await seedPlans(page, [plan], [event]);
  2078 | 
  2079 |   for (const width of [320, 360, 390, 430, 768, 1024, 1280]) {
  2080 |     await page.setViewportSize({ width, height: 900 });
  2081 |     await page.goto("/");
  2082 |     const assigned = page.getByTestId("dashboard-assigned-reading");
  2083 |     const assignedToggle = assigned.getByRole("button", { name: /Today’s Reading/ });
  2084 |     if (await assignedToggle.getAttribute("aria-expanded") !== "true") {
  2085 |       await assignedToggle.click();
  2086 |     }
  2087 |     await expect(assignedToggle).toHaveAttribute("aria-expanded", "true");
  2088 |     await expect(assigned.getByTestId("dashboard-assigned-reading-overview")).toBeVisible();
  2089 |     await expect(assigned.getByText(longPlanName, { exact: true })).toBeVisible();
  2090 | 
  2091 |     const homeLayout = await page.evaluate(() => {
  2092 |       const viewport = window.innerWidth;
  2093 |       const safeText = Array.from(document.querySelectorAll(".discipleos-safe-text"))
  2094 |         .filter((element) => {
  2095 |           const rect = element.getBoundingClientRect();
  2096 |           return rect.width > 0 && rect.height > 0;
  2097 |         })
  2098 |         .map((element) => {
  2099 |           const rect = element.getBoundingClientRect();
  2100 |           return {
  2101 |             left: rect.left,
  2102 |             right: rect.right,
  2103 |             scrollWidth: element.scrollWidth,
  2104 |             clientWidth: element.clientWidth,
```