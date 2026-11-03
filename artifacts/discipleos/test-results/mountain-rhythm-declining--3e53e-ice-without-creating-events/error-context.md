# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> declining both commitments records neither choice without creating events
- Location: tests/e2e/mountain-rhythm.spec.ts:533:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('mountain-rhythm-disciplines').getByRole('button', { name: 'Neither / Not now' })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - button "Feedback" [ref=e3] [cursor=pointer]:
    - generic [ref=e4]: ✦
    - text: Feedback
  - generic [ref=e8]:
    - banner [ref=e9]:
      - button "Back to Today" [ref=e10]
    - main [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]: My Ascent
        - heading "Mountain Rhythm" [level=1] [ref=e21]
        - paragraph [ref=e22]: One clear route for Scripture consistency. Choose a structured climb, then take the next faithful step.
      - generic [ref=e24]:
        - generic [ref=e26]:
          - generic [ref=e27]: Mountain Rhythm
          - generic [ref=e30]: Choose a 7-, 20-, or 40-day reading climb
        - generic [ref=e34]:
          - generic [ref=e37]: No current elevation yet
          - paragraph [ref=e38]: Choose the 7-Day Climb to begin.
      - generic [ref=e41]:
        - generic [ref=e42]: Step 1 of 3 · Choose your climb
        - paragraph [ref=e45]: Choose one structured route. Your other reading plans remain unchanged.
        - generic [ref=e46]:
          - button "7-Day Climb A focused week in Genesis. Select route" [ref=e47]:
            - generic [ref=e49]:
              - generic [ref=e50]: 7-Day Climb
              - generic [ref=e51]: A focused week in Genesis.
              - generic [ref=e52]: Select route
          - button "20-Day Reset The four Gospels and Acts over 20 days. Currently locked. Locked" [disabled] [ref=e53]:
            - generic [ref=e55]:
              - generic [ref=e56]: 20-Day Reset
              - generic [ref=e57]: The four Gospels and Acts over 20 days. Currently locked.
              - generic [ref=e58]: Locked
          - button "40-Day Climb A 40-day route from 1 Samuel through Nehemiah. Coming Later" [disabled] [ref=e63]:
            - generic [ref=e65]:
              - generic [ref=e66]: 40-Day Climb
              - generic [ref=e67]: A 40-day route from 1 Samuel through Nehemiah.
              - generic [ref=e68]: Coming Later
        - generic [ref=e73]:
          - button "Close" [ref=e74]
          - button "Next" [disabled] [ref=e75]
      - generic [ref=e78]: Choose a route above to see the full ascent, daily readings, milestones, and today's next step.
      - group [ref=e79]:
        - generic "Optional commitments · Prayer and fasting" [ref=e80] [cursor=pointer]
