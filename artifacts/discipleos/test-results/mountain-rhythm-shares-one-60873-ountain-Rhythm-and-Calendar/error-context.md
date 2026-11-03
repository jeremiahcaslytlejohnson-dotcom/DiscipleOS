# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> shares one prayer occurrence completion between Mountain Rhythm and Calendar
- Location: tests/e2e/mountain-rhythm.spec.ts:731:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByTestId('mountain-rhythm-disciplines')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('mountain-rhythm-disciplines')
    14 × locator resolved to <section class="mt-5 min-w-0" data-component-name="section" data-testid="mountain-rhythm-disciplines" data-replit-metadata="artifacts/discipleos/src/components/MountainRhythmDisciplines.tsx:378:4">…</section>
       - unexpected value "hidden"

```

```yaml
- button "Feedback"
- banner:
  - button "Back to Today"
- main:
  - text: My Ascent
  - heading "Mountain Rhythm" [level=1]
  - button "Manage climb"
  - paragraph: One clear route for Scripture consistency. Choose a structured climb, then take the next faithful step.
  - text: Mountain Rhythm 7-Day Climb · active reading climb Today’s reading Ready for today 0% of today’s reading Journey progress 0.0% 0 of 7 planned days Consistency 0% Needs a next step consistency
  - img "7-Day Climb reading-rhythm trail; current elevation 0%, journey progress 0%": Basecamp On the Trail Gaining Elevation Ridgeline Summit Today
  - list "Elevation milestones":
    - listitem: "Basecamp: 0%"
    - listitem: "On the Trail: 25%"
    - listitem: "Gaining Elevation: 50%"
    - listitem: "Ridgeline: 70%"
    - listitem: "Summit: 85%"
  - paragraph: "Current: Basecamp · Next: On the Trail Current elevation: Basecamp · 0% · Today, Nov 3 · Day 1"
  - group: How Mountain Rhythm works
  - text: Route to today
  - paragraph: 7-Day Climb · future readings stay hidden until their day
  - text: 0/7 days Today’s next step Ready for today 0% of today's reading complete
  - button "Collapse Day 1 readings, Nov 3, 2026, Next step, 2 readings, estimated reading time 6 min" [expanded]: 1 Nov 3, 2026 Today 2 readings · ≈ 6 min Next step
  - button "Complete day"
  - button "Reading 1A"
  - button "Reading 1B"
  - group: Optional commitments · Prayer and fasting
