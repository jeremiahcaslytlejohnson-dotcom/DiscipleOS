# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-polish.spec.ts >> shows assigned Bible readings as an icon alongside Calendar activity markers
- Location: tests/e2e/visual-polish.spec.ts:1104:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('calendar-marker-2026-10-05-bible')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('calendar-marker-2026-10-05-bible')

```

```yaml
- button "Feedback"
- heading "DISCIPLEOS" [level=1]
- link "Continue with email":
  - /url: /sign-in
- paragraph: Today’s reading · keep taking the next faithful step
- button "Install App"
- button "Open menu": Menu
- text: Faith calendar Activities for Sep 27, 2026 Today
- button "Today"
- button "Add Activity A short guided flow"
- text: Reading Morning Psalms bible 7:00 AM 2 chapters assigned
- button "Complete day"
- button "Psalm 2"
- button "Psalm 3"
- text: Evening Proverbs bible 7:00 AM 1 chapters assigned
- button "Complete day"
- button "Proverbs 1"
- text: 7-Day Climb bible 7:00 AM 1 chapters assigned
- button "Undo day"
- button "Climb reading 1"
- text: Activities prayer-all-prayer prayer 6:30 AM
- button "Complete activity"
- button "Edit prayer-all-prayer"
- button "Delete prayer-all-prayer"
- text: fast-all-fast fast 6:30 AM
- button "Complete activity"
- button "Edit fast-all-fast"
- button "Delete fast-all-fast"
- text: church-all-church church 6:30 AM
- button "Complete activity"
- button "Edit church-all-church"
- button "Delete church-all-church"
- text: event-all-event event 6:30 AM
- button "Complete activity"
- button "Edit event-all-event"
- button "Delete event-all-event"
- text: prayer-recurring-prayer prayer 6:30 AM
- button "Complete activity"
- button "Edit prayer-recurring-prayer"
- button "Delete prayer-recurring-prayer"
- text: Month overview
- button "Prev"
- text: September 2026
- button "Next"
- text: S M T W T F S
- button "Aug 30, 2026": "30"
- button "Aug 31, 2026, Bible reading": "31"
- button "Sep 1, 2026": "1"
- button "Sep 2, 2026": "2"
- button "Sep 3, 2026": "3"
- button "Sep 4, 2026": "4"
- button "Sep 5, 2026": "5"
- button "Sep 6, 2026": "6"
- button "Sep 7, 2026": "7"
- button "Sep 8, 2026": "8"
- button "Sep 9, 2026": "9"
- button "Sep 10, 2026": "10"
- button "Sep 11, 2026": "11"
- button "Sep 12, 2026": "12"
- button "Sep 13, 2026": "13"
- button "Sep 14, 2026": "14"
- button "Sep 15, 2026": "15"
- button "Sep 16, 2026": "16"
- button "Sep 17, 2026": "17"
- button "Sep 18, 2026": "18"
- button "Sep 19, 2026": "19"
- button "Sep 20, 2026": "20"
- button "Sep 21, 2026": "21"
- button "Sep 22, 2026": "22"
- button "Sep 23, 2026": "23"
- button "Sep 24, 2026": "24"
- button "Sep 25, 2026": "25"
- button "Sep 26, 2026, Bible reading": "26"
- button "Sep 27, 2026, Bible reading, Prayer, Fasting, Church, Event, Mountain Rhythm, selected": "27"
- button "Sep 28, 2026, Prayer, Mountain Rhythm": "28"
- button "Sep 29, 2026, Mountain Rhythm": "29"
- button "Sep 30, 2026, Mountain Rhythm": "30"
- button "Oct 1, 2026, Bible reading, Mountain Rhythm": "1"
- button "Oct 2, 2026, Mountain Rhythm": "2"
- button "Oct 3, 2026, Mountain Rhythm": "3"
```

# Test source

```ts
  1121 |   const today = todayISO();
  1122 |   const monthStart = new Date(`${today.slice(0, 7)}-01T12:00:00Z`);
  1123 |   const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
  1124 |   const previousMonthEnd = shiftDate(`${today.slice(0, 7)}-01`, -1);
  1125 |   const nextMonthStart = shiftDate(monthEnd.toISOString().slice(0, 10), 1);
  1126 |   const onlyBibleDate = shiftDate(today, -1);
  1127 |   const recurringBibleDate = shiftDate(today, 1);
  1128 |   const completedDate = shiftDate(today, 8);
  1129 |   const incompleteDate = shiftDate(today, 9);
  1130 |   const assignedBibleDates = new Set([
  1131 |     onlyBibleDate,
  1132 |     today,
  1133 |     completedDate,
  1134 |     incompleteDate,
  1135 |     previousMonthEnd,
  1136 |     nextMonthStart,
  1137 |   ]);
  1138 |   const noReadingDate = Array.from({ length: monthEnd.getUTCDate() }, (_, index) =>
  1139 |     shiftDate(`${today.slice(0, 7)}-01`, index),
  1140 |   ).find((date) => !assignedBibleDates.has(date));
  1141 | 
  1142 |   if (!noReadingDate) {
  1143 |     throw new Error("Could not find an unassigned date in the displayed month");
  1144 |   }
  1145 | 
  1146 |   const ordinaryPlan = {
  1147 |     ...makeOrdinaryPlan("calendar-bible-ordinary", "Morning Psalms"),
  1148 |     assignments: [
  1149 |       { date: onlyBibleDate, readings: [{ key: "only-bible-reading", label: "Psalm 1" }] },
  1150 |       {
  1151 |         date: today,
  1152 |         readings: [
  1153 |           { key: "ordinary-today-reading", label: "Psalm 2" },
  1154 |           { key: "ordinary-today-reflection", label: "Psalm 3" },
  1155 |         ],
  1156 |       },
  1157 |       { date: completedDate, readings: [{ key: "completed-reading", label: "Psalm 4" }] },
  1158 |       { date: incompleteDate, readings: [{ key: "incomplete-reading", label: "Psalm 5" }] },
  1159 |       { date: previousMonthEnd, readings: [{ key: "previous-month-reading", label: "Psalm 6" }] },
  1160 |       { date: nextMonthStart, readings: [{ key: "next-month-reading", label: "Psalm 7" }] },
  1161 |     ],
  1162 |     completed: { "completed-reading": true },
  1163 |   };
  1164 |   const secondPlan = {
  1165 |     ...makeOrdinaryPlan("calendar-bible-second", "Evening Proverbs"),
  1166 |     assignments: [
  1167 |       { date: today, readings: [{ key: "second-plan-reading", label: "Proverbs 1" }] },
  1168 |     ],
  1169 |   };
  1170 |   const structuredPlan = makeStructuredClimbPlan("calendar-bible-climb", "7-Day Climb");
  1171 |   const mountainCompletedDate = structuredPlan.assignments[0].date;
  1172 |   structuredPlan.completed = Object.fromEntries(
  1173 |     structuredPlan.assignments[0].readings.map((reading: { key: string }) => [reading.key, true]),
  1174 |   );
  1175 |   const events = [
  1176 |     event("all-prayer", "prayer", today),
  1177 |     event("all-fast", "fast", today),
  1178 |     event("all-church", "church", today),
  1179 |     event("all-event", "event", today),
  1180 |     event("all-birthday", "birthday", today),
  1181 |     event("recurring-prayer", "prayer", today, {
  1182 |       repeat: "daily",
  1183 |       repeatUntil: recurringBibleDate,
  1184 |     }),
  1185 |   ];
  1186 | 
  1187 |   await stubHomeApi(page, [ordinaryPlan, secondPlan, structuredPlan], events);
  1188 |   await seedPlans(page, [ordinaryPlan, secondPlan, structuredPlan], events);
  1189 | 
  1190 |   for (const width of [360, 1280]) {
  1191 |     await page.setViewportSize({ width, height: 900 });
  1192 |     await page.goto("/");
  1193 |     const navigation = await openDashboardNavigation(page);
  1194 |     await navigation.getByRole("button", { name: "Calendar", exact: true }).click();
  1195 | 
  1196 |     const marker = (date: string) => page.getByTestId(`calendar-marker-${date}-bible`);
  1197 |     const mountainMarker = (date: string) => page.getByTestId(`calendar-marker-${date}-mountain`);
  1198 |     const day = (date: string) => page.getByTestId(`calendar-day-${date}`);
  1199 | 
  1200 |     await expect(marker(onlyBibleDate)).toBeVisible();
  1201 |     await expect(day(onlyBibleDate)).not.toContainText("B");
  1202 |     await expect(day(onlyBibleDate)).toHaveAttribute("aria-label", /Bible reading/);
  1203 | 
  1204 |     const allTypesDay = day(today);
  1205 |     await expect(allTypesDay).toHaveAttribute(
  1206 |       "aria-label",
  1207 |       /Bible reading, Prayer, Fasting, Church, Event/,
  1208 |     );
  1209 |     await expect(allTypesDay).not.toHaveAttribute("aria-label", /Birthday/);
  1210 |     await expect(marker(today)).toBeVisible();
  1211 |     await expect(page.getByTestId(`calendar-marker-${today}-mountain`)).toBeVisible();
  1212 |     await expect(mountainMarker(mountainCompletedDate)).toHaveClass(/text-emerald-400/);
  1213 |     for (const letter of ["P", "F", "C", "E"]) {
  1214 |       await expect(page.getByTestId(`calendar-marker-${today}-${letter}`)).toBeVisible();
  1215 |     }
  1216 |     await expect(allTypesDay.getByTestId(`calendar-marker-${today}-B`)).toHaveCount(0);
  1217 |     await expect(allTypesDay.getByTestId(`calendar-marker-${today}-bible`)).toHaveCount(1);
  1218 | 
  1219 |     await expect(mountainMarker(recurringBibleDate)).toBeVisible();
  1220 |     await expect(page.getByTestId(`calendar-marker-${recurringBibleDate}-P`)).toBeVisible();
> 1221 |     await expect(marker(completedDate)).toBeVisible();
       |                                         ^ Error: expect(locator).toBeVisible() failed
  1222 |      await expect(marker(completedDate)).toHaveClass(/text-emerald-400/);
  1223 |     await expect(marker(incompleteDate)).toBeVisible();
  1224 |      await expect(marker(incompleteDate)).not.toHaveClass(/text-emerald-400/);
  1225 |     await expect(day(noReadingDate)).not.toHaveAttribute("aria-label", /Bible reading/);
  1226 |     await expect(day(noReadingDate).getByTestId(`calendar-marker-${noReadingDate}-bible`)).toHaveCount(0);
  1227 | 
  1228 |     const markerGeometry = await page.evaluate(() =>
  1229 |       Array.from(document.querySelectorAll('[data-testid^="calendar-marker-"]')).map((marker) => {
  1230 |         const cell = marker.closest("button");
  1231 |         const markerRect = marker.getBoundingClientRect();
  1232 |         const cellRect = cell?.getBoundingClientRect();
  1233 |         const dateRect = cell?.querySelector("span.text-sm")?.getBoundingClientRect();
  1234 |         return {
  1235 |           markerLeft: markerRect.left,
  1236 |           markerTop: markerRect.top,
  1237 |           markerRight: markerRect.right,
  1238 |           markerBottom: markerRect.bottom,
  1239 |           cellLeft: cellRect?.left ?? -1,
  1240 |           cellRight: cellRect?.right ?? -1,
  1241 |           cellBottom: cellRect?.bottom ?? -1,
  1242 |           dateBottom: dateRect?.bottom ?? -1,
  1243 |         };
  1244 |       }),
  1245 |     );
  1246 |     expect(markerGeometry.length).toBeGreaterThan(0);
  1247 |     for (const geometry of markerGeometry) {
  1248 |       expect(geometry.markerLeft).toBeGreaterThanOrEqual(geometry.cellLeft - 1);
  1249 |       expect(geometry.markerRight).toBeLessThanOrEqual(geometry.cellRight + 1);
  1250 |       expect(geometry.markerTop).toBeGreaterThanOrEqual(geometry.dateBottom - 1);
  1251 |       expect(geometry.markerBottom).toBeLessThanOrEqual(geometry.cellBottom + 1);
  1252 |     }
  1253 | 
  1254 |     await day(completedDate).click();
  1255 |     await expect(page.getByRole("button", { name: "Undo day", exact: true })).toBeVisible();
  1256 |     await day(incompleteDate).click();
  1257 |     await expect(page.getByRole("button", { name: "Complete day", exact: true })).toBeVisible();
  1258 | 
  1259 |     const previousButton = page.getByTestId("dashboard-calendar-month").getByRole("button", { name: "Prev", exact: true });
  1260 |     await previousButton.click();
  1261 |     await expect(marker(previousMonthEnd)).toBeVisible();
  1262 | 
  1263 |     const nextButton = page.getByTestId("dashboard-calendar-month").getByRole("button", { name: "Next", exact: true });
  1264 |     await nextButton.click();
  1265 |     await nextButton.click();
  1266 |     await expect(marker(nextMonthStart)).toBeVisible();
  1267 |   }
  1268 | });
  1269 | 
  1270 | test("keeps Calendar creation short, guided, and fully configurable", async ({ page }) => {
  1271 |   const plan = makeOrdinaryPlan("calendar-density-plan", "Calendar reading");
  1272 |   const event = {
  1273 |     id: "calendar-density-event",
  1274 |     title: "Morning prayer",
  1275 |     type: "prayer",
  1276 |     date: todayISO(),
  1277 |     time: "06:30",
  1278 |     notes: "A quiet start",
  1279 |     remind: true,
  1280 |     reminderMinutes: 10,
  1281 |     repeat: "none",
  1282 |   };
  1283 |   await stubHomeApi(page, plan, [event]);
  1284 |   await seedPlans(page, [plan], [event]);
  1285 | 
  1286 |   for (const width of [320, 360, 390, 430, 1280]) {
  1287 |     await page.setViewportSize({ width, height: 900 });
  1288 |     await page.goto("/");
  1289 |     const navigation = await openDashboardNavigation(page);
  1290 |     await navigation.getByRole("button", { name: "Calendar", exact: true }).click();
  1291 | 
  1292 |     const calendar = page.getByTestId("dashboard-calendar-month");
  1293 |     const activities = page.getByTestId("dashboard-calendar-activities");
  1294 |     await expect(calendar).toBeVisible();
  1295 |     await expect(activities).toBeVisible();
  1296 |     await expect(page.getByText("Morning prayer", { exact: true })).toBeVisible();
  1297 |     await expect(page.getByTestId("calendar-add-event-control")).toHaveCount(1);
  1298 |     await expect(page.getByTestId("calendar-event-form")).toHaveCount(0);
  1299 | 
  1300 |     const completeActivity = activities.getByRole("button", { name: "Complete activity" });
  1301 |     await completeActivity.click();
  1302 |     await expect(activities.getByRole("button", { name: "Reopen activity" })).toBeVisible();
  1303 |     await activities.getByRole("button", { name: "Reopen activity" }).click();
  1304 |     await expect(activities.getByRole("button", { name: "Complete activity" })).toBeVisible();
  1305 | 
  1306 |     const layout = await page.evaluate(() => {
  1307 |       const month = document.querySelector('[data-testid="dashboard-calendar-month"]');
  1308 |       const activitySection = document.querySelector('[data-testid="dashboard-calendar-activities"]');
  1309 |       const addActivity = document.querySelector('[data-testid="calendar-add-event-control"]');
  1310 |       const dayButtons = Array.from(document.querySelectorAll('[data-testid^="calendar-day-"]'));
  1311 |       const form = document.querySelector('[data-testid="calendar-event-form"]');
  1312 |       const monthRect = month?.getBoundingClientRect();
  1313 |       const activityRect = activitySection?.getBoundingClientRect();
  1314 |       const addActivityRect = addActivity?.getBoundingClientRect();
  1315 |       return {
  1316 |         documentWidth: document.documentElement.scrollWidth,
  1317 |         monthTop: monthRect?.top ?? -1,
  1318 |         activityTop: activityRect?.top ?? -1,
  1319 |         monthLeft: monthRect?.left ?? -1,
  1320 |         activityLeft: activityRect?.left ?? -1,
  1321 |         addActivityTop: addActivityRect?.top ?? -1,
```