# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-polish.spec.ts >> shows the browser install action inside the mobile navigation menu
- Location: tests/e2e/visual-polish.spec.ts:2018:1

# Error details

```
TypeError: expect(...).toContainElement is not a function
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - button "Feedback" [ref=e3] [cursor=pointer]:
    - generic [ref=e4]: ✦
    - text: Feedback
  - generic [ref=e6]:
    - generic [ref=e7]:
      - generic [ref=e8]:
        - heading "DISCIPLEOS" [level=1] [ref=e9]
        - link "Continue with email" [ref=e10] [cursor=pointer]:
          - /url: /sign-in
      - paragraph [ref=e12]: Today’s reading · keep taking the next faithful step
    - generic [ref=e13]:
      - button "Close menu" [expanded] [active] [ref=e15]
      - navigation "Dashboard navigation" [ref=e20]:
        - generic [ref=e21]:
          - button "Today" [pressed] [ref=e22]
          - button "Calendar" [ref=e29]
          - button "Plans" [ref=e33]
          - link "Mountain Rhythm" [ref=e37] [cursor=pointer]:
            - /url: /mountain-rhythm
          - generic [ref=e41]:
            - generic [ref=e42]: Setup
            - generic [ref=e46]:
              - button "Install App" [ref=e47]
              - button "Notifications blocked" [ref=e51]
    - generic [ref=e55]:
      - generic [ref=e58]:
        - generic [ref=e59]: Verse of the day
        - generic [ref=e60]: “Blessed is the one who walks not in step with the wicked.”
        - generic [ref=e61]: Psalm 1:1
      - generic [ref=e62]:
        - button "Today’s Reading 0 of 1 chapters complete" [expanded] [ref=e64]:
          - generic [ref=e68]:
            - generic [ref=e69]: Today’s Reading
            - generic [ref=e70]: 0 of 1 chapters complete
        - generic [ref=e73]:
          - generic [ref=e74]:
            - generic [ref=e75]:
              - generic [ref=e76]: Today’s completion
              - generic [ref=e77]: 0 of 1 chapters complete
              - generic [ref=e78]: ~1m estimated reading
            - button "Open day view" [ref=e79]
          - generic [ref=e80]:
            - generic [ref=e81]:
              - generic [ref=e82]:
                - generic [ref=e83]: Morning Psalms
                - generic [ref=e84]: 1 reading · ~1m
              - generic [ref=e85]:
                - button "Complete day" [ref=e86]
                - button "Open plan" [ref=e87]
            - button "Psalm 1 Reading~1m" [ref=e91]:
              - generic [ref=e92]:
                - generic [ref=e93]: Psalm 1
                - generic [ref=e94]:
                  - text: Reading
                  - generic [ref=e95]: ~1m
      - generic [ref=e98]:
        - button "Today’s Activities" [expanded] [ref=e100]
        - generic [ref=e110]:
          - generic [ref=e111]:
            - generic [ref=e112]: prayer
            - generic [ref=e113]:
              - button "Complete activity" [ref=e114]
              - button "Edit Morning prayer" [ref=e117]
          - generic [ref=e121]: Morning prayer
          - generic [ref=e122]: 6:30 AM today
          - generic [ref=e123]: A quiet start
      - button "Progress Ordinary reading plans" [ref=e126]:
        - generic [ref=e130]:
          - generic [ref=e131]: Progress
          - generic [ref=e132]: Ordinary reading plans
      - generic [ref=e136]:
        - button "Mountain Rhythm Long-term climb progress" [ref=e137]:
          - generic [ref=e141]:
            - generic [ref=e142]: Mountain Rhythm
            - generic [ref=e143]: Long-term climb progress
        - link "Details" [ref=e146] [cursor=pointer]:
          - /url: /mountain-rhythm
```

# Test source