```

# Test source

```ts
  667 |     completed: true,
  668 |   });
  669 |   await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("0 of 7 planned days");
  670 | 
  671 |   await page.reload();
  672 |   const restoredTracker = page.getByTestId("mountain-rhythm-disciplines");
  673 |   await expect(restoredTracker.getByRole("checkbox").nth(0)).toBeChecked();
  674 |   await expect(restoredTracker.getByRole("checkbox").nth(1)).toBeChecked();
  675 |   await expect(restoredTracker.getByTestId("mountain-rhythm-commitment-invitation")).toHaveCount(0);
  676 |   await expect(restoredTracker).toContainText("07:15 · Weekly");
  677 |   await expect(restoredTracker).toContainText("7 all-day dates");
  678 |   await expect(restoredTracker.getByTestId("discipline-summary-prayer"))
  679 |     .toContainText("Prayer: 1 of 1 scheduled times completed");
  680 |   const undoPrayerRequest = page.waitForRequest(
  681 |     (request) => request.url().endsWith("/api/events/complete") && request.method() === "POST",
  682 |   );
  683 |   await restoredTracker.getByRole("button", { name: `Undo prayer for ${startDate}` }).click();
  684 |   expect((await undoPrayerRequest).postDataJSON()).toMatchObject({
  685 |     eventId: savedPrayer.id,
  686 |     occurrenceDate: startDate,
  687 |     completed: false,
  688 |   });
  689 |   const redoPrayerRequest = page.waitForRequest(
  690 |     (request) => request.url().endsWith("/api/events/complete") && request.method() === "POST",
  691 |   );
  692 |   await restoredTracker.getByRole("button", { name: `Mark complete prayer for ${startDate}` }).click();
  693 |   expect((await redoPrayerRequest).postDataJSON()).toMatchObject({
  694 |     eventId: savedPrayer.id,
  695 |     occurrenceDate: startDate,
  696 |     completed: true,
  697 |   });
  698 |   const editPrayer = restoredTracker.getByRole("button", { name: "Edit schedule" }).first();
  699 |   await editPrayer.click();
  700 |   await restoredTracker.getByRole("button", { name: "Next", exact: true }).click();
  701 |   const repeatedSave = page.waitForRequest(
  702 |     (request) => request.url().endsWith("/api/events") && request.method() === "POST" && request.postDataJSON()?.type === "prayer",
  703 |   );
  704 |   await restoredTracker.getByRole("button", { name: "Save schedule" }).click();
  705 |   expect((await repeatedSave).postDataJSON().id).toBe(savedPrayer.id);
  706 |   await expect(restoredTracker.getByTestId("discipline-summary-prayer"))
  707 |     .toContainText("Prayer: 1 of 1 scheduled times completed");
  708 |   await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("0 of 7 planned days");
  709 |   await restoredTracker.getByRole("checkbox").nth(1).check();
  710 |   await expect(restoredTracker.getByRole("checkbox").nth(1)).toBeChecked();
  711 |   await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("0 of 7 planned days");
  712 | 
  713 |   page.on("dialog", (dialog) => dialog.accept());
  714 |   const endEarlyRequest = page.waitForRequest(
  715 |     (request) =>
  716 |       request.url().endsWith("/api/events") &&
  717 |       request.method() === "POST" &&
  718 |       request.postDataJSON()?.id === savedPrayer.id &&
  719 |       request.postDataJSON()?.repeatUntil === startDate,
  720 |   );
  721 |   await restoredTracker.getByRole("button", { name: "End early" }).first().click();
  722 |   expect((await endEarlyRequest).postDataJSON()).toMatchObject({
  723 |     id: savedPrayer.id,
  724 |     repeatUntil: startDate,
  725 |   });
  726 |   await expect(restoredTracker.getByRole("checkbox").nth(0)).not.toBeChecked();
  727 |   await expect(restoredTracker.getByTestId("discipline-summary-prayer"))
  728 |     .toContainText("Prayer: 1 of 1 scheduled times completed");
  729 | });
  730 | 
  731 | test("shares one prayer occurrence completion between Mountain Rhythm and Calendar", async ({ page }) => {
  732 |   const today = new Date().toISOString().slice(0, 10);
  733 |   const plan = makePlan({
  734 |     id: "stage2-cross-view-plan",
  735 |     days: 7,
  736 |     name: "7-Day Climb",
  737 |     today,
  738 |   });
  739 |   const prayerEvent = {
  740 |     id: "stage2-cross-view-prayer",
  741 |     title: "Prayer time",
  742 |     type: "prayer",
  743 |     date: today,
  744 |     time: "06:30",
  745 |     repeat: "weekly",
  746 |     repeatWeekdays: [0, 1, 2, 3, 4, 5, 6],
  747 |     repeatUntil: plan.endDate,
  748 |   };
  749 |   plan.disciplineTracking = {
  750 |     setupAnswered: true,
  751 |     prayer: { enabled: true, eventIds: [prayerEvent.id] },
  752 |     fasting: { enabled: false, eventIds: [] },
  753 |   };
  754 |   await stubApi(page, {
  755 |     success: true,
  756 |     userId: "stage2-cross-view-owner",
  757 |     authenticated: false,
  758 |     established: false,
  759 |   });
  760 |   await seedLocalData(page, [plan], plan.id, {
  761 |     ownerId: "stage2-cross-view-owner",
  762 |     events: [prayerEvent],
  763 |   });
  764 |   await page.setViewportSize({ width: 1280, height: 900 });
  765 |   await page.goto("/mountain-rhythm");
  766 |   const tracker = page.getByTestId("mountain-rhythm-disciplines");
> 767 |   await expect(tracker).toBeVisible();
      |                         ^ Error: expect(locator).toBeVisible() failed
  768 |   await expect(tracker.getByTestId("discipline-summary-prayer"))
  769 |     .toContainText("Prayer: 0 of 1 scheduled times completed");
  770 |   await tracker.getByRole("button", { name: `Mark complete prayer for ${today}` }).click();
  771 |   await expect(tracker.getByTestId("discipline-summary-prayer"))
  772 |     .toContainText("Prayer: 1 of 1 scheduled times completed");
  773 | 
  774 |   await page.goto("/");
  775 |   await page.getByTestId("dashboard-navigation-row").getByRole("button", { name: "Calendar", exact: true }).click();
  776 |   const activities = page.getByTestId("dashboard-calendar-activities");
  777 |   await expect(activities.getByRole("button", { name: "Reopen activity" })).toBeVisible();
  778 |   await activities.getByRole("button", { name: "Reopen activity" }).click();
  779 |   await expect(activities.getByRole("button", { name: "Complete activity" })).toBeVisible();
  780 | 
  781 |   await page.goto("/mountain-rhythm");
  782 |   await expect(page.getByTestId("mountain-rhythm-disciplines")
  783 |     .getByTestId("discipline-summary-prayer"))
  784 |     .toContainText("Prayer: 0 of 1 scheduled times completed");
  785 | });
  786 | 
  787 | test("requires confirmation to replace a hidden active climb and keeps unrelated local plans", async ({ page }) => {
  788 |   const ownerId = "anonymous-replacement-owner";
  789 |   const existingPlan = makePlan({
  790 |     id: "ordinary-kept-during-replacement",
  791 |     days: 7,
  792 |     name: "Ordinary reading plan",
  793 |     today: "2026-10-12",
  794 |   });
  795 |   existingPlan.journeyKey = "custom";
  796 |   existingPlan.journeyType = "custom";
  797 |   const hiddenClimb = makePlan({
  798 |     id: "hidden-server-climb",
  799 |     days: 7,
  800 |     name: "7-Day Climb",
  801 |     today: "2026-10-12",
  802 |     completedIndexes: [0],
  803 |   });
  804 |   let serverPlans: any[] = [];
  805 |   let replacementCalls = 0;
  806 |   let replacementRequest: any = null;
  807 |   let sessionEstablished = false;
  808 | 
  809 |   await page.route("**/api/**", async (route) => {
  810 |     const request = route.request();
  811 |     const pathname = new URL(request.url()).pathname;
  812 |     if (pathname.endsWith("/session/info")) {
  813 |       await route.fulfill({
  814 |         status: 200,
  815 |         contentType: "application/json",
  816 |         body: JSON.stringify({
  817 |           success: true,
  818 |           userId: ownerId,
  819 |           authenticated: false,
  820 |           established: sessionEstablished,
  821 |         }),
  822 |       });
  823 |     } else if (pathname.endsWith("/reading/plans") && request.method() === "GET") {
  824 |       await route.fulfill({
  825 |         status: 200,
  826 |         contentType: "application/json",
  827 |         body: JSON.stringify({ success: true, plans: serverPlans }),
  828 |       });
  829 |     } else if (pathname.endsWith("/reading/plans") && request.method() === "POST") {
  830 |       await route.fulfill({
  831 |         status: 409,
  832 |         contentType: "application/json",
  833 |         body: JSON.stringify({
  834 |           success: false,
  835 |           error: "A structured climb is already active",
  836 |           activePlanId: hiddenClimb.id,
  837 |         }),
  838 |       });
  839 |     } else if (pathname.endsWith("/reading/plans/replace-active")) {
  840 |       replacementCalls += 1;
  841 |       replacementRequest = request.postDataJSON();
  842 |       const newPlan = replacementRequest.plan;
  843 |       const oldPlan = {
  844 |         ...hiddenClimb,
  845 |         structuredLifecycle: "cancelled",
  846 |         cancelledAt: new Date().toISOString(),
  847 |         supersededByPlanId: newPlan.id,
  848 |       };
  849 |       serverPlans = [newPlan, oldPlan];
  850 |       sessionEstablished = true;
  851 |       await route.fulfill({
  852 |         status: 200,
  853 |         contentType: "application/json",
  854 |         body: JSON.stringify({ success: true, replacedPlan: oldPlan, plan: newPlan }),
  855 |       });
  856 |     } else if (pathname.endsWith("/events")) {
  857 |       await route.fulfill({
  858 |         status: 200,
  859 |         contentType: "application/json",
  860 |         body: JSON.stringify({ success: true, events: [] }),
  861 |       });
  862 |     } else if (pathname.endsWith("/rhythm/score")) {
  863 |       await route.fulfill({
  864 |         status: 200,
  865 |         contentType: "application/json",
  866 |         body: JSON.stringify({ success: true, eventCompletions: [] }),
  867 |       });
```