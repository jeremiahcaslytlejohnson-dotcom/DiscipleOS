# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-polish.spec.ts >> undoes a completed Calendar day while preserving its earned history
- Location: tests/e2e/visual-polish.spec.ts:1293:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 2
+ Received  + 2

  Object {
-   "calendar-undo-1": false,
-   "calendar-undo-2": false,
+   "calendar-undo-1": true,
+   "calendar-undo-2": true,
  }

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
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
    - navigation "Dashboard navigation" [ref=e14]:
      - button "Today" [ref=e15]
      - button "Calendar" [pressed] [ref=e22]
      - button "Plans" [ref=e26]
      - generic [ref=e30]:
        - button "Install App" [ref=e32]
        - button "Notifications blocked" [ref=e36]
    - generic [ref=e41]:
      - generic [ref=e42]:
        - generic [ref=e43]: Faith calendar
        - generic [ref=e46]:
          - generic [ref=e47]:
            - generic [ref=e48]:
              - generic [ref=e49]: Activities for Nov 4, 2026
              - generic [ref=e50]: Today
            - button "Today" [ref=e51]
          - button "Add Activity A short guided flow" [ref=e53]:
            - generic [ref=e56]:
              - generic [ref=e57]: Add Activity
              - generic [ref=e58]: A short guided flow
          - generic [ref=e61]:
            - generic [ref=e62]:
              - generic [ref=e63]: Reading
              - generic [ref=e68]:
                - generic [ref=e69]:
                  - button "Expand Calendar Undo Plan readings" [ref=e70]:
                    - generic [ref=e73]: Calendar Undo Plan
                    - generic [ref=e74]: bible
                  - generic [ref=e75]:
                    - generic [ref=e76]: 7:00 AM
                    - generic [ref=e77]: ·
                    - 'generic "Estimated reading time: about 3 min" [ref=e78]': ≈ 3 min
                    - generic [ref=e79]: ·
                    - generic [ref=e80]: 2 chapters assigned
                - button "Complete day" [active] [ref=e81]
            - generic [ref=e82]:
              - generic [ref=e83]: Activities
              - generic [ref=e88]:
                - generic [ref=e89]:
                  - generic [ref=e90]:
                    - generic [ref=e91]: Morning prayer
                    - generic [ref=e92]: prayer
                  - generic [ref=e93]: 6:30 AM
                  - generic [ref=e94]: A quiet start
                - generic [ref=e95]:
                  - button "Complete activity" [ref=e96]
                  - button "Edit Morning prayer" [ref=e99]
                  - button "Delete Morning prayer" [ref=e103]
      - generic [ref=e107]:
        - generic [ref=e108]: Month overview
        - generic [ref=e111]:
          - button "Prev" [ref=e112]
          - generic [ref=e113]: November 2026
          - button "Next" [ref=e114]
        - generic [ref=e115]:
          - generic [ref=e116]: S
          - generic [ref=e117]: M
          - generic [ref=e118]: T
          - generic [ref=e119]: W
          - generic [ref=e120]: T
          - generic [ref=e121]: F
          - generic [ref=e122]: S
        - generic [ref=e123]:
          - button "Nov 1, 2026" [ref=e124]:
            - generic [ref=e125]: "1"
          - button "Nov 2, 2026" [ref=e126]:
            - generic [ref=e127]: "2"
          - button "Nov 3, 2026" [ref=e128]:
            - generic [ref=e129]: "3"
          - button "Nov 4, 2026, Bible reading, Prayer, selected" [ref=e130]:
            - generic [ref=e131]: "4"
            - generic [ref=e132]: P
          - button "Nov 5, 2026" [ref=e137]:
            - generic [ref=e138]: "5"
          - button "Nov 6, 2026" [ref=e139]:
            - generic [ref=e140]: "6"
          - button "Nov 7, 2026" [ref=e141]:
            - generic [ref=e142]: "7"
          - button "Nov 8, 2026" [ref=e143]:
            - generic [ref=e144]: "8"
          - button "Nov 9, 2026" [ref=e145]:
            - generic [ref=e146]: "9"
          - button "Nov 10, 2026" [ref=e147]:
            - generic [ref=e148]: "10"
          - button "Nov 11, 2026" [ref=e149]:
            - generic [ref=e150]: "11"
          - button "Nov 12, 2026" [ref=e151]:
            - generic [ref=e152]: "12"
          - button "Nov 13, 2026" [ref=e153]:
            - generic [ref=e154]: "13"
          - button "Nov 14, 2026" [ref=e155]:
            - generic [ref=e156]: "14"
          - button "Nov 15, 2026" [ref=e157]:
            - generic [ref=e158]: "15"
          - button "Nov 16, 2026" [ref=e159]:
            - generic [ref=e160]: "16"
          - button "Nov 17, 2026" [ref=e161]:
            - generic [ref=e162]: "17"
          - button "Nov 18, 2026" [ref=e163]:
            - generic [ref=e164]: "18"
          - button "Nov 19, 2026" [ref=e165]:
            - generic [ref=e166]: "19"
          - button "Nov 20, 2026" [ref=e167]:
            - generic [ref=e168]: "20"
          - button "Nov 21, 2026" [ref=e169]:
            - generic [ref=e170]: "21"
          - button "Nov 22, 2026" [ref=e171]:
            - generic [ref=e172]: "22"
          - button "Nov 23, 2026" [ref=e173]:
            - generic [ref=e174]: "23"
          - button "Nov 24, 2026" [ref=e175]:
            - generic [ref=e176]: "24"
          - button "Nov 25, 2026" [ref=e177]:
            - generic [ref=e178]: "25"
          - button "Nov 26, 2026" [ref=e179]:
            - generic [ref=e180]: "26"
          - button "Nov 27, 2026" [ref=e181]:
            - generic [ref=e182]: "27"
          - button "Nov 28, 2026" [ref=e183]:
            - generic [ref=e184]: "28"
          - button "Nov 29, 2026" [ref=e185]:
            - generic [ref=e186]: "29"
          - button "Nov 30, 2026" [ref=e187]:
            - generic [ref=e188]: "30"
          - button "Dec 1, 2026" [ref=e189]:
            - generic [ref=e190]: "1"
          - button "Dec 2, 2026" [ref=e191]:
            - generic [ref=e192]: "2"
          - button "Dec 3, 2026" [ref=e193]:
            - generic [ref=e194]: "3"
          - button "Dec 4, 2026" [ref=e195]:
            - generic [ref=e196]: "4"
          - button "Dec 5, 2026" [ref=e197]:
            - generic [ref=e198]: "5"
