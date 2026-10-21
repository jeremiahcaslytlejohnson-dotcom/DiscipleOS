# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> guides optional prayer setup through a confirmed start date and preserves Scripture progress
- Location: tests/e2e/mountain-rhythm.spec.ts:511:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByTestId('mountain-rhythm-disciplines').getByRole('button', { name: /^Day 1/ })
Expected: "true"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByTestId('mountain-rhythm-disciplines').getByRole('button', { name: /^Day 1/ })

```

```yaml
- button "Feedback"
- banner:
  - button "Back"
- main:
  - text: My Ascent
  - heading "Mountain Rhythm" [level=1]
  - paragraph: One clear route for Scripture consistency. Choose a structured climb, then take the next faithful step.
  - text: Mountain Rhythm Choose a 7-, 20-, or 40-day reading climb No current elevation yet
  - paragraph: Choose the 7-Day Climb to begin.
  - text: Step 1 of 3 · Choose your climb
  - paragraph: Choose one structured route. Your other reading plans remain unchanged.
  - button "7-Day Climb A focused week in Genesis. Select route"
  - button "20-Day Reset The four Gospels and Acts over 20 days. Currently locked. Locked" [disabled]
  - button "40-Day Climb A 40-day route from 1 Samuel through Nehemiah. Coming Later" [disabled]
  - button "Close"
  - button "Next" [disabled]
  - text: Choose a route above to see the full ascent, daily readings, milestones, and today's next step.
  - group:
    - text: Optional commitments · Prayer and fasting
    - dialog "Guided prayer and fasting scheduler":
      - text: Guided schedule · Fasting
      - heading "Choose fasting days within this climb" [level=3]
      - paragraph: Fasting dates are only available during an active climb. Wait for a new climb to schedule fasting.
      - button "Add a fasting date" [disabled]
      - paragraph: No valid future fasting dates remain in this climb. Wait for a new climb; this will not extend or replace your current plan.
      - paragraph: No fasting dates selected. You can choose none, or add a valid day above.
      - checkbox "Send fasting reminder" [checked]
      - text: Send fasting reminder
      - combobox "Fasting reminder lead time":
        - option "6 hours before"
        - option "12 hours before (noon the day before)" [selected]
        - option "24 hours before"
      - paragraph: "Time zone: UTC. No climb end date is used."
      - button "Back"
      - button "Next"
      - button "Cancel"
