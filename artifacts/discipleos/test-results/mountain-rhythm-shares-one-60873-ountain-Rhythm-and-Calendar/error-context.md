# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> shares one prayer occurrence completion between Mountain Rhythm and Calendar
- Location: tests/e2e/mountain-rhythm.spec.ts:681:1

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
    13 × locator resolved to <section class="mt-5 min-w-0" data-component-name="section" data-testid="mountain-rhythm-disciplines" data-replit-metadata="artifacts/discipleos/src/components/MountainRhythmDisciplines.tsx:378:4">…</section>
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
  - img "7-Day Climb reading-rhythm trail; current elevation 0%, journey progress 0%": Basecamp On the Trail GainingElevation Ridgeline Summit Today
  - list "Elevation milestones":
    - listitem: "Basecamp: 0%"
    - listitem: "On the Trail: 25%"
    - listitem: "Gaining Elevation: 50%"
    - listitem: "Ridgeline: 70%"
    - listitem: "Summit: 85%"
  - paragraph: "Current: Basecamp · Next: On the Trail Current elevation: Basecamp · 0% · Today, Oct 21 · Day 1"
  - group: How Mountain Rhythm works
  - text: Route to today
  - paragraph: 7-Day Climb · future readings stay hidden until their day
  - text: 0/7 days Today’s next step Ready for today 0% of today's reading complete
  - button "Collapse Day 1 readings, Oct 21, 2026, Next step, 2 readings, estimated reading time 6 min" [expanded]: 1 Oct 21, 2026 Today 2 readings · ≈ 6 min Next step
  - button "Complete day"
  - button "Reading 1A"
  - button "Reading 1B"
  - group: Optional commitments · Prayer and fasting