```ts
  1931 |       const contentTestIds = tab === "Calendar"
  1932 |         ? ["dashboard-calendar-activities", "dashboard-calendar-month"]
  1933 |         : ["dashboard-plans-list", "dashboard-plan-details"];
  1934 |       for (const testId of contentTestIds) {
  1935 |         await expect(page.getByTestId(testId)).toBeVisible();
  1936 |       }
  1937 | 
  1938 |       const layout = await page.evaluate((testIds) => {
  1939 |         const surfaces = testIds.map((testId) => {
  1940 |           const element = document.querySelector(`[data-testid="${testId}"]`);
  1941 |           const rect = element?.getBoundingClientRect();
  1942 |           const styles = element ? getComputedStyle(element) : null;
  1943 |           return {
  1944 |             testId,
  1945 |             left: rect ? Math.round(rect.left) : -1,
  1946 |             right: rect ? Math.round(rect.right) : Infinity,
  1947 |             border: styles?.borderTopWidth || "",
  1948 |             background: styles?.backgroundColor || "",
  1949 |           };
  1950 |         });
  1951 |         return {
  1952 |           viewportWidth: window.innerWidth,
  1953 |           documentWidth: document.documentElement.scrollWidth,
  1954 |           surfaces,
  1955 |         };
  1956 |       }, contentTestIds);
  1957 | 
  1958 |       expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  1959 |       for (const surface of layout.surfaces) {
  1960 |         expect(surface.left).toBeGreaterThanOrEqual(12);
  1961 |         expect(surface.right).toBeLessThanOrEqual(width - 12);
  1962 |         expect(surface.border).toBe("1px");
  1963 |         expect(surface.background).not.toBe("rgba(0, 0, 0, 0)");
  1964 |       }
  1965 | 
  1966 |       if (tab === "Calendar") {
  1967 |         await expect(page.getByTestId("calendar-event-form").locator(".discipleos-functional-surface")).toHaveCount(0);
  1968 |       }
  1969 |     }
  1970 |   }
  1971 | });
  1972 | 
  1973 | test("shows one contained empty Plans state without an abandoned detail column", async ({ page }) => {
  1974 |   await stubHomeApi(page, []);
  1975 |   await seedPlans(page, []);
  1976 | 
  1977 |   for (const width of [360, 1280]) {
  1978 |     await page.setViewportSize({ width, height: 900 });
  1979 |     await page.goto("/");
  1980 | 
  1981 |     const navigation = await openDashboardNavigation(page);
  1982 |     await navigation.getByRole("button", { name: "Plans", exact: true }).click();
  1983 | 
  1984 |     const emptyState = page.getByTestId("dashboard-plans-empty-state");
  1985 |     await expect(emptyState).toHaveCount(1);
  1986 |     await expect(emptyState.getByText("No reading plans yet.", { exact: true })).toHaveCount(1);
  1987 |     await expect(page.getByText("No reading plan selected yet", { exact: false })).toHaveCount(0);
  1988 |     await expect(page.getByTestId("dashboard-plan-details")).toHaveCount(0);
  1989 |     await expect(page.getByTestId("plans-empty-create-button")).toBeVisible();
  1990 | 
  1991 |     const layout = await page.evaluate(() => {
  1992 |       const empty = document.querySelector('[data-testid="dashboard-plans-empty-state"]');
  1993 |       const list = document.querySelector('[data-testid="dashboard-plans-list"]');
  1994 |       const emptyRect = empty?.getBoundingClientRect();
  1995 |       const listRect = list?.getBoundingClientRect();
  1996 |       return {
  1997 |         viewportWidth: window.innerWidth,
  1998 |         documentWidth: document.documentElement.scrollWidth,
  1999 |         empty: emptyRect
  2000 |           ? { left: emptyRect.left, right: emptyRect.right, height: emptyRect.height }
  2001 |           : null,
  2002 |         list: listRect ? { left: listRect.left, right: listRect.right } : null,
  2003 |       };
  2004 |     });
  2005 |     expect(layout.documentWidth).toBeLessThanOrEqual(width + 1);
  2006 |     expect(layout.empty?.left ?? -1).toBeGreaterThanOrEqual(12);
  2007 |     expect(layout.empty?.right ?? Infinity).toBeLessThanOrEqual(width - 12);
  2008 |     expect(layout.empty?.height ?? 0).toBeGreaterThan(80);
  2009 |     expect(layout.empty?.height ?? Infinity).toBeLessThan(260);
  2010 |     expect(layout.list?.left ?? -1).toBeGreaterThanOrEqual(12);
  2011 |     expect(layout.list?.right ?? Infinity).toBeLessThanOrEqual(width - 12);
  2012 | 
  2013 |     await page.getByTestId("plans-empty-create-button").click();
  2014 |     await expect(page.getByTestId("dashboard-build-form")).toBeVisible();
  2015 |   }
  2016 | });
  2017 | 
  2018 | test("shows the browser install action inside the mobile navigation menu", async ({ page }) => {
  2019 |   const plan = makeOrdinaryPlan();
  2020 |   await stubHomeApi(page, plan);
  2021 |   await seedPlans(page, [plan]);
  2022 |   await page.setViewportSize({ width: 390, height: 844 });
  2023 |   await page.goto("/");
  2024 | 
  2025 |   await page.locator(".launch-splash").waitFor({ state: "detached" }).catch(() => {});
  2026 |   await expect(page.getByTestId("dashboard-navigation-toggle")).toBeVisible();
  2027 |   await expect(page.getByTestId("install-app-menu-button")).toBeHidden();
  2028 |   await page.getByTestId("dashboard-navigation-toggle").click();
  2029 |   const installButton = page.getByTestId("install-app-menu-button");
  2030 |   await expect(installButton).toBeVisible();
> 2031 |   await expect(page.getByTestId("dashboard-navigation-panel")).toContainElement(installButton);
       |                                                                ^ TypeError: expect(...).toContainElement is not a function
  2032 | 
  2033 |   await page.evaluate(() => {
  2034 |     const promptEvent = new Event("beforeinstallprompt", { cancelable: true });
  2035 |     Object.assign(promptEvent, {
  2036 |       prompt: async () => {
  2037 |         (window as Window & { __installPromptCalled?: boolean }).__installPromptCalled = true;
  2038 |       },
  2039 |       userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
  2040 |     });
  2041 |     window.dispatchEvent(promptEvent);
  2042 |   });
  2043 | 
  2044 |   await installButton.click();
  2045 |   await expect
  2046 |     .poll(() =>
  2047 |       page.evaluate(
  2048 |         () => (window as Window & { __installPromptCalled?: boolean }).__installPromptCalled,
  2049 |       ),
  2050 |     )
  2051 |     .toBe(true);
  2052 | });
  2053 | 
  2054 | test("does not reuse a dismissed install prompt from the hidden responsive button", async ({ page }) => {
  2055 |   const plan = makeOrdinaryPlan();
  2056 |   await stubHomeApi(page, plan);
  2057 |   await seedPlans(page, [plan]);
  2058 |   await page.setViewportSize({ width: 390, height: 844 });
  2059 |   await page.goto("/");
  2060 | 
  2061 |   await page.locator(".launch-splash").waitFor({ state: "detached" }).catch(() => {});
  2062 |   await page.getByTestId("dashboard-navigation-toggle").click();
  2063 |   const mobileInstallButton = page.getByTestId("install-app-menu-button");
  2064 |   await expect(mobileInstallButton).toBeVisible();
  2065 | 
  2066 |   await page.evaluate(() => {
  2067 |     (window as Window & { __installPromptCalls?: number }).__installPromptCalls = 0;
  2068 |     const promptEvent = new Event("beforeinstallprompt", { cancelable: true });
  2069 |     Object.assign(promptEvent, {
  2070 |       prompt: async () => {
  2071 |         const target = window as Window & { __installPromptCalls?: number };
  2072 |         target.__installPromptCalls = (target.__installPromptCalls || 0) + 1;
  2073 |       },
  2074 |       userChoice: Promise.resolve({ outcome: "dismissed", platform: "web" }),
  2075 |     });
  2076 |     window.dispatchEvent(promptEvent);
  2077 |   });
  2078 | 
  2079 |   await mobileInstallButton.click();
  2080 |   await expect(mobileInstallButton).toHaveText("Install App");
  2081 | 
  2082 |   await page.setViewportSize({ width: 1024, height: 900 });
  2083 |   const desktopInstallButton = page.getByTestId("install-app-desktop-button");
  2084 |   await expect(desktopInstallButton).toBeVisible();
  2085 | 
  2086 |   let fallbackDialogMessage = "";
  2087 |   page.once("dialog", async (dialog) => {
  2088 |     fallbackDialogMessage = dialog.message();
  2089 |     await dialog.dismiss();
  2090 |   });
  2091 |   await desktopInstallButton.click();
  2092 | 
  2093 |   await expect
  2094 |     .poll(() =>
  2095 |       page.evaluate(
  2096 |         () => (window as Window & { __installPromptCalls?: number }).__installPromptCalls,
  2097 |       ),
  2098 |     )
  2099 |     .toBe(1);
  2100 |   expect(fallbackDialogMessage).toContain("Install isn’t available yet");
  2101 | });
  2102 | 
  2103 | test("keeps every desktop and tablet navigation control visible without overflow", async ({ page }) => {
  2104 |   const plan = makeOrdinaryPlan();
  2105 |   await stubHomeApi(page, plan);
  2106 |   await seedPlans(page, [plan]);
  2107 | 
  2108 |   for (const width of [1024, 1280, 1366, 1440]) {
  2109 |     await page.setViewportSize({ width, height: 900 });
  2110 |     await page.goto("/");
  2111 | 
  2112 |     const navigation = page.getByTestId("dashboard-navigation-row");
  2113 |     await expect(navigation).toBeVisible();
  2114 |     await expect(navigation.getByRole("button", { name: "Today", exact: true })).toBeVisible();
  2115 |     const layout = await navigation.evaluate((element) => {
  2116 |       const rect = element.getBoundingClientRect();
  2117 |       const controls = Array.from(
  2118 |         element.querySelectorAll<HTMLElement>(
  2119 |           'button[aria-pressed], a[data-testid="link-mountain-rhythm-entry"], button:not([aria-pressed])',
  2120 |         ),
  2121 |       ).filter((control) => {
  2122 |         const rect = control.getBoundingClientRect();
  2123 |         const styles = getComputedStyle(control);
  2124 |         return rect.width > 0 && rect.height > 0 && styles.visibility !== "hidden" && styles.display !== "none";
  2125 |       }).map((control) => {
  2126 |         const controlRect = control.getBoundingClientRect();
  2127 |         const textRect = document.createRange();
  2128 |         textRect.selectNodeContents(control);
  2129 |         const textBounds = Array.from(textRect.getClientRects()).filter(
  2130 |           ({ width: textWidth, height: textHeight }) => textWidth > 0 && textHeight > 0,
  2131 |         );
```