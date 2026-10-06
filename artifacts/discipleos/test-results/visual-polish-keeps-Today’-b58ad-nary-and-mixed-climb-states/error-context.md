# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-polish.spec.ts >> keeps Today’s Reading complete across empty, ordinary, and mixed climb states
- Location: tests/e2e/visual-polish.spec.ts:1821:1

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: page.reload: Test timeout of 90000ms exceeded.
Call log:
  - waiting for navigation until "load"
    - navigated to "http://127.0.0.1:4173/"

```

# Page snapshot

```yaml
- generic [ref=f39e2]:
  - status "Loading DiscipleOS" [ref=f39e3]
  - button "Feedback" [ref=f39e4] [cursor=pointer]:
    - generic [ref=f39e5]: ✦
    - text: Feedback
  - generic [ref=f39e9]:
    - banner [ref=f39e10]:
      - heading "DISCIPLEOS" [level=1] [ref=f39e11]
      - link "Continue with email" [ref=f39e12] [cursor=pointer]:
        - /url: /sign-in
    - status [ref=f39e13]: Preparing your reading space…
```

# Test source

```ts
  1780 |         verse: top("dashboard-verse-of-day"),
  1781 |         assigned: top("dashboard-assigned-reading"),
  1782 |         activities: top("dashboard-schedule"),
  1783 |         progress: top("dashboard-progress"),
  1784 |         mountain: top("dashboard-mountain-rhythm"),
  1785 |       };
  1786 |     });
  1787 | 
  1788 |     expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  1789 |     expect(layout.verse).toBeLessThan(layout.assigned);
  1790 |     expect(layout.assigned).toBeLessThan(layout.activities);
  1791 |     expect(layout.activities).toBeLessThan(layout.progress);
  1792 |     expect(layout.progress).toBeLessThan(layout.mountain);
  1793 | 
  1794 |     if (width < 768) {
  1795 |       for (const testId of ["dashboard-assigned-reading", "dashboard-schedule", "dashboard-progress", "dashboard-mountain-rhythm"]) {
  1796 |         const box = await page.getByTestId(testId).boundingBox();
  1797 |         expect(box).not.toBeNull();
  1798 |         expect(box?.x ?? -1).toBeGreaterThanOrEqual(12);
  1799 |         expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width - 12);
  1800 |       }
  1801 |     }
  1802 | 
  1803 |     const assignedToggle = assigned.getByRole("button", { name: /Today’s Reading/ });
  1804 |     await assignedToggle.click();
  1805 |     await expect(assignedToggle).toHaveAttribute("aria-expanded", "false");
  1806 |     await assignedToggle.click();
  1807 |     await expect(assignedToggle).toHaveAttribute("aria-expanded", "true");
  1808 | 
  1809 |     const progressToggle = progress.getByRole("button", { name: /^Progress/ });
  1810 |     await progressToggle.click();
  1811 |     await expect(progressToggle).toHaveAttribute("aria-expanded", "true");
  1812 |     await expect(progress.getByTestId("dashboard-progress-list")).toContainText("Morning Psalms");
  1813 | 
  1814 |     const mountainToggle = mountain.getByRole("button", { name: /Mountain Rhythm/ });
  1815 |     await mountainToggle.click();
  1816 |     await expect(mountainToggle).toHaveAttribute("aria-expanded", "true");
  1817 |     await expect(mountain.getByTestId("dashboard-mountain-rhythm-summary")).toBeVisible();
  1818 |   }
  1819 | });
  1820 | 
  1821 | test("keeps Today’s Reading complete across empty, ordinary, and mixed climb states", async ({ page }) => {
  1822 |   test.setTimeout(90_000);
  1823 |   const morningPlan = makeOrdinaryPlan("today-morning", "Morning Psalms");
  1824 |   morningPlan.assignments[0].readings[0].label = "Morning Psalm 1";
  1825 |   const eveningPlan = makeOrdinaryPlan("today-evening", "Evening Proverbs");
  1826 |   eveningPlan.assignments[0].readings[0].label = "Evening Proverbs 1";
  1827 |   const climbPlan = makeStructuredClimbPlan();
  1828 |   const completedClimbPlan = makeStructuredClimbPlan("visual-polish-completed-climb");
  1829 |   completedClimbPlan.completed[`${completedClimbPlan.id}-0`] = true;
  1830 |   completedClimbPlan.earnedDayKeys = [todayISO()];
  1831 |   const dailyWalkEvent = {
  1832 |     id: "visual-polish-daily-walk-event",
  1833 |     title: "Morning prayer",
  1834 |     type: "prayer",
  1835 |     date: todayISO(),
  1836 |     time: "06:30",
  1837 |     notes: "A quiet start",
  1838 |     remind: false,
  1839 |     repeat: "none",
  1840 |   };
  1841 |   const states = [
  1842 |     {
  1843 |       label: "no plans",
  1844 |       plans: [],
  1845 |       ordinaryNames: [],
  1846 |       climbReading: false,
  1847 |     },
  1848 |     {
  1849 |       label: "multiple ordinary plans",
  1850 |       plans: [morningPlan, eveningPlan],
  1851 |       ordinaryNames: ["Morning Psalms", "Evening Proverbs"],
  1852 |       climbReading: false,
  1853 |     },
  1854 |     {
  1855 |       label: "active climb plus ordinary plans",
  1856 |       plans: [climbPlan, morningPlan, eveningPlan],
  1857 |       ordinaryNames: ["Morning Psalms", "Evening Proverbs"],
  1858 |       climbReading: true,
  1859 |       climbComplete: false,
  1860 |     },
  1861 |     {
  1862 |       label: "completed climb",
  1863 |       plans: [completedClimbPlan, morningPlan],
  1864 |       ordinaryNames: ["Morning Psalms"],
  1865 |       climbReading: true,
  1866 |       climbComplete: true,
  1867 |     },
  1868 |   ];
  1869 | 
  1870 |   await page.addInitScript(() => localStorage.removeItem("discipleos:dashboard-disclosures"));
  1871 | 
  1872 |   for (const state of states) {
  1873 |     for (const width of [320, 360, 390, 430, 1280]) {
  1874 |       await page.setViewportSize({ width, height: 900 });
  1875 |       await page.unrouteAll();
  1876 |       await stubHomeApi(page, state.plans, [dailyWalkEvent]);
  1877 |       await seedPlans(page, state.plans, [dailyWalkEvent]);
  1878 |       await page.goto("/");
  1879 |         await page.evaluate(() => localStorage.removeItem("discipleos:dashboard-disclosures"));
> 1880 |         await page.reload();
       |                    ^ Error: page.reload: Test timeout of 90000ms exceeded.
  1881 | 
  1882 |       const assigned = page.getByTestId("dashboard-assigned-reading");
  1883 |       const schedule = page.getByTestId("dashboard-schedule");
  1884 |       const progress = page.getByTestId("dashboard-progress");
  1885 |       const mountain = page.getByTestId("dashboard-mountain-rhythm");
  1886 |       const assignedToggle = assigned.getByRole("button", { name: /Today’s Reading/ });
  1887 |       await expect(assigned).toBeVisible();
  1888 |       await expect(assignedToggle).toHaveAttribute("aria-expanded", "true");
  1889 |       await expect(assigned.getByTestId("dashboard-assigned-reading-overview")).toBeVisible();
  1890 |       await expect(schedule).toBeVisible();
  1891 |       await expect(page.getByTestId("dashboard-verse-of-day")).toContainText("Psalm 1:1");
  1892 |       await expect(page.getByTestId("dashboard-stats")).toHaveCount(0);
  1893 |       await expect(progress.getByRole("button", { name: /^Progress/ })).toHaveAttribute("aria-expanded", "false");
  1894 |       await expect(mountain.getByRole("button", { name: /Mountain Rhythm/ })).toHaveAttribute("aria-expanded", "false");
  1895 |       for (const name of state.ordinaryNames) {
  1896 |         await expect(assigned.getByText(name, { exact: true })).toBeVisible();
  1897 |       }
  1898 |       if (state.climbReading) {
  1899 |         await expect(assigned.getByText("Climb reading 1", { exact: true })).toHaveCount(0);
  1900 |       }
  1901 | 
  1902 |       if (state.plans.length === 0) {
  1903 |         await expect(assigned.getByTestId("today-empty-create-plan")).toHaveCount(1);
  1904 |         await expect(page.getByRole("button", { name: "Create a Plan", exact: true })).toHaveCount(1);
  1905 |       }
  1906 |       const mountainSummary = page.getByTestId("dashboard-mountain-rhythm");
  1907 |       const mountainToggle = mountainSummary.getByRole("button", { name: /Mountain Rhythm/ });
  1908 |       await mountainToggle.click();
  1909 |       await expect(mountainSummary.getByTestId("dashboard-mountain-rhythm-summary")).toBeVisible();
  1910 |       if (state.climbReading) {
  1911 |         await expect(mountainSummary.getByTestId("dashboard-mountain-rhythm-climb")).toContainText(
  1912 |           "7-Day Climb",
  1913 |         );
  1914 |         await expect(mountainSummary.getByTestId("dashboard-mountain-rhythm-progress")).toContainText(
  1915 |           state.climbComplete ? "14.3%" : "0%",
  1916 |         );
  1917 |         const todayStatus = mountainSummary.getByTestId("dashboard-mountain-rhythm-today-status");
  1918 |         await expect(todayStatus).toContainText(state.climbComplete ? "Complete" : "Not complete");
  1919 |         if (state.climbComplete) {
  1920 |           await expect(
  1921 |             mountainSummary.getByTestId("dashboard-mountain-rhythm-summary"),
  1922 |           ).toContainText("Today’s reading finished");
  1923 |           await expect(
  1924 |             mountainSummary.getByTestId("dashboard-mountain-rhythm-today-action"),
  1925 |           ).toHaveCount(0);
  1926 |         } else {
  1927 |           await expect(
  1928 |             mountainSummary.getByTestId("dashboard-mountain-rhythm-today-action"),
  1929 |           ).toHaveAttribute("href", "/mountain-rhythm");
  1930 |           await expect(
  1931 |             mountainSummary.getByTestId("dashboard-mountain-rhythm-today-action"),
  1932 |           ).toContainText("Open today’s reading");
  1933 |         }
  1934 |         await expect(mountainSummary.getByText("Current stage", { exact: true })).toHaveCount(0);
  1935 |         await expect(mountainSummary.getByTestId("mountain-rhythm-panel")).toHaveCount(0);
  1936 |         await expect(page.getByTestId("mountain-rhythm-panel")).toHaveCount(0);
  1937 |       }
  1938 | 
  1939 |       const layout = await page.evaluate(() => {
  1940 |         const box = (testId: string) => {
  1941 |           const element = document.querySelector(`[data-testid="${testId}"]`);
  1942 |           if (!element) return null;
  1943 |           const rect = element.getBoundingClientRect();
  1944 |           return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
  1945 |         };
  1946 |         return {
  1947 |           viewportWidth: window.innerWidth,
  1948 |           documentWidth: document.documentElement.scrollWidth,
  1949 |           verse: box("dashboard-verse-of-day"),
  1950 |           assigned: box("dashboard-assigned-reading"),
  1951 |           schedule: box("dashboard-schedule"),
  1952 |           progress: box("dashboard-progress"),
  1953 |           mountain: box("dashboard-mountain-rhythm"),
  1954 |         assignedButtons: Array.from(
  1955 |           document.querySelectorAll('[data-testid="dashboard-assigned-reading"] .discipleos-flat-list button'),
  1956 |           ).map((element) => Math.round(element.getBoundingClientRect().height)),
  1957 |         };
  1958 |       });
  1959 | 
  1960 |       expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  1961 |       expect(layout.verse).not.toBeNull();
  1962 |       expect(layout.assigned).not.toBeNull();
  1963 |       expect(layout.schedule).not.toBeNull();
  1964 |       expect(layout.progress).not.toBeNull();
  1965 |       expect(layout.assigned?.left ?? -1).toBeGreaterThanOrEqual(12);
  1966 |       expect(layout.assigned?.right ?? Infinity).toBeLessThanOrEqual(width - 12);
  1967 |       expect(layout.assigned?.top ?? Infinity).toBeLessThan(layout.schedule?.top ?? -1);
  1968 |       expect(layout.schedule?.top ?? Infinity).toBeLessThan(layout.mountain?.top ?? -1);
  1969 |       expect(layout.verse?.top ?? Infinity).toBeLessThan(layout.assigned?.top ?? -1);
  1970 |       expect(layout.assigned?.top ?? Infinity).toBeLessThan(layout.schedule?.top ?? -1);
  1971 |       expect(layout.schedule?.top ?? Infinity).toBeLessThan(layout.progress?.top ?? -1);
  1972 |       expect(layout.progress?.top ?? Infinity).toBeLessThan(layout.mountain?.top ?? -1);
  1973 |       if (state.plans.length > 0) {
  1974 |         expect(layout.assignedButtons.length).toBeGreaterThan(0);
  1975 |         expect(Math.min(...layout.assignedButtons)).toBeGreaterThanOrEqual(40);
  1976 |       }
  1977 | 
  1978 |       const firstAssignedAction = assigned.locator("button").first();
  1979 |       await firstAssignedAction.focus();
  1980 |       await expect(firstAssignedAction).toBeFocused();
```