# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> declining both commitments records neither choice without creating events
- Location: tests/e2e/mountain-rhythm.spec.ts:483:1

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
  397 |     userId: "anonymous-mountain-session",
  398 |     authenticated: false,
  399 |     established: false,
  400 |   });
  401 |   await seedLocalData(page, [], null);
  402 |   await openMountainRhythm(page);
  403 | 
  404 |   const setup = page.getByTestId("mountain-climb-setup");
  405 |   await expect(setup).toContainText("Step 1 of 3");
  406 |   await expect(page.getByText("7-Day Climb · active reading climb", { exact: true })).toHaveCount(0);
  407 | 
  408 |   await setup.getByRole("button", { name: "Close" }).click();
  409 |   await expect(setup).toHaveCount(0);
  410 |   await page.getByTestId("button-open-climb-setup").click();
  411 |   await expect(setup).toContainText("Step 1 of 3");
  412 | 
  413 |   await page.getByTestId("button-choose-7-day-climb").click();
  414 |   await page.getByRole("button", { name: "Next", exact: true }).click();
  415 |   await expect(page.getByTestId("mountain-climb-settings-step")).toBeVisible();
  416 |   await expect(page.getByTestId("input-climb-daily-budget")).toHaveValue("20");
  417 |   await page.getByTestId("input-climb-daily-budget").fill("25");
  418 |   await setup.getByRole("button", { name: "Back" }).click();
  419 |   await expect(setup).toContainText("Step 1 of 3");
  420 |   await setup.getByRole("button", { name: "Next", exact: true }).click();
  421 |   await expect(page.getByTestId("input-climb-daily-budget")).toHaveValue("25");
  422 |   await page.getByRole("button", { name: "Next", exact: true }).click();
  423 |   await expect(page.getByTestId("mountain-climb-review-step")).toContainText("25 minutes");
  424 |   await setup.getByRole("button", { name: "Back" }).click();
  425 |   await expect(page.getByTestId("mountain-climb-settings-step")).toBeVisible();
  426 |   await setup.getByRole("button", { name: "Next", exact: true }).click();
  427 |   const saveRequest = page.waitForRequest(
  428 |     (request) =>
  429 |       request.url().includes("/api/reading/plans") && request.method() === "POST",
  430 |   );
  431 |   await page.getByTestId("button-confirm-climb-setup").click();
  432 | 
  433 |   const savedPlan = (await saveRequest).postDataJSON();
  434 |   expect(savedPlan.dailyMinutes).toBe(25);
  435 |   expect(savedPlan.selectedBooks).toEqual(["Genesis"]);
  436 |   expect(savedPlan.assignments).toHaveLength(7);
  437 |   const chapterCounts = savedPlan.assignments.map((day: any) => day.readings.length);
  438 |   const totalScheduledChapters = savedPlan.assignments.flatMap((day: any) => day.readings).length;
  439 |   expect(chapterCounts.every((count: number) => count > 0)).toBe(true);
  440 |   expect(totalScheduledChapters).toBeGreaterThan(0);
  441 |   expect(totalScheduledChapters).toBeLessThan(150);
  442 |   expect(Math.max(...savedPlan.assignments.map((day: any) => day.estimatedMinutes))).toBeLessThanOrEqual(
  443 |     savedPlan.dailyMinutes,
  444 |   );
  445 |   await page.reload();
  446 |   await openMountainRhythm(page);
  447 |   await expect(page.getByTestId("button-manage-climb")).toBeVisible();
  448 |   await expect(page.getByTestId("button-choose-7-day-climb")).toHaveCount(0);
  449 | });
  450 | 
  451 | test("fasting suggestions honor inclusive climb dates, cadence and date-only boundaries", () => {
  452 |   const start = "2026-10-15";
  453 |   const end = "2026-10-21";
  454 |   expect(climbDatesInRange(start, end)).toEqual([
  455 |     "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18",
  456 |     "2026-10-19", "2026-10-20", "2026-10-21",
  457 |   ]);
  458 |   expect(fastingDatesForClimb(start, end, "2026-10-15", "7-day-climb")).toEqual(["2026-10-15"]);
  459 |   expect(fastingDatesForClimb(start, end, "2026-10-19", "7-day-climb")).toEqual(["2026-10-19"]);
  460 |   expect(fastingDatesForClimb(start, end, "2026-10-22", "7-day-climb")).toEqual([]);
  461 |   expect(isFastingDateAllowed("2026-10-15", start, end, "2026-10-15")).toBe(true);
  462 |   expect(isFastingDateAllowed(end, start, end, "2026-10-15")).toBe(true);
  463 |   expect(isFastingDateAllowed("2026-10-22", start, end, "2026-10-15")).toBe(false);
  464 |   expect(isFastingDateAllowed("2026-10-14", start, end, "2026-10-15")).toBe(false);
  465 |   expect(isFastingDateAllowed("2026-02-30", start, end, "2026-10-15")).toBe(false);
  466 |   expect(climbDatesInRange("2026-12-30", "2027-01-02")).toEqual([
  467 |     "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02",
  468 |   ]);
  469 |   expect(climbDatesInRange("2024-02-28", "2024-03-01")).toEqual([
  470 |     "2024-02-28", "2024-02-29", "2024-03-01",
  471 |   ]);
  472 | 
  473 |   expect(fastingDatesForClimb("2026-01-01", "2026-01-20", "2026-01-01", "20-day-reset"))
  474 |     .toEqual(["2026-01-01", "2026-01-11"]);
  475 |   expect(fastingDatesForClimb("2026-01-01", "2026-02-09", "2026-01-01", "40-day-climb"))
  476 |     .toEqual(["2026-01-01", "2026-01-11", "2026-01-21", "2026-01-31"]);
  477 |   expect(fastingDatesForClimb("2026-01-01", "2026-01-20", "2026-01-12", "20-day-reset"))
  478 |     .toEqual([]);
  479 |   expect(fastingDatesForClimb("2026-01-01", "2027-01-01", "2026-01-01", "future"))
  480 |     .toEqual([]);
  481 | });
  482 | 
  483 | test("declining both commitments records neither choice without creating events", async ({ page }) => {
  484 |   await stubApi(page, {
  485 |     success: true,
  486 |     userId: "anonymous-no-discipline-session",
  487 |     authenticated: false,
  488 |     established: false,
  489 |   });
  490 |   await seedLocalData(page, [], null, { ownerId: "anonymous-no-discipline-session" });
  491 |   await openMountainRhythm(page);
  492 |   const tracker = page.getByTestId("mountain-rhythm-disciplines");
  493 |   let eventPosts = 0;
  494 |   page.on("request", (request) => {
  495 |     if (request.url().endsWith("/api/events") && request.method() === "POST") eventPosts++;
  496 |   });
> 497 |   await tracker.getByRole("button", { name: "Neither / Not now" }).click();
      |                                                                    ^ Error: locator.click: Test timeout of 30000ms exceeded.
  498 |   await expect(tracker.getByTestId("mountain-rhythm-commitment-invitation")).toHaveCount(0);
  499 |   expect(eventPosts).toBe(0);
  500 | });
  501 | 
  502 | test("guides optional prayer setup through a confirmed start date and preserves Scripture progress", async ({ page }) => {
  503 |   await stubApi(page, {
  504 |     success: true,
  505 |     userId: "anonymous-mountain-session",
  506 |     authenticated: false,
  507 |     established: false,
  508 |   });
  509 |   await seedLocalData(page, [], null, { ownerId: "anonymous-mountain-session" });
  510 |   await page.setViewportSize({ width: 1280, height: 900 });
  511 |   await openMountainRhythm(page);
  512 |   const tracker = page.getByTestId("mountain-rhythm-disciplines");
  513 |   await expect(tracker.getByRole("heading", { name: "Add Prayer or Fasting to Your Rhythm" })).toBeVisible();
  514 |   await expect(tracker.getByTestId("mountain-rhythm-commitment-invitation")).toContainText(
  515 |     "optional commitments",
  516 |   );
  517 |   const choices = tracker.getByRole("checkbox");
  518 |   await expect(choices.nth(0)).not.toBeChecked();
  519 |   await expect(choices.nth(1)).not.toBeChecked();
  520 |   const prayerCard = tracker.getByTestId("discipline-choice-card-prayer");
  521 |   const fastingCard = tracker.getByTestId("discipline-choice-card-fasting");
  522 |   const desktopCards = await Promise.all([prayerCard, fastingCard].map((card) =>
  523 |     card.evaluate((node) => {
  524 |       const rect = node.getBoundingClientRect();
  525 |       return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  526 |     }),
  527 |   ));
  528 |   expect(desktopCards[1].x).toBeGreaterThan(desktopCards[0].x);
  529 |   expect(Math.abs(desktopCards[1].y - desktopCards[0].y)).toBeLessThan(2);
  530 |   await prayerCard.getByText("Set aside time to pray").click();
  531 |   await expect(choices.nth(0)).toBeChecked();
  532 |   await choices.nth(1).focus();
  533 |   await choices.nth(1).press("Space");
  534 |   await expect(choices.nth(1)).toBeChecked();
  535 |   await choices.nth(1).press("Space");
  536 |   await expect(choices.nth(1)).not.toBeChecked();
  537 | 
  538 |   await page.setViewportSize({ width: 390, height: 844 });
  539 |   const mobileCards = await Promise.all([prayerCard, fastingCard].map((card) =>
  540 |     card.evaluate((node) => {
  541 |       const rect = node.getBoundingClientRect();
  542 |       return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  543 |     }),
  544 |   ));
  545 |   expect(Math.abs(mobileCards[1].x - mobileCards[0].x)).toBeLessThan(2);
  546 |   expect(mobileCards[1].y).toBeGreaterThan(mobileCards[0].y);
  547 |   expect(mobileCards[1].x + mobileCards[1].width).toBeLessThanOrEqual(390);
  548 | 
  549 |   await fastingCard.getByText("Set your own fasting schedule").click();
  550 |   await tracker.getByRole("button", { name: "Continue" }).click();
  551 |   const startInput = tracker.getByLabel("Commitment start date");
  552 |   const tomorrow = new Date();
  553 |   tomorrow.setDate(tomorrow.getDate() + 1);
  554 |   const expectedTomorrow = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  555 |   await expect(startInput).toHaveValue(expectedTomorrow);
  556 |   let eventPosts = 0;
  557 |   page.on("request", (request) => {
  558 |     if (request.url().endsWith("/api/events") && request.method() === "POST") eventPosts++;
  559 |   });
  560 |   expect(eventPosts).toBe(0);
  561 |   await tracker.getByRole("button", { name: "Today", exact: true }).click();
  562 |   const startDate = await startInput.inputValue();
  563 |   await tracker.getByRole("button", { name: "Confirm start date" }).click();
  564 |   await expect(tracker.getByLabel("Prayer time")).toBeVisible();
  565 |   await expect(tracker.getByLabel("Prayer Sunday")).toHaveAttribute("aria-pressed", "true");
  566 |   await expect(tracker.getByLabel("Prayer Monday")).toHaveAttribute("aria-pressed", "true");
  567 |   await expect(tracker.getByLabel("Prayer Saturday")).toHaveAttribute("aria-pressed", "true");
  568 |   await tracker.getByLabel("Prayer time").fill("07:15");
  569 |   await tracker.getByRole("button", { name: "Next", exact: true }).click();
  570 |   await expect(tracker.getByRole("heading", { name: "Choose fasting days within this climb" })).toBeVisible();
  571 |   await expect(tracker.getByRole("button", { name: /^Day 1/ })).toHaveAttribute("aria-pressed", "true");
  572 |   await expect(tracker.getByRole("button", { name: /^Day 7/ })).toBeVisible();
  573 |   for (let day = 2; day <= 7; day++) {
  574 |     await tracker.getByRole("button", { name: new RegExp(`^Day ${day}`) }).click();
  575 |   }
  576 |   for (let day = 1; day <= 7; day++) {
  577 |     await expect(tracker.getByRole("button", { name: new RegExp(`^Day ${day}`) })).toHaveAttribute("aria-pressed", "true");
  578 |   }
  579 |   await expect(tracker.getByLabel("Send fasting reminder")).toBeChecked();
  580 |   await expect(tracker.getByLabel("Fasting reminder lead time")).toHaveValue("720");
  581 |   await expect(tracker.getByLabel("Commitment time")).toHaveCount(0);
  582 |   await tracker.getByRole("button", { name: "Next", exact: true }).click();
  583 |   await expect(tracker.getByRole("heading", { name: "Review your schedule" })).toBeVisible();
  584 |   await expect(tracker.getByTestId("fasting-review-date")).toHaveCount(7);
  585 |   const prayerRequest = page.waitForRequest(
  586 |     (request) => request.url().endsWith("/api/events") && request.method() === "POST" && request.postDataJSON()?.type === "prayer",
  587 |   );
  588 |   const fastingRequest = page.waitForRequest(
  589 |     (request) => request.url().endsWith("/api/events") && request.method() === "POST" && request.postDataJSON()?.type === "fast",
  590 |   );
  591 |   await tracker.getByRole("button", { name: "Save schedule" }).click();
  592 |   await expect(tracker.getByRole("button", { name: "Saving…" })).toBeVisible();
  593 |   const savedPrayer = (await prayerRequest).postDataJSON();
  594 |   const savedFast = (await fastingRequest).postDataJSON();
  595 |   await expect(tracker.getByRole("button", { name: "Saving…" })).toHaveCount(0);
  596 |   expect(savedPrayer.type).toBe("prayer");
  597 |   expect(savedPrayer.repeat).toBe("weekly");
```