```

# Test source

```ts
  1238 |   );
  1239 |   const refreshedCurrentReadings = refreshedCurrentDay.getByTestId(
  1240 |     `plan-day-readings-${currentIdentifier}`,
  1241 |   );
  1242 |   const refreshedPastToggle = refreshedDetails.getByTestId("plan-day-group-toggle-past");
  1243 |   const refreshedPastContent = refreshedDetails.getByTestId("plan-day-group-content-past");
  1244 |   const refreshedUpcomingToggle = refreshedDetails.getByTestId(
  1245 |     "plan-day-group-toggle-upcoming",
  1246 |   );
  1247 |   const refreshedUpcomingContent = refreshedDetails.getByTestId(
  1248 |     "plan-day-group-content-upcoming",
  1249 |   );
  1250 | 
  1251 |   await expect(refreshedCurrentToggle).toHaveAttribute("aria-expanded", "true");
  1252 |   await expect(refreshedCurrentReadings).toBeVisible();
  1253 |   await expect(refreshedPastToggle).toHaveAttribute("aria-expanded", "false");
  1254 |   await expect(refreshedPastContent).toBeHidden();
  1255 |   await expect(refreshedUpcomingToggle).toHaveAttribute("aria-expanded", "false");
  1256 |   await expect(refreshedUpcomingContent).toBeHidden();
  1257 |   await refreshedPastToggle.click();
  1258 |   await expect(
  1259 |     refreshedDetails.getByTestId(`plan-day-status-${pastIdentifier}`),
  1260 |   ).toHaveText("Complete");
  1261 |   await expect(refreshedPastToggle).toContainText("1 complete · 0 to catch up");
  1262 |   await refreshedUpcomingToggle.click();
  1263 |   await expect(
  1264 |     refreshedDetails.getByTestId(`plan-day-status-${upcomingIdentifier}`),
  1265 |   ).toHaveText("Upcoming");
  1266 | });
  1267 | 
  1268 | test("keeps the Plans add action aligned at narrow mobile width", async ({ page }) => {
  1269 |   const plan = makeOrdinaryPlan("narrow-plan-alignment", "Morning Psalms");
  1270 |   await stubHomeApi(page, plan);
  1271 |   await seedPlans(page, [plan]);
  1272 |   await page.setViewportSize({ width: 320, height: 800 });
  1273 |   await page.goto("/");
  1274 |   await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  1275 | 
  1276 |   const navigation = await openDashboardNavigation(page);
  1277 |   await navigation.getByRole("button", { name: "Plans", exact: true }).click();
  1278 |   const plansPanel = page.getByTestId("dashboard-plans-list");
  1279 |   const header = plansPanel.locator(":scope > div").first();
  1280 |   const addPlan = page.getByTestId("plans-create-button");
  1281 |   await expect(addPlan).toBeVisible();
  1282 | 
  1283 |   const alignment = await Promise.all([
  1284 |     header.evaluate((element) => element.getBoundingClientRect().right),
  1285 |     addPlan.evaluate((element) => element.getBoundingClientRect().right),
  1286 |   ]);
  1287 |   expect(alignment[1]).toBeCloseTo(alignment[0], 0);
  1288 |   expect(await addPlan.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(
  1289 |     await addPlan.evaluate((element) => element.clientWidth) + 1,
  1290 |   );
  1291 | });
  1292 | 
  1293 | test("undoes a completed Calendar day while preserving its earned history", async ({ page }) => {
  1294 |   const today = todayISO();
  1295 |   const plan = {
  1296 |     ...makeOrdinaryPlan("calendar-undo-plan", "Calendar Undo Plan"),
  1297 |     assignments: [
  1298 |       {
  1299 |         date: today,
  1300 |         readings: [
  1301 |           { key: "calendar-undo-1", label: "Psalm 1" },
  1302 |           { key: "calendar-undo-2", label: "Psalm 2" },
  1303 |         ],
  1304 |       },
  1305 |     ],
  1306 |     completed: { "calendar-undo-1": true, "calendar-undo-2": true },
  1307 |     earnedDayKeys: [today],
  1308 |     dayCompletionDates: { [today]: today },
  1309 |   };
  1310 |   const dayCompletionWrites: any[] = [];
  1311 |   await stubHomeApi(page, plan);
  1312 |   await seedPlans(page, [plan], [], true);
  1313 |   page.on("request", (request) => {
  1314 |     if (request.url().includes("/api/reading/day-complete") && request.method() === "POST") {
  1315 |       dayCompletionWrites.push(request.postDataJSON());
  1316 |     }
  1317 |   });
  1318 | 
  1319 |   await page.goto("/");
  1320 |   await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  1321 |   await (await openDashboardNavigation(page)).getByRole("button", { name: "Calendar", exact: true }).click();
  1322 |   await page.getByTestId(`calendar-day-${today}`).click();
  1323 | 
  1324 |   const activities = page.getByTestId("dashboard-calendar-activities");
  1325 |   await activities.getByRole("button", { name: "Undo day", exact: true }).click();
  1326 |   await expect(activities.getByRole("button", { name: "Complete day", exact: true })).toBeVisible();
  1327 |   await expect.poll(() => dayCompletionWrites.length).toBe(1);
  1328 |   expect(dayCompletionWrites[0]).toMatchObject({
  1329 |     planId: plan.id,
  1330 |     date: today,
  1331 |     completed: false,
  1332 |   });
  1333 | 
  1334 |   await expect.poll(async () => page.evaluate(() => {
  1335 |     const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
  1336 |     const storedPlan = data.plans?.find((item: any) => item.id === "calendar-undo-plan");
  1337 |     return storedPlan?.completed;
> 1338 |   })).toEqual({ "calendar-undo-1": false, "calendar-undo-2": false });
       |       ^ Error: expect(received).toEqual(expected) // deep equality
  1339 |   const storedPlanState = await page.evaluate(() => {
  1340 |     const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
  1341 |     const storedPlan = data.plans?.find((item: any) => item.id === "calendar-undo-plan");
  1342 |     return {
  1343 |       completed: storedPlan?.completed,
  1344 |       earnedDayKeys: storedPlan?.earnedDayKeys,
  1345 |       dayCompletionDates: storedPlan?.dayCompletionDates,
  1346 |     };
  1347 |   });
  1348 |   expect(storedPlanState).toEqual({
  1349 |     completed: { "calendar-undo-1": false, "calendar-undo-2": false },
  1350 |     earnedDayKeys: [today],
  1351 |     dayCompletionDates: { [today]: today },
  1352 |   });
  1353 | 
  1354 |   await page.reload();
  1355 |   await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  1356 |   await (await openDashboardNavigation(page)).getByRole("button", { name: "Calendar", exact: true }).click();
  1357 |   await page.getByTestId(`calendar-day-${today}`).click();
  1358 |   await expect(
  1359 |     page.getByTestId("dashboard-calendar-activities").getByRole("button", { name: "Complete day", exact: true }),
  1360 |   ).toBeVisible();
  1361 |   const persistedHistory = await page.evaluate(() => {
  1362 |     const data = JSON.parse(localStorage.getItem("discipleos-data") || "{}");
  1363 |     const storedPlan = data.plans?.find((item: any) => item.id === "calendar-undo-plan");
  1364 |     return {
  1365 |       earnedDayKeys: storedPlan?.earnedDayKeys,
  1366 |       dayCompletionDates: storedPlan?.dayCompletionDates,
  1367 |     };
  1368 |   });
  1369 |   expect(persistedHistory).toEqual({
  1370 |     earnedDayKeys: [today],
  1371 |     dayCompletionDates: { [today]: today },
  1372 |   });
  1373 | });
  1374 | 
  1375 | test("keeps the Calendar Bible marker incomplete until every plan's readings for the day are complete", async ({
  1376 |   page,
  1377 | }) => {
  1378 |   const today = todayISO();
  1379 |   const firstPlan = {
  1380 |     ...makeOrdinaryPlan("calendar-marker-plan-a", "Morning Psalms"),
  1381 |     assignments: [
  1382 |       {
  1383 |         date: today,
  1384 |         readings: [
  1385 |           { key: "calendar-marker-a1", label: "Psalm 1" },
  1386 |           { key: "calendar-marker-a2", label: "Psalm 2" },
  1387 |         ],
  1388 |       },
  1389 |     ],
  1390 |     completed: {},
  1391 |   };
  1392 |   const secondPlan = {
  1393 |     ...makeOrdinaryPlan("calendar-marker-plan-b", "Evening Proverbs"),
  1394 |     assignments: [
  1395 |       {
  1396 |         date: today,
  1397 |         readings: [{ key: "calendar-marker-b1", label: "Proverbs 1" }],
  1398 |       },
  1399 |     ],
  1400 |     completed: { "calendar-marker-b1": true },
  1401 |   };
  1402 |   const plans = [firstPlan, secondPlan];
  1403 | 
  1404 |   await stubHomeApi(page, plans);
  1405 |   await seedPlans(page, plans, [], true, "visual-polish-owner");
  1406 |   await page.route("**/api/reading/complete", async (route) => {
  1407 |     const payload = route.request().postDataJSON() as {
  1408 |       planId: string;
  1409 |       key: string;
  1410 |       completed: boolean;
  1411 |     };
  1412 |     const plan = plans.find((item) => item.id === payload.planId) as any;
  1413 |     if (plan) {
  1414 |       plan.completed = {
  1415 |         ...(plan.completed || {}),
  1416 |         [payload.key]: Boolean(payload.completed),
  1417 |       };
  1418 |     }
  1419 |     await route.fulfill({
  1420 |       status: 200,
  1421 |       contentType: "application/json",
  1422 |       body: JSON.stringify({ success: true }),
  1423 |     });
  1424 |   });
  1425 | 
  1426 |   const openCalendarDate = async () => {
  1427 |     await page.locator(".launch-splash").waitFor({ state: "detached" });
  1428 |     await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  1429 |     await (await openDashboardNavigation(page))
  1430 |       .getByRole("button", { name: "Calendar", exact: true })
  1431 |       .click();
  1432 |     await expect(page.getByTestId("dashboard-calendar-content")).toBeVisible();
  1433 |     await page.getByTestId(`calendar-day-${today}`).click();
  1434 |     await expect(page.getByTestId("dashboard-calendar-activities")).toBeVisible();
  1435 |   };
  1436 | 
  1437 |   const bibleMarker = page.getByTestId(`calendar-marker-${today}-bible`);
  1438 |   await page.goto("/");
```