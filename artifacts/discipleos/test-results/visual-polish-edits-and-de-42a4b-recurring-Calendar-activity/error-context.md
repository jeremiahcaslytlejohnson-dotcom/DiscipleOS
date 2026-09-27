# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-polish.spec.ts >> edits and deletes a recurring Calendar activity
- Location: tests/e2e/visual-polish.spec.ts:890:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('dashboard-calendar-activities').locator('.discipleos-flat-row').filter({ hasText: 'Evening examen' }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('dashboard-calendar-activities').locator('.discipleos-flat-row').filter({ hasText: 'Evening examen' }).first()

```

```yaml
- button "Feedback"
- heading "DISCIPLEOS" [level=1]
- link "Continue with email":
  - /url: /sign-in
- paragraph: Today’s reading · keep taking the next faithful step
- navigation "Dashboard navigation":
  - button "Today"
  - button "Calendar" [pressed]
  - button "Plans"
  - link "Mountain Rhythm":
    - /url: /mountain-rhythm
  - button "Install App"
  - button "Notifications blocked"
- text: Faith calendar Activities for Sep 27, 2026 Today
- button "Today"
- text: Add activity A few quick choices, then you’re ready.
- button "Hide flow"
- button "Reset"
- text: 1 Activity 2 When 3 Repeat 4 Review What are you adding? Choose an activity to get started.
- button "Prayer Set aside time to pray"
- button "Fast Plan a time of fasting"
- button "Church Make room for church"
- button "Event Add a custom activity"
- button "Next" [disabled]
- status:
  - text: Activity updated Evening examen · Sep 27, 2026
  - button "Edit activity"
  - button "Complete activity"
  - button "Add another"
  - button "Done"
- text: Reading Recurring event coverage bible 7:00 AM 1 chapters assigned
- button "Complete day"
- button "Psalm 1"
- text: Month overview
- button "Prev"
- text: September 2026
- button "Next"
- text: S M T W T F S
- button "Aug 30, 2026": "30"
- button "Aug 31, 2026": "31"
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
- button "Sep 26, 2026": "26"
- button "Sep 27, 2026, Bible reading, selected": "27"
- button "Sep 28, 2026, Prayer": "28"
- button "Sep 29, 2026, Prayer": "29"
- button "Sep 30, 2026, Prayer": "30"
- button "Oct 1, 2026, Prayer": "1"
- button "Oct 2, 2026, Prayer": "2"
- button "Oct 3, 2026": "3"
```

# Test source

```ts
  851  |   const day = page.getByTestId(`calendar-day-${todayISO()}`);
  852  |   await expect(day).toHaveAttribute("aria-label", /Prayer/);
  853  |   await expect(day).toContainText(String(new Date().getDate()));
  854  |   await expect(day.getByTestId(`calendar-marker-${todayISO()}-P`)).toHaveText("P");
  855  |   await day.click();
  856  |   await expect(page.getByText(/^Activities for /)).toBeVisible();
  857  |   await expect(page.getByText("Morning prayer", { exact: true })).toBeVisible();
  858  |   await page.getByTestId("dashboard-calendar-activities").getByRole("button", { name: "Complete activity" }).click();
  859  |   await expect(page.getByTestId(`calendar-marker-${todayISO()}-P`)).toHaveClass(/text-emerald-400/);
  860  | });
  861  | 
  862  | test("lets custom events be completed and reopened", async ({ page }) => {
  863  |   const event = {
  864  |     id: "visual-polish-custom-event",
  865  |     title: "Fellowship gathering",
  866  |     type: "event",
  867  |     date: todayISO(),
  868  |     time: "18:00",
  869  |     notes: "A custom event",
  870  |     remind: false,
  871  |     repeat: "none",
  872  |     countsTowardRhythm: false,
  873  |   };
  874  |   const plan = makeOrdinaryPlan("custom-event-plan", "Custom event coverage");
  875  |   await stubHomeApi(page, plan, [event]);
  876  |   await seedPlans(page, [plan], [event]);
  877  |   await page.goto("/");
  878  | 
  879  |   const navigation = await openDashboardNavigation(page);
  880  |   await navigation.getByRole("button", { name: "Calendar", exact: true }).click();
  881  |   const activities = page.getByTestId("dashboard-calendar-activities");
  882  |   await expect(activities.getByText("Fellowship gathering", { exact: true })).toBeVisible();
  883  |   await expect(activities.getByRole("button", { name: "Complete activity" })).toBeVisible();
  884  |   await activities.getByRole("button", { name: "Complete activity" }).click();
  885  |   await expect(activities.getByRole("button", { name: "Reopen activity" })).toBeVisible();
  886  |   await activities.getByRole("button", { name: "Reopen activity" }).click();
  887  |   await expect(activities.getByRole("button", { name: "Complete activity" })).toBeVisible();
  888  | });
  889  | 
  890  | test("edits and deletes a recurring Calendar activity", async ({ page }) => {
  891  |   const today = todayISO();
  892  |   const addDays = (amount: number) => {
  893  |     const date = new Date(`${today}T12:00:00Z`);
  894  |     date.setUTCDate(date.getUTCDate() + amount);
  895  |     return date.toISOString().slice(0, 10);
  896  |   };
  897  |   const event = {
  898  |     id: "visual-polish-recurring-event",
  899  |     title: "Morning examen",
  900  |     type: "prayer",
  901  |     date: today,
  902  |     time: "06:30",
  903  |     notes: "A recurring prayer",
  904  |     remind: false,
  905  |     repeat: "daily",
  906  |     repeatWeekdays: [0, 1, 2, 3, 4, 5, 6],
  907  |     repeatUntil: addDays(1),
  908  |   };
  909  |   const plan = makeOrdinaryPlan("recurring-event-plan", "Recurring event coverage");
  910  | 
  911  |   await stubHomeApi(page, plan, [event]);
  912  |   await seedPlans(page, [plan], [event]);
  913  |   await page.goto("/");
  914  | 
  915  |   const navigation = await openDashboardNavigation(page);
  916  |   await navigation.getByRole("button", { name: "Calendar", exact: true }).click();
  917  |   const activities = page.getByTestId("dashboard-calendar-activities");
  918  |   const initialRow = activities.locator(".discipleos-flat-row").filter({ hasText: event.title }).first();
  919  |   await expect(initialRow).toBeVisible();
  920  | 
  921  |   await initialRow.getByRole("button", { name: `Edit ${event.title}`, exact: true }).click();
  922  |   const editForm = page.getByTestId("calendar-event-form");
  923  |   await expect(editForm.getByLabel("Title")).toHaveValue(event.title);
  924  |   await expect(editForm.getByLabel("Repeats")).toHaveValue("daily");
  925  | 
  926  |   const updatedTitle = "Evening examen";
  927  |   const updatedRepeatUntil = addDays(7);
  928  |   await editForm.getByLabel("Title").fill(updatedTitle);
  929  |   await editForm.getByLabel("Repeats").selectOption("weekly");
  930  |   await editForm.getByLabel("Ends on").fill(updatedRepeatUntil);
  931  |   await editForm.getByRole("button", { name: "S", exact: true }).first().click();
  932  |   await editForm.getByRole("button", { name: "S", exact: true }).last().click();
  933  | 
  934  |   const updateRequest = page.waitForRequest(
  935  |     (request) =>
  936  |       new URL(request.url()).pathname.endsWith("/api/events") &&
  937  |       request.method() === "POST" &&
  938  |       request.postDataJSON()?.replacesEventId === event.id,
  939  |   );
  940  |   await editForm.getByRole("button", { name: "Save Activity", exact: true }).click();
  941  |   const updatedEventRequest = await updateRequest;
  942  |   expect(updatedEventRequest.postDataJSON()).toMatchObject({
  943  |     title: updatedTitle,
  944  |     repeat: "weekly",
  945  |     repeatUntil: updatedRepeatUntil,
  946  |     repeatWeekdays: [1, 2, 3, 4, 5],
  947  |     replacesEventId: event.id,
  948  |   });
  949  |   await expect(page.getByTestId("calendar-activity-feedback")).toContainText("Activity updated");
  950  |   const updatedRow = activities.locator(".discipleos-flat-row").filter({ hasText: updatedTitle }).first();
> 951  |   await expect(updatedRow).toBeVisible();
       |                            ^ Error: expect(locator).toBeVisible() failed
  952  | 
  953  |   await updatedRow.getByRole("button", { name: `Edit ${updatedTitle}`, exact: true }).click();
  954  |   const reopenedEditForm = page.getByTestId("calendar-event-form");
  955  |   await expect(reopenedEditForm.getByLabel("Title")).toHaveValue(updatedTitle);
  956  |   await expect(reopenedEditForm.getByLabel("Repeats")).toHaveValue("weekly");
  957  |   await expect(reopenedEditForm.getByLabel("Ends on")).toHaveValue(updatedRepeatUntil);
  958  |   await expect(reopenedEditForm.getByRole("button", { name: "S", exact: true }).first()).toHaveAttribute(
  959  |     "aria-pressed",
  960  |     "false",
  961  |   );
  962  |   await expect(reopenedEditForm.getByRole("button", { name: "S", exact: true }).last()).toHaveAttribute(
  963  |     "aria-pressed",
  964  |     "false",
  965  |   );
  966  |   await reopenedEditForm.getByRole("button", { name: "Cancel edit", exact: true }).click();
  967  | 
  968  |   const deleteRequest = page.waitForRequest(
  969  |     (request) =>
  970  |       new URL(request.url()).pathname.endsWith("/api/events") &&
  971  |       request.method() === "DELETE" &&
  972  |       request.postDataJSON()?.id !== undefined,
  973  |   );
  974  |   await updatedRow.getByRole("button", { name: `Delete ${updatedTitle}`, exact: true }).click();
  975  |   const deletedEventRequest = await deleteRequest;
  976  |   expect(deletedEventRequest.postDataJSON()).toMatchObject({ id: expect.any(String) });
  977  |   await expect(activities.getByText(updatedTitle, { exact: true })).toHaveCount(0);
  978  | });
  979  | 
  980  | test("shows distinct accessible activity markers across Calendar dates and layouts", async ({ page }) => {
  981  |   const toDate = (date: Date) => date.toISOString().slice(0, 10);
  982  |   const shiftDate = (dateISO: string, amount: number) => {
  983  |     const date = new Date(`${dateISO}T12:00:00Z`);
  984  |     date.setUTCDate(date.getUTCDate() + amount);
  985  |     return toDate(date);
  986  |   };
  987  |   const today = todayISO();
  988  |   const currentMonth = new Date(`${today}T12:00:00Z`);
  989  |   const monthStart = toDate(new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth(), 1)));
  990  |   const monthEnd = toDate(new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + 1, 0)));
  991  |   const nextMonthStart = shiftDate(monthEnd, 1);
  992  |   const allTypesDate = shiftDate(monthStart, 1);
  993  |   const emptyDate = shiftDate(monthStart, 2);
  994  |   const oneMarkerDate = shiftDate(monthStart, 3);
  995  |   const duplicateTypeDate = shiftDate(monthStart, 4);
  996  |   const recurringStart = shiftDate(monthStart, 10);
  997  |   const recurringDates = [recurringStart, shiftDate(recurringStart, 1), shiftDate(recurringStart, 2)];
  998  |   const previousMonthEnd = shiftDate(monthStart, -1);
  999  | 
  1000 |   const event = (id: string, type: string, date: string, extra: Record<string, unknown> = {}) => ({
  1001 |     id,
  1002 |     title: `${type}-${id}`,
  1003 |     type,
  1004 |     date,
  1005 |     time: "06:30",
  1006 |     notes: "",
  1007 |     remind: false,
  1008 |     repeat: "none",
  1009 |     ...extra,
  1010 |   });
  1011 |   const events = [
  1012 |     event("all-prayer", "prayer", allTypesDate),
  1013 |     event("all-fast", "fast", allTypesDate),
  1014 |     event("all-church", "church", allTypesDate),
  1015 |     event("all-event", "event", allTypesDate),
  1016 |     event("all-birthday", "birthday", allTypesDate),
  1017 |     event("one-church", "church", oneMarkerDate),
  1018 |     event("duplicate-prayer-a", "prayer", duplicateTypeDate),
  1019 |     event("duplicate-prayer-b", "prayer", duplicateTypeDate),
  1020 |     event("recurring-prayer", "prayer", recurringStart, {
  1021 |       repeat: "daily",
  1022 |       repeatUntil: shiftDate(recurringStart, 2),
  1023 |     }),
  1024 |     event("previous-month-birthday", "birthday", previousMonthEnd),
  1025 |     event("next-month-custom", "event", nextMonthStart),
  1026 |   ];
  1027 |   const plan = makeOrdinaryPlan("calendar-marker-plan", "Calendar reading");
  1028 | 
  1029 |   await stubHomeApi(page, plan, events);
  1030 |   await seedPlans(page, [plan], events);
  1031 | 
  1032 |   for (const width of [360, 1280]) {
  1033 |     await page.setViewportSize({ width, height: 900 });
  1034 |     await page.goto("/");
  1035 |     const navigation = await openDashboardNavigation(page);
  1036 |     await navigation.getByRole("button", { name: "Calendar", exact: true }).click();
  1037 | 
  1038 |     const allTypesDay = page.getByTestId(`calendar-day-${allTypesDate}`);
  1039 |     await expect(allTypesDay).toHaveAttribute(
  1040 |       "aria-label",
  1041 |       new RegExp("Prayer, Fasting, Church, Event"),
  1042 |     );
  1043 |     await expect(allTypesDay).not.toHaveAttribute("aria-label", /Birthday/);
  1044 |     for (const letter of ["P", "F", "C", "E"]) {
  1045 |       await expect(page.getByTestId(`calendar-marker-${allTypesDate}-${letter}`)).toBeVisible();
  1046 |     }
  1047 |     await expect(page.getByTestId(`calendar-marker-${allTypesDate}-B`)).toHaveCount(0);
  1048 |     expect(await allTypesDay.getByTestId(`calendar-marker-${allTypesDate}-P`).count()).toBe(1);
  1049 |     expect(await allTypesDay.getByTestId(`calendar-marker-${allTypesDate}-F`).count()).toBe(1);
  1050 |     expect(await allTypesDay.getByTestId(`calendar-marker-${allTypesDate}-C`).count()).toBe(1);
  1051 |     expect(await allTypesDay.getByTestId(`calendar-marker-${allTypesDate}-E`).count()).toBe(1);
```