```

# Test source

```ts
  617 |     completed: true,
  618 |   });
  619 |   await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("0 of 7 planned days");
  620 | 
  621 |   await page.reload();
  622 |   const restoredTracker = page.getByTestId("mountain-rhythm-disciplines");
  623 |   await expect(restoredTracker.getByRole("checkbox").nth(0)).toBeChecked();
  624 |   await expect(restoredTracker.getByRole("checkbox").nth(1)).toBeChecked();
  625 |   await expect(restoredTracker.getByTestId("mountain-rhythm-commitment-invitation")).toHaveCount(0);
  626 |   await expect(restoredTracker).toContainText("07:15 · Weekly");
  627 |   await expect(restoredTracker).toContainText("7 all-day dates");
  628 |   await expect(restoredTracker.getByTestId("discipline-summary-prayer"))
  629 |     .toContainText("Prayer: 1 of 1 scheduled times completed");
  630 |   const undoPrayerRequest = page.waitForRequest(
  631 |     (request) => request.url().endsWith("/api/events/complete") && request.method() === "POST",
  632 |   );
  633 |   await restoredTracker.getByRole("button", { name: `Undo prayer for ${startDate}` }).click();
  634 |   expect((await undoPrayerRequest).postDataJSON()).toMatchObject({
  635 |     eventId: savedPrayer.id,
  636 |     occurrenceDate: startDate,
  637 |     completed: false,
  638 |   });
  639 |   const redoPrayerRequest = page.waitForRequest(
  640 |     (request) => request.url().endsWith("/api/events/complete") && request.method() === "POST",
  641 |   );
  642 |   await restoredTracker.getByRole("button", { name: `Mark complete prayer for ${startDate}` }).click();
  643 |   expect((await redoPrayerRequest).postDataJSON()).toMatchObject({
  644 |     eventId: savedPrayer.id,
  645 |     occurrenceDate: startDate,
  646 |     completed: true,
  647 |   });
  648 |   const editPrayer = restoredTracker.getByRole("button", { name: "Edit schedule" }).first();
  649 |   await editPrayer.click();
  650 |   await restoredTracker.getByRole("button", { name: "Next", exact: true }).click();
  651 |   const repeatedSave = page.waitForRequest(
  652 |     (request) => request.url().endsWith("/api/events") && request.method() === "POST" && request.postDataJSON()?.type === "prayer",
  653 |   );
  654 |   await restoredTracker.getByRole("button", { name: "Save schedule" }).click();
  655 |   expect((await repeatedSave).postDataJSON().id).toBe(savedPrayer.id);
  656 |   await expect(restoredTracker.getByTestId("discipline-summary-prayer"))
  657 |     .toContainText("Prayer: 1 of 1 scheduled times completed");
  658 |   await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("0 of 7 planned days");
  659 |   await restoredTracker.getByRole("checkbox").nth(1).check();
  660 |   await expect(restoredTracker.getByRole("checkbox").nth(1)).toBeChecked();
  661 |   await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("0 of 7 planned days");
  662 | 
  663 |   page.on("dialog", (dialog) => dialog.accept());
  664 |   const endEarlyRequest = page.waitForRequest(
  665 |     (request) =>
  666 |       request.url().endsWith("/api/events") &&
  667 |       request.method() === "POST" &&
  668 |       request.postDataJSON()?.id === savedPrayer.id &&
  669 |       request.postDataJSON()?.repeatUntil === startDate,
  670 |   );
  671 |   await restoredTracker.getByRole("button", { name: "End early" }).first().click();
  672 |   expect((await endEarlyRequest).postDataJSON()).toMatchObject({
  673 |     id: savedPrayer.id,
  674 |     repeatUntil: startDate,
  675 |   });
  676 |   await expect(restoredTracker.getByRole("checkbox").nth(0)).not.toBeChecked();
  677 |   await expect(restoredTracker.getByTestId("discipline-summary-prayer"))
  678 |     .toContainText("Prayer: 1 of 1 scheduled times completed");
  679 | });
  680 | 
  681 | test("shares one prayer occurrence completion between Mountain Rhythm and Calendar", async ({ page }) => {
  682 |   const today = new Date().toISOString().slice(0, 10);
  683 |   const plan = makePlan({
  684 |     id: "stage2-cross-view-plan",
  685 |     days: 7,
  686 |     name: "7-Day Climb",
  687 |     today,
  688 |   });
  689 |   const prayerEvent = {
  690 |     id: "stage2-cross-view-prayer",
  691 |     title: "Prayer time",
  692 |     type: "prayer",
  693 |     date: today,
  694 |     time: "06:30",
  695 |     repeat: "weekly",
  696 |     repeatWeekdays: [0, 1, 2, 3, 4, 5, 6],
  697 |     repeatUntil: plan.endDate,
  698 |   };
  699 |   plan.disciplineTracking = {
  700 |     setupAnswered: true,
  701 |     prayer: { enabled: true, eventIds: [prayerEvent.id] },
  702 |     fasting: { enabled: false, eventIds: [] },
  703 |   };
  704 |   await stubApi(page, {
  705 |     success: true,
  706 |     userId: "stage2-cross-view-owner",
  707 |     authenticated: false,
  708 |     established: false,
  709 |   });
  710 |   await seedLocalData(page, [plan], plan.id, {
  711 |     ownerId: "stage2-cross-view-owner",
  712 |     events: [prayerEvent],
  713 |   });
  714 |   await page.setViewportSize({ width: 1280, height: 900 });
  715 |   await page.goto("/mountain-rhythm");
  716 |   const tracker = page.getByTestId("mountain-rhythm-disciplines");
> 717 |   await expect(tracker).toBeVisible();
      |                         ^ Error: expect(locator).toBeVisible() failed
  718 |   await expect(tracker.getByTestId("discipline-summary-prayer"))
  719 |     .toContainText("Prayer: 0 of 1 scheduled times completed");
  720 |   await tracker.getByRole("button", { name: `Mark complete prayer for ${today}` }).click();
  721 |   await expect(tracker.getByTestId("discipline-summary-prayer"))
  722 |     .toContainText("Prayer: 1 of 1 scheduled times completed");
  723 | 
  724 |   await page.goto("/");
  725 |   await page.getByTestId("dashboard-navigation-row").getByRole("button", { name: "Calendar", exact: true }).click();
  726 |   const activities = page.getByTestId("dashboard-calendar-activities");
  727 |   await expect(activities.getByRole("button", { name: "Reopen activity" })).toBeVisible();
  728 |   await activities.getByRole("button", { name: "Reopen activity" }).click();
  729 |   await expect(activities.getByRole("button", { name: "Complete activity" })).toBeVisible();
  730 | 
  731 |   await page.goto("/mountain-rhythm");
  732 |   await expect(page.getByTestId("mountain-rhythm-disciplines")
  733 |     .getByTestId("discipline-summary-prayer"))
  734 |     .toContainText("Prayer: 0 of 1 scheduled times completed");
  735 | });
  736 | 
  737 | test("requires confirmation to replace a hidden active climb and keeps unrelated local plans", async ({ page }) => {
  738 |   const ownerId = "anonymous-replacement-owner";
  739 |   const existingPlan = makePlan({
  740 |     id: "ordinary-kept-during-replacement",
  741 |     days: 7,
  742 |     name: "Ordinary reading plan",
  743 |     today: "2026-10-12",
  744 |   });
  745 |   existingPlan.journeyKey = "custom";
  746 |   existingPlan.journeyType = "custom";
  747 |   const hiddenClimb = makePlan({
  748 |     id: "hidden-server-climb",
  749 |     days: 7,
  750 |     name: "7-Day Climb",
  751 |     today: "2026-10-12",
  752 |     completedIndexes: [0],
  753 |   });
  754 |   let serverPlans: any[] = [];
  755 |   let replacementCalls = 0;
  756 |   let replacementRequest: any = null;
  757 |   let sessionEstablished = false;
  758 | 
  759 |   await page.route("**/api/**", async (route) => {
  760 |     const request = route.request();
  761 |     const pathname = new URL(request.url()).pathname;
  762 |     if (pathname.endsWith("/session/info")) {
  763 |       await route.fulfill({
  764 |         status: 200,
  765 |         contentType: "application/json",
  766 |         body: JSON.stringify({
  767 |           success: true,
  768 |           userId: ownerId,
  769 |           authenticated: false,
  770 |           established: sessionEstablished,
  771 |         }),
  772 |       });
  773 |     } else if (pathname.endsWith("/reading/plans") && request.method() === "GET") {
  774 |       await route.fulfill({
  775 |         status: 200,
  776 |         contentType: "application/json",
  777 |         body: JSON.stringify({ success: true, plans: serverPlans }),
  778 |       });
  779 |     } else if (pathname.endsWith("/reading/plans") && request.method() === "POST") {
  780 |       await route.fulfill({
  781 |         status: 409,
  782 |         contentType: "application/json",
  783 |         body: JSON.stringify({
  784 |           success: false,
  785 |           error: "A structured climb is already active",
  786 |           activePlanId: hiddenClimb.id,
  787 |         }),
  788 |       });
  789 |     } else if (pathname.endsWith("/reading/plans/replace-active")) {
  790 |       replacementCalls += 1;
  791 |       replacementRequest = request.postDataJSON();
  792 |       const newPlan = replacementRequest.plan;
  793 |       const oldPlan = {
  794 |         ...hiddenClimb,
  795 |         structuredLifecycle: "cancelled",
  796 |         cancelledAt: new Date().toISOString(),
  797 |         supersededByPlanId: newPlan.id,
  798 |       };
  799 |       serverPlans = [newPlan, oldPlan];
  800 |       sessionEstablished = true;
  801 |       await route.fulfill({
  802 |         status: 200,
  803 |         contentType: "application/json",
  804 |         body: JSON.stringify({ success: true, replacedPlan: oldPlan, plan: newPlan }),
  805 |       });
  806 |     } else if (pathname.endsWith("/events")) {
  807 |       await route.fulfill({
  808 |         status: 200,
  809 |         contentType: "application/json",
  810 |         body: JSON.stringify({ success: true, events: [] }),
  811 |       });
  812 |     } else if (pathname.endsWith("/rhythm/score")) {
  813 |       await route.fulfill({
  814 |         status: 200,
  815 |         contentType: "application/json",
  816 |         body: JSON.stringify({ success: true, eventCompletions: [] }),
  817 |       });
```