```

# Test source

```ts
  447 |     userId: "anonymous-mountain-session",
  448 |     authenticated: false,
  449 |     established: false,
  450 |   });
  451 |   await seedLocalData(page, [], null);
  452 |   await openMountainRhythm(page);
  453 | 
  454 |   const setup = page.getByTestId("mountain-climb-setup");
  455 |   await expect(setup).toContainText("Step 1 of 3");
  456 |   await expect(page.getByText("7-Day Climb · active reading climb", { exact: true })).toHaveCount(0);
  457 | 
  458 |   await setup.getByRole("button", { name: "Close" }).click();
  459 |   await expect(setup).toHaveCount(0);
  460 |   await page.getByTestId("button-open-climb-setup").click();
  461 |   await expect(setup).toContainText("Step 1 of 3");
  462 | 
  463 |   await page.getByTestId("button-choose-7-day-climb").click();
  464 |   await page.getByRole("button", { name: "Next", exact: true }).click();
  465 |   await expect(page.getByTestId("mountain-climb-settings-step")).toBeVisible();
  466 |   await expect(page.getByTestId("input-climb-daily-budget")).toHaveValue("20");
  467 |   await page.getByTestId("input-climb-daily-budget").fill("25");
  468 |   await setup.getByRole("button", { name: "Back" }).click();
  469 |   await expect(setup).toContainText("Step 1 of 3");
  470 |   await setup.getByRole("button", { name: "Next", exact: true }).click();
  471 |   await expect(page.getByTestId("input-climb-daily-budget")).toHaveValue("25");
  472 |   await page.getByRole("button", { name: "Next", exact: true }).click();
  473 |   await expect(page.getByTestId("mountain-climb-review-step")).toContainText("25 minutes");
  474 |   await setup.getByRole("button", { name: "Back" }).click();
  475 |   await expect(page.getByTestId("mountain-climb-settings-step")).toBeVisible();
  476 |   await setup.getByRole("button", { name: "Next", exact: true }).click();
  477 |   const saveRequest = page.waitForRequest(
  478 |     (request) =>
  479 |       request.url().includes("/api/reading/plans") && request.method() === "POST",
  480 |   );
  481 |   await page.getByTestId("button-confirm-climb-setup").click();
  482 | 
  483 |   const savedPlan = (await saveRequest).postDataJSON();
  484 |   expect(savedPlan.dailyMinutes).toBe(25);
  485 |   expect(savedPlan.selectedBooks).toEqual(["Genesis"]);
  486 |   expect(savedPlan.assignments).toHaveLength(7);
  487 |   const chapterCounts = savedPlan.assignments.map((day: any) => day.readings.length);
  488 |   const totalScheduledChapters = savedPlan.assignments.flatMap((day: any) => day.readings).length;
  489 |   expect(chapterCounts.every((count: number) => count > 0)).toBe(true);
  490 |   expect(totalScheduledChapters).toBeGreaterThan(0);
  491 |   expect(totalScheduledChapters).toBeLessThan(150);
  492 |   expect(Math.max(...savedPlan.assignments.map((day: any) => day.estimatedMinutes))).toBeLessThanOrEqual(
  493 |     savedPlan.dailyMinutes,
  494 |   );
  495 |   await page.reload();
  496 |   await openMountainRhythm(page);
  497 |   await expect(page.getByTestId("button-manage-climb")).toBeVisible();
  498 |   await expect(page.getByTestId("button-choose-7-day-climb")).toHaveCount(0);
  499 | });
  500 | 
  501 | test("fasting suggestions honor inclusive climb dates, cadence and date-only boundaries", () => {
  502 |   const start = "2026-10-15";
  503 |   const end = "2026-10-21";
  504 |   expect(climbDatesInRange(start, end)).toEqual([
  505 |     "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18",
  506 |     "2026-10-19", "2026-10-20", "2026-10-21",
  507 |   ]);
  508 |   expect(fastingDatesForClimb(start, end, "2026-10-15", "7-day-climb")).toEqual(["2026-10-15"]);
  509 |   expect(fastingDatesForClimb(start, end, "2026-10-19", "7-day-climb")).toEqual(["2026-10-19"]);
  510 |   expect(fastingDatesForClimb(start, end, "2026-10-22", "7-day-climb")).toEqual([]);
  511 |   expect(isFastingDateAllowed("2026-10-15", start, end, "2026-10-15")).toBe(true);
  512 |   expect(isFastingDateAllowed(end, start, end, "2026-10-15")).toBe(true);
  513 |   expect(isFastingDateAllowed("2026-10-22", start, end, "2026-10-15")).toBe(false);
  514 |   expect(isFastingDateAllowed("2026-10-14", start, end, "2026-10-15")).toBe(false);
  515 |   expect(isFastingDateAllowed("2026-02-30", start, end, "2026-10-15")).toBe(false);
  516 |   expect(climbDatesInRange("2026-12-30", "2027-01-02")).toEqual([
  517 |     "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02",
  518 |   ]);
  519 |   expect(climbDatesInRange("2024-02-28", "2024-03-01")).toEqual([
  520 |     "2024-02-28", "2024-02-29", "2024-03-01",
  521 |   ]);
  522 | 
  523 |   expect(fastingDatesForClimb("2026-01-01", "2026-01-20", "2026-01-01", "20-day-reset"))
  524 |     .toEqual(["2026-01-01", "2026-01-11"]);
  525 |   expect(fastingDatesForClimb("2026-01-01", "2026-02-09", "2026-01-01", "40-day-climb"))
  526 |     .toEqual(["2026-01-01", "2026-01-11", "2026-01-21", "2026-01-31"]);
  527 |   expect(fastingDatesForClimb("2026-01-01", "2026-01-20", "2026-01-12", "20-day-reset"))
  528 |     .toEqual([]);
  529 |   expect(fastingDatesForClimb("2026-01-01", "2027-01-01", "2026-01-01", "future"))
  530 |     .toEqual([]);
  531 | });
  532 | 
  533 | test("declining both commitments records neither choice without creating events", async ({ page }) => {
  534 |   await stubApi(page, {
  535 |     success: true,
  536 |     userId: "anonymous-no-discipline-session",
  537 |     authenticated: false,
  538 |     established: false,
  539 |   });
  540 |   await seedLocalData(page, [], null, { ownerId: "anonymous-no-discipline-session" });
  541 |   await openMountainRhythm(page);
  542 |   const tracker = page.getByTestId("mountain-rhythm-disciplines");
  543 |   let eventPosts = 0;
  544 |   page.on("request", (request) => {
  545 |     if (request.url().endsWith("/api/events") && request.method() === "POST") eventPosts++;
  546 |   });
> 547 |   await tracker.getByRole("button", { name: "Neither / Not now" }).click();
      |                                                                    ^ Error: locator.click: Test timeout of 30000ms exceeded.
  548 |   await expect(tracker.getByTestId("mountain-rhythm-commitment-invitation")).toHaveCount(0);
  549 |   expect(eventPosts).toBe(0);
  550 | });
  551 | 
  552 | test("guides optional prayer setup through a confirmed start date and preserves Scripture progress", async ({ page }) => {
  553 |   await stubApi(page, {
  554 |     success: true,
  555 |     userId: "anonymous-mountain-session",
  556 |     authenticated: false,
  557 |     established: false,
  558 |   });
  559 |   await seedLocalData(page, [], null, { ownerId: "anonymous-mountain-session" });
  560 |   await page.setViewportSize({ width: 1280, height: 900 });
  561 |   await openMountainRhythm(page);
  562 |   const tracker = page.getByTestId("mountain-rhythm-disciplines");
  563 |   await expect(tracker.getByRole("heading", { name: "Add Prayer or Fasting to Your Rhythm" })).toBeVisible();
  564 |   await expect(tracker.getByTestId("mountain-rhythm-commitment-invitation")).toContainText(
  565 |     "optional commitments",
  566 |   );
  567 |   const choices = tracker.getByRole("checkbox");
  568 |   await expect(choices.nth(0)).not.toBeChecked();
  569 |   await expect(choices.nth(1)).not.toBeChecked();
  570 |   const prayerCard = tracker.getByTestId("discipline-choice-card-prayer");
  571 |   const fastingCard = tracker.getByTestId("discipline-choice-card-fasting");
  572 |   const desktopCards = await Promise.all([prayerCard, fastingCard].map((card) =>
  573 |     card.evaluate((node) => {
  574 |       const rect = node.getBoundingClientRect();
  575 |       return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  576 |     }),
  577 |   ));
  578 |   expect(desktopCards[1].x).toBeGreaterThan(desktopCards[0].x);
  579 |   expect(Math.abs(desktopCards[1].y - desktopCards[0].y)).toBeLessThan(2);
  580 |   await prayerCard.getByText("Set aside time to pray").click();
  581 |   await expect(choices.nth(0)).toBeChecked();
  582 |   await choices.nth(1).focus();
  583 |   await choices.nth(1).press("Space");
  584 |   await expect(choices.nth(1)).toBeChecked();
  585 |   await choices.nth(1).press("Space");
  586 |   await expect(choices.nth(1)).not.toBeChecked();
  587 | 
  588 |   await page.setViewportSize({ width: 390, height: 844 });
  589 |   const mobileCards = await Promise.all([prayerCard, fastingCard].map((card) =>
  590 |     card.evaluate((node) => {
  591 |       const rect = node.getBoundingClientRect();
  592 |       return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  593 |     }),
  594 |   ));
  595 |   expect(Math.abs(mobileCards[1].x - mobileCards[0].x)).toBeLessThan(2);
  596 |   expect(mobileCards[1].y).toBeGreaterThan(mobileCards[0].y);
  597 |   expect(mobileCards[1].x + mobileCards[1].width).toBeLessThanOrEqual(390);
  598 | 
  599 |   await fastingCard.getByText("Set your own fasting schedule").click();
  600 |   await tracker.getByRole("button", { name: "Continue" }).click();
  601 |   const startInput = tracker.getByLabel("Commitment start date");
  602 |   const tomorrow = new Date();
  603 |   tomorrow.setDate(tomorrow.getDate() + 1);
  604 |   const expectedTomorrow = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  605 |   await expect(startInput).toHaveValue(expectedTomorrow);
  606 |   let eventPosts = 0;
  607 |   page.on("request", (request) => {
  608 |     if (request.url().endsWith("/api/events") && request.method() === "POST") eventPosts++;
  609 |   });
  610 |   expect(eventPosts).toBe(0);
  611 |   await tracker.getByRole("button", { name: "Today", exact: true }).click();
  612 |   const startDate = await startInput.inputValue();
  613 |   await tracker.getByRole("button", { name: "Confirm start date" }).click();
  614 |   await expect(tracker.getByLabel("Prayer time")).toBeVisible();
  615 |   await expect(tracker.getByLabel("Prayer Sunday")).toHaveAttribute("aria-pressed", "true");
  616 |   await expect(tracker.getByLabel("Prayer Monday")).toHaveAttribute("aria-pressed", "true");
  617 |   await expect(tracker.getByLabel("Prayer Saturday")).toHaveAttribute("aria-pressed", "true");
  618 |   await tracker.getByLabel("Prayer time").fill("07:15");
  619 |   await tracker.getByRole("button", { name: "Next", exact: true }).click();
  620 |   await expect(tracker.getByRole("heading", { name: "Choose fasting days within this climb" })).toBeVisible();
  621 |   await expect(tracker.getByRole("button", { name: /^Day 1/ })).toHaveAttribute("aria-pressed", "true");
  622 |   await expect(tracker.getByRole("button", { name: /^Day 7/ })).toBeVisible();
  623 |   for (let day = 2; day <= 7; day++) {
  624 |     await tracker.getByRole("button", { name: new RegExp(`^Day ${day}`) }).click();
  625 |   }
  626 |   for (let day = 1; day <= 7; day++) {
  627 |     await expect(tracker.getByRole("button", { name: new RegExp(`^Day ${day}`) })).toHaveAttribute("aria-pressed", "true");
  628 |   }
  629 |   await expect(tracker.getByLabel("Send fasting reminder")).toBeChecked();
  630 |   await expect(tracker.getByLabel("Fasting reminder lead time")).toHaveValue("720");
  631 |   await expect(tracker.getByLabel("Commitment time")).toHaveCount(0);
  632 |   await tracker.getByRole("button", { name: "Next", exact: true }).click();
  633 |   await expect(tracker.getByRole("heading", { name: "Review your schedule" })).toBeVisible();
  634 |   await expect(tracker.getByTestId("fasting-review-date")).toHaveCount(7);
  635 |   const prayerRequest = page.waitForRequest(
  636 |     (request) => request.url().endsWith("/api/events") && request.method() === "POST" && request.postDataJSON()?.type === "prayer",
  637 |   );
  638 |   const fastingRequest = page.waitForRequest(
  639 |     (request) => request.url().endsWith("/api/events") && request.method() === "POST" && request.postDataJSON()?.type === "fast",
  640 |   );
  641 |   await tracker.getByRole("button", { name: "Save schedule" }).click();
  642 |   await expect(tracker.getByRole("button", { name: "Saving…" })).toBeVisible();
  643 |   const savedPrayer = (await prayerRequest).postDataJSON();
  644 |   const savedFast = (await fastingRequest).postDataJSON();
  645 |   await expect(tracker.getByRole("button", { name: "Saving…" })).toHaveCount(0);
  646 |   expect(savedPrayer.type).toBe("prayer");
  647 |   expect(savedPrayer.repeat).toBe("weekly");
```