```

# Test source

```ts
  481 |   expect(fastingDatesForClimb("2026-01-01", "2026-01-20", "2026-01-01", "20-day-reset"))
  482 |     .toEqual(["2026-01-01", "2026-01-11"]);
  483 |   expect(fastingDatesForClimb("2026-01-01", "2026-02-09", "2026-01-01", "40-day-climb"))
  484 |     .toEqual(["2026-01-01", "2026-01-11", "2026-01-21", "2026-01-31"]);
  485 |   expect(fastingDatesForClimb("2026-01-01", "2026-01-20", "2026-01-12", "20-day-reset"))
  486 |     .toEqual([]);
  487 |   expect(fastingDatesForClimb("2026-01-01", "2027-01-01", "2026-01-01", "future"))
  488 |     .toEqual([]);
  489 | });
  490 | 
  491 | test("declining both commitments records neither choice without creating events", async ({ page }) => {
  492 |   await stubApi(page, {
  493 |     success: true,
  494 |     userId: "anonymous-no-discipline-session",
  495 |     authenticated: false,
  496 |     established: false,
  497 |   });
  498 |   await seedLocalData(page, [], null, { ownerId: "anonymous-no-discipline-session" });
  499 |   await openMountainRhythm(page);
  500 |   await expandCommitments(page);
  501 |   const tracker = page.getByTestId("mountain-rhythm-disciplines");
  502 |   let eventPosts = 0;
  503 |   page.on("request", (request) => {
  504 |     if (request.url().endsWith("/api/events") && request.method() === "POST") eventPosts++;
  505 |   });
  506 |   await tracker.getByRole("button", { name: "Neither / Not now" }).click();
  507 |   await expect(tracker.getByTestId("mountain-rhythm-commitment-invitation")).toHaveCount(0);
  508 |   expect(eventPosts).toBe(0);
  509 | });
  510 | 
  511 | test("guides optional prayer setup through a confirmed start date and preserves Scripture progress", async ({ page }) => {
  512 |   await stubApi(page, {
  513 |     success: true,
  514 |     userId: "anonymous-mountain-session",
  515 |     authenticated: false,
  516 |     established: false,
  517 |   });
  518 |   await seedLocalData(page, [], null, { ownerId: "anonymous-mountain-session" });
  519 |   await page.setViewportSize({ width: 1280, height: 900 });
  520 |   await openMountainRhythm(page);
  521 |   await expandCommitments(page);
  522 |   const tracker = page.getByTestId("mountain-rhythm-disciplines");
  523 |   await expect(tracker.getByRole("heading", { name: "Add Prayer or Fasting to Your Rhythm" })).toBeVisible();
  524 |   await expect(tracker.getByTestId("mountain-rhythm-commitment-invitation")).toContainText(
  525 |     "optional commitments",
  526 |   );
  527 |   const choices = tracker.getByRole("checkbox");
  528 |   await expect(choices.nth(0)).not.toBeChecked();
  529 |   await expect(choices.nth(1)).not.toBeChecked();
  530 |   const prayerCard = tracker.getByTestId("discipline-choice-card-prayer");
  531 |   const fastingCard = tracker.getByTestId("discipline-choice-card-fasting");
  532 |   const desktopCards = await Promise.all([prayerCard, fastingCard].map((card) =>
  533 |     card.evaluate((node) => {
  534 |       const rect = node.getBoundingClientRect();
  535 |       return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  536 |     }),
  537 |   ));
  538 |   expect(desktopCards[1].x).toBeGreaterThan(desktopCards[0].x);
  539 |   expect(Math.abs(desktopCards[1].y - desktopCards[0].y)).toBeLessThan(2);
  540 |   await prayerCard.getByText("Set aside time to pray").click();
  541 |   await expect(choices.nth(0)).toBeChecked();
  542 |   await choices.nth(1).focus();
  543 |   await choices.nth(1).press("Space");
  544 |   await expect(choices.nth(1)).toBeChecked();
  545 |   await choices.nth(1).press("Space");
  546 |   await expect(choices.nth(1)).not.toBeChecked();
  547 | 
  548 |   await page.setViewportSize({ width: 390, height: 844 });
  549 |   const mobileCards = await Promise.all([prayerCard, fastingCard].map((card) =>
  550 |     card.evaluate((node) => {
  551 |       const rect = node.getBoundingClientRect();
  552 |       return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  553 |     }),
  554 |   ));
  555 |   expect(Math.abs(mobileCards[1].x - mobileCards[0].x)).toBeLessThan(2);
  556 |   expect(mobileCards[1].y).toBeGreaterThan(mobileCards[0].y);
  557 |   expect(mobileCards[1].x + mobileCards[1].width).toBeLessThanOrEqual(390);
  558 | 
  559 |   await fastingCard.getByText("Set your own fasting schedule").click();
  560 |   await tracker.getByRole("button", { name: "Continue" }).click();
  561 |   const startInput = tracker.getByLabel("Commitment start date");
  562 |   const tomorrow = new Date();
  563 |   tomorrow.setDate(tomorrow.getDate() + 1);
  564 |   const expectedTomorrow = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  565 |   await expect(startInput).toHaveValue(expectedTomorrow);
  566 |   let eventPosts = 0;
  567 |   page.on("request", (request) => {
  568 |     if (request.url().endsWith("/api/events") && request.method() === "POST") eventPosts++;
  569 |   });
  570 |   expect(eventPosts).toBe(0);
  571 |   await tracker.getByRole("button", { name: "Today", exact: true }).click();
  572 |   const startDate = await startInput.inputValue();
  573 |   await tracker.getByRole("button", { name: "Confirm start date" }).click();
  574 |   await expect(tracker.getByLabel("Prayer time")).toBeVisible();
  575 |   await expect(tracker.getByLabel("Prayer Sunday")).toHaveAttribute("aria-pressed", "true");
  576 |   await expect(tracker.getByLabel("Prayer Monday")).toHaveAttribute("aria-pressed", "true");
  577 |   await expect(tracker.getByLabel("Prayer Saturday")).toHaveAttribute("aria-pressed", "true");
  578 |   await tracker.getByLabel("Prayer time").fill("07:15");
  579 |   await tracker.getByRole("button", { name: "Next", exact: true }).click();
  580 |   await expect(tracker.getByRole("heading", { name: "Choose fasting days within this climb" })).toBeVisible();
> 581 |   await expect(tracker.getByRole("button", { name: /^Day 1/ })).toHaveAttribute("aria-pressed", "true");
      |                                                                 ^ Error: expect(locator).toHaveAttribute(expected) failed
  582 |   await expect(tracker.getByRole("button", { name: /^Day 7/ })).toBeVisible();
  583 |   for (let day = 2; day <= 7; day++) {
  584 |     await tracker.getByRole("button", { name: new RegExp(`^Day ${day}`) }).click();
  585 |   }
  586 |   for (let day = 1; day <= 7; day++) {
  587 |     await expect(tracker.getByRole("button", { name: new RegExp(`^Day ${day}`) })).toHaveAttribute("aria-pressed", "true");
  588 |   }
  589 |   await expect(tracker.getByLabel("Send fasting reminder")).toBeChecked();
  590 |   await expect(tracker.getByLabel("Fasting reminder lead time")).toHaveValue("720");
  591 |   await expect(tracker.getByLabel("Commitment time")).toHaveCount(0);
  592 |   await tracker.getByRole("button", { name: "Next", exact: true }).click();
  593 |   await expect(tracker.getByRole("heading", { name: "Review your schedule" })).toBeVisible();
  594 |   await expect(tracker.getByTestId("fasting-review-date")).toHaveCount(7);
  595 |   const prayerRequest = page.waitForRequest(
  596 |     (request) => request.url().endsWith("/api/events") && request.method() === "POST" && request.postDataJSON()?.type === "prayer",
  597 |   );
  598 |   const fastingRequest = page.waitForRequest(
  599 |     (request) => request.url().endsWith("/api/events") && request.method() === "POST" && request.postDataJSON()?.type === "fast",
  600 |   );
  601 |   await tracker.getByRole("button", { name: "Save schedule" }).click();
  602 |   await expect(tracker.getByRole("button", { name: "Saving…" })).toBeVisible();
  603 |   const savedPrayer = (await prayerRequest).postDataJSON();
  604 |   const savedFast = (await fastingRequest).postDataJSON();
  605 |   await expect(tracker.getByRole("button", { name: "Saving…" })).toHaveCount(0);
  606 |   expect(savedPrayer.type).toBe("prayer");
  607 |   expect(savedPrayer.repeat).toBe("weekly");
  608 |   expect(savedPrayer.repeatWeekdays).toHaveLength(7);
  609 |   expect(savedPrayer.date).toBe(startDate);
  610 |   expect(savedPrayer.time).toBe("07:15");
  611 |   expect(savedPrayer.remind).toBe(true);
  612 |   expect(savedPrayer.repeatUntil).toBeTruthy();
  613 |   expect(savedFast.type).toBe("fast");
  614 |   expect(savedFast.time).toBe("");
  615 |   expect(savedFast.remind).toBe(true);
  616 |   expect(savedFast.reminderMinutes).toBe(720);
  617 |   expect(savedFast.repeat).toBe("none");
  618 |   expect(savedFast.date).toBe(startDate);
  619 |   expect(eventPosts).toBe(8);
  620 | 
  621 |   const completionRequest = page.waitForRequest(
  622 |     (request) => request.url().endsWith("/api/events/complete") && request.method() === "POST",
  623 |   );
  624 |   await tracker.getByText("Mark complete", { exact: true }).first().click();
  625 |   expect((await completionRequest).postDataJSON()).toMatchObject({
  626 |     eventId: savedPrayer.id,
  627 |     completed: true,
  628 |   });
  629 |   await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("0 of 7 planned days");
  630 | 
  631 |   await page.reload();
  632 |   await expandCommitments(page);
  633 |   const restoredTracker = page.getByTestId("mountain-rhythm-disciplines");
  634 |   await expect(restoredTracker.getByRole("checkbox").nth(0)).toBeChecked();
  635 |   await expect(restoredTracker.getByRole("checkbox").nth(1)).toBeChecked();
  636 |   await expect(restoredTracker.getByTestId("mountain-rhythm-commitment-invitation")).toHaveCount(0);
  637 |   await expect(restoredTracker).toContainText("07:15 · Weekly");
  638 |   await expect(restoredTracker).toContainText("7 all-day dates");
  639 |   await expect(restoredTracker.getByTestId("discipline-summary-prayer"))
  640 |     .toContainText("Prayer: 1 of 1 scheduled times completed");
  641 |   const undoPrayerRequest = page.waitForRequest(
  642 |     (request) => request.url().endsWith("/api/events/complete") && request.method() === "POST",
  643 |   );
  644 |   await restoredTracker.getByRole("button", { name: `Undo prayer for ${startDate}` }).click();
  645 |   expect((await undoPrayerRequest).postDataJSON()).toMatchObject({
  646 |     eventId: savedPrayer.id,
  647 |     occurrenceDate: startDate,
  648 |     completed: false,
  649 |   });
  650 |   const redoPrayerRequest = page.waitForRequest(
  651 |     (request) => request.url().endsWith("/api/events/complete") && request.method() === "POST",
  652 |   );
  653 |   await restoredTracker.getByRole("button", { name: `Mark complete prayer for ${startDate}` }).click();
  654 |   expect((await redoPrayerRequest).postDataJSON()).toMatchObject({
  655 |     eventId: savedPrayer.id,
  656 |     occurrenceDate: startDate,
  657 |     completed: true,
  658 |   });
  659 |   const editPrayer = restoredTracker.getByRole("button", { name: "Edit schedule" }).first();
  660 |   await editPrayer.click();
  661 |   await restoredTracker.getByRole("button", { name: "Next", exact: true }).click();
  662 |   const repeatedSave = page.waitForRequest(
  663 |     (request) => request.url().endsWith("/api/events") && request.method() === "POST" && request.postDataJSON()?.type === "prayer",
  664 |   );
  665 |   await restoredTracker.getByRole("button", { name: "Save schedule" }).click();
  666 |   expect((await repeatedSave).postDataJSON().id).toBe(savedPrayer.id);
  667 |   await expect(restoredTracker.getByTestId("discipline-summary-prayer"))
  668 |     .toContainText("Prayer: 1 of 1 scheduled times completed");
  669 |   await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("0 of 7 planned days");
  670 |   await restoredTracker.getByRole("checkbox").nth(1).check();
  671 |   await expect(restoredTracker.getByRole("checkbox").nth(1)).toBeChecked();
  672 |   await expect(page.getByTestId("mountain-rhythm-metric-journey")).toContainText("0 of 7 planned days");
  673 | 
  674 |   page.on("dialog", (dialog) => dialog.accept());
  675 |   const endEarlyRequest = page.waitForRequest(
  676 |     (request) =>
  677 |       request.url().endsWith("/api/events") &&
  678 |       request.method() === "POST" &&
  679 |       request.postDataJSON()?.id === savedPrayer.id &&
  680 |       request.postDataJSON()?.repeatUntil === startDate,
  681 |   );
```