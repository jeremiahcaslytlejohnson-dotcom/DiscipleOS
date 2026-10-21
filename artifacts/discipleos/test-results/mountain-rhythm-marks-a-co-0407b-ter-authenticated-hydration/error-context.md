# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> marks a completed 7-Day Climb after authenticated hydration
- Location: tests/e2e/mountain-rhythm.spec.ts:2216:3

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
  2194 |       `0 of ${route.days} planned days`,
  2195 |     );
  2196 |     await expect(
  2197 |       page.getByText(
  2198 |         new RegExp(`${persistedPlanName} · about \\d+ min/day · future readings stay hidden until their day`),
  2199 |       ),
  2200 |     ).toBeVisible();
  2201 |     await expect(page.getByTestId("route-day-1")).toBeVisible();
  2202 |     await expect(page.getByText("Ordinary reading plan", { exact: true })).toHaveCount(0);
  2203 | 
  2204 |     const metricValuesAfterReload = await Promise.all(
  2205 |       ["today", "journey", "rhythm"].map((metric) =>
  2206 |         page.getByTestId(`mountain-rhythm-metric-${metric}`).innerText(),
  2207 |       ),
  2208 |     );
  2209 |     expect(metricValuesAfterReload).toEqual(metricValuesBeforeReload);
  2210 |   });
  2211 | }
  2212 | 
  2213 | for (const route of [
  2214 |   { kind: "7-day-climb", label: "7-Day Climb", days: 7 as const },
  2215 | ] as const) {
  2216 |   test(`marks a completed ${route.label} after authenticated hydration`, async ({ page }) => {
  2217 |     const today = new Date().toISOString().slice(0, 10);
  2218 |     const completed = makePlan({
  2219 |       id: `hydrated-completed-${route.kind}`,
  2220 |       days: route.days,
  2221 |       name: route.label,
  2222 |       today,
  2223 |       completedIndexes: Array.from({ length: route.days }, (_, index) => index),
  2224 |     });
  2225 |     const ordinaryPlan = {
  2226 |       ...makePlan({
  2227 |         id: `hydrated-ordinary-${route.kind}`,
  2228 |         days: 7,
  2229 |         name: "Ordinary reading plan",
  2230 |         today,
  2231 |       }),
  2232 |       journeyKey: "custom",
  2233 |       journeyType: "custom",
  2234 |     };
  2235 | 
  2236 |     await stubAuthenticatedApi(page, ordinaryPlan, [completed]);
  2237 |     await seedLocalData(page, [], null);
  2238 |     await openMountainRhythm(page);
  2239 | 
  2240 |     await expect(page.getByTestId("mountain-rhythm-complete")).toContainText(`${route.label} complete`);
> 2241 |     await expect(page.getByTestId(`button-choose-${route.kind}`)).toContainText(`${route.label} · Complete`);
       |                                                                   ^ Error: expect(locator).toContainText(expected) failed
  2242 |     await expect(page.getByTestId(`completed-climb-${route.kind}`)).toHaveCount(0);
  2243 |     await expandPastClimbs(page);
  2244 |     await expect(page.getByTestId(`completed-climb-${route.kind}`)).toContainText("100% journey progress");
  2245 |     await expect(page.getByText("Ordinary reading plan", { exact: true })).toHaveCount(0);
  2246 |   });
  2247 | }
  2248 | 
  2249 | test("shows the newest available Route to date day first and collapses earlier days independently", async ({
  2250 |   page,
  2251 | }) => {
  2252 |   const today = await page.evaluate(() => {
  2253 |     const date = new Date();
  2254 |     const month = String(date.getMonth() + 1).padStart(2, "0");
  2255 |     const day = String(date.getDate()).padStart(2, "0");
  2256 |     return `${date.getFullYear()}-${month}-${day}`;
  2257 |   });
  2258 |   const plan = makePlan({
  2259 |     id: "latest-route-day-first",
  2260 |     days: 7,
  2261 |     name: "7-Day Climb",
  2262 |     today,
  2263 |     startOffset: -2,
  2264 |     completedIndexes: [1],
  2265 |   });
  2266 | 
  2267 |   await stubApi(page);
  2268 |   await seedLocalData(page, [plan], plan.id);
  2269 |   await openMountainRhythm(page);
  2270 | 
  2271 |   const routeDays = page
  2272 |     .getByTestId("mountain-rhythm-route-days")
  2273 |     .locator("[data-route-day-number]");
  2274 |   await expect(routeDays).toHaveCount(3);
  2275 |   expect(
  2276 |     await routeDays.evaluateAll((days) =>
  2277 |       days.map((routeDay) => routeDay.getAttribute("data-route-day-number")),
  2278 |     ),
  2279 |   ).toEqual(["3", "2", "1"]);
  2280 | 
  2281 |   await expect(page.getByTestId("route-day-toggle-3")).toHaveAttribute(
  2282 |     "aria-expanded",
  2283 |     "true",
  2284 |   );
  2285 |   await expect(page.getByTestId("route-day-readings-3")).toBeVisible();
  2286 |   for (const earlierDayNumber of [1, 2]) {
  2287 |     await expect(
  2288 |       page.getByTestId(`route-day-toggle-${earlierDayNumber}`),
  2289 |     ).toHaveAttribute("aria-expanded", "false");
  2290 |     await expect(
  2291 |       page.getByTestId(`route-day-readings-${earlierDayNumber}`),
  2292 |     ).toBeHidden();
  2293 |   }
  2294 | 
  2295 |   const completedEarlierDay = page.getByTestId("route-day-2");
  2296 |   await expect(
  2297 |     completedEarlierDay.getByTestId("route-day-number-2"),
  2298 |   ).toHaveText("2");
  2299 |   await expect(
  2300 |     completedEarlierDay.getByTestId("route-day-date-2"),
  2301 |   ).not.toBeEmpty();
  2302 |   await expect(
  2303 |     completedEarlierDay.getByTestId("route-day-toggle-2"),
  2304 |   ).toContainText("2 readings");
  2305 |   await expect(
  2306 |     completedEarlierDay.getByTestId("route-day-toggle-2"),
  2307 |   ).toContainText(/≈ \d+ min/);
  2308 |   await expect(
  2309 |     completedEarlierDay.getByTestId("route-day-status-2"),
  2310 |   ).toHaveText("Complete");
  2311 |   await expect(
  2312 |     completedEarlierDay.getByTestId("button-complete-day-2"),
  2313 |   ).toHaveText("Undo day");
  2314 | 
  2315 |   await page.getByTestId("route-day-toggle-2").click();
  2316 |   await expect(page.getByTestId("route-day-readings-2")).toBeVisible();
  2317 |   await expect(page.getByTestId("route-day-readings-1")).toBeHidden();
  2318 |   await page.getByTestId("route-day-toggle-1").click();
  2319 |   await expect(page.getByTestId("route-day-readings-1")).toBeVisible();
  2320 |   await expect(page.getByTestId("route-day-readings-2")).toBeVisible();
  2321 |   await page.getByTestId("route-day-toggle-2").click();
  2322 |   await expect(page.getByTestId("route-day-readings-2")).toBeHidden();
  2323 |   await expect(page.getByTestId("route-day-readings-1")).toBeVisible();
  2324 |   await expect(page.getByTestId("route-day-readings-3")).toBeVisible();
  2325 | 
  2326 |   await expect(page.getByTestId("route-day-4")).toHaveCount(0);
  2327 | 
  2328 |   await page.reload();
  2329 |   await openMountainRhythm(page);
  2330 |   await expect(page.getByTestId("route-day-readings-3")).toBeVisible();
  2331 |   await expect(page.getByTestId("route-day-readings-2")).toBeHidden();
  2332 |   await expect(page.getByTestId("route-day-readings-1")).toBeHidden();
  2333 |   await expect(page.getByTestId("route-day-4")).toHaveCount(0);
  2334 | });
  2335 | 
  2336 | test("updates Today’s reading for a partial day without awarding ascent", async ({
  2337 |   page,
  2338 | }) => {
  2339 |   const today = new Date().toISOString().slice(0, 10);
  2340 |   const plan = makePlan({
  2341 |     id: "partial-climb",
```