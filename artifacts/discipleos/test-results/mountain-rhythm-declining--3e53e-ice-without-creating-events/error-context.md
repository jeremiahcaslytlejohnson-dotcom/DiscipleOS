# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mountain-rhythm.spec.ts >> declining both commitments records neither choice without creating events
- Location: tests/e2e/mountain-rhythm.spec.ts:491:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByTestId('mountain-rhythm-disciplines').getByTestId('mountain-rhythm-commitment-invitation')
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByTestId('mountain-rhythm-disciplines').getByTestId('mountain-rhythm-commitment-invitation')
    14 × locator resolved to 1 element
       - unexpected value "1"

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
        - generic [ref=e83]:
          - heading "Add Prayer or Fasting to Your Rhythm" [level=2] [ref=e84]
          - paragraph [ref=e85]: These optional commitments stay separate from Scripture completion and climb progress.
          - group "Optional prayer and fasting commitments" [ref=e86]:
            - generic [ref=e87] [cursor=pointer]:
              - checkbox "Prayer Set aside time to pray" [ref=e88]
              - generic [ref=e92]:
                - generic [ref=e93]: Prayer
                - generic [ref=e94]: Set aside time to pray
            - generic [ref=e96] [cursor=pointer]:
              - checkbox "Fasting Set your own fasting schedule" [ref=e97]
              - generic [ref=e102]:
                - generic [ref=e103]: Fasting
                - generic [ref=e104]: Set your own fasting schedule
          - generic [ref=e106]:
            - button "Save choices" [ref=e107]
            - button "Neither / Not now" [active] [ref=e108]
```

# Test source

```ts
  407 |     established: false,
  408 |   });
  409 |   await seedLocalData(page, [], null);
  410 |   await openMountainRhythm(page);
  411 | 
  412 |   const setup = page.getByTestId("mountain-climb-setup");
  413 |   await expect(setup).toContainText("Step 1 of 3");
  414 |   await expect(page.getByText("7-Day Climb · active reading climb", { exact: true })).toHaveCount(0);
  415 | 
  416 |   await setup.getByRole("button", { name: "Close" }).click();
  417 |   await expect(setup).toHaveCount(0);
  418 |   await page.getByTestId("button-open-climb-setup").click();
  419 |   await expect(setup).toContainText("Step 1 of 3");
  420 | 
  421 |   await page.getByTestId("button-choose-7-day-climb").click();
  422 |   await page.getByRole("button", { name: "Next", exact: true }).click();
  423 |   await expect(page.getByTestId("mountain-climb-settings-step")).toBeVisible();
  424 |   await expect(page.getByTestId("input-climb-daily-budget")).toHaveValue("20");
  425 |   await page.getByTestId("input-climb-daily-budget").fill("25");
  426 |   await setup.getByRole("button", { name: "Back" }).click();
  427 |   await expect(setup).toContainText("Step 1 of 3");
  428 |   await setup.getByRole("button", { name: "Next", exact: true }).click();
  429 |   await expect(page.getByTestId("input-climb-daily-budget")).toHaveValue("25");
  430 |   await page.getByRole("button", { name: "Next", exact: true }).click();
  431 |   await expect(page.getByTestId("mountain-climb-review-step")).toContainText("25 minutes");
  432 |   await setup.getByRole("button", { name: "Back" }).click();
  433 |   await expect(page.getByTestId("mountain-climb-settings-step")).toBeVisible();
  434 |   await setup.getByRole("button", { name: "Next", exact: true }).click();
  435 |   const saveRequest = page.waitForRequest(
  436 |     (request) =>
  437 |       request.url().includes("/api/reading/plans") && request.method() === "POST",
  438 |   );
  439 |   await page.getByTestId("button-confirm-climb-setup").click();
  440 | 
  441 |   const savedPlan = (await saveRequest).postDataJSON();
  442 |   expect(savedPlan.dailyMinutes).toBe(25);
  443 |   expect(savedPlan.selectedBooks).toEqual(["Genesis"]);
  444 |   expect(savedPlan.assignments).toHaveLength(7);
  445 |   const chapterCounts = savedPlan.assignments.map((day: any) => day.readings.length);
  446 |   const totalScheduledChapters = savedPlan.assignments.flatMap((day: any) => day.readings).length;
  447 |   expect(chapterCounts.every((count: number) => count > 0)).toBe(true);
  448 |   expect(totalScheduledChapters).toBeGreaterThan(0);
  449 |   expect(totalScheduledChapters).toBeLessThan(150);
  450 |   expect(Math.max(...savedPlan.assignments.map((day: any) => day.estimatedMinutes))).toBeLessThanOrEqual(
  451 |     savedPlan.dailyMinutes,
  452 |   );
  453 |   await page.reload();
  454 |   await openMountainRhythm(page);
  455 |   await expect(page.getByTestId("button-manage-climb")).toBeVisible();
  456 |   await expect(page.getByTestId("button-choose-7-day-climb")).toHaveCount(0);
  457 | });
  458 | 
  459 | test("fasting suggestions honor inclusive climb dates, cadence and date-only boundaries", () => {
  460 |   const start = "2026-10-15";
  461 |   const end = "2026-10-21";
  462 |   expect(climbDatesInRange(start, end)).toEqual([
  463 |     "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18",
  464 |     "2026-10-19", "2026-10-20", "2026-10-21",
  465 |   ]);
  466 |   expect(fastingDatesForClimb(start, end, "2026-10-15", "7-day-climb")).toEqual(["2026-10-15"]);
  467 |   expect(fastingDatesForClimb(start, end, "2026-10-19", "7-day-climb")).toEqual(["2026-10-19"]);
  468 |   expect(fastingDatesForClimb(start, end, "2026-10-22", "7-day-climb")).toEqual([]);
  469 |   expect(isFastingDateAllowed("2026-10-15", start, end, "2026-10-15")).toBe(true);
  470 |   expect(isFastingDateAllowed(end, start, end, "2026-10-15")).toBe(true);
  471 |   expect(isFastingDateAllowed("2026-10-22", start, end, "2026-10-15")).toBe(false);
  472 |   expect(isFastingDateAllowed("2026-10-14", start, end, "2026-10-15")).toBe(false);
  473 |   expect(isFastingDateAllowed("2026-02-30", start, end, "2026-10-15")).toBe(false);
  474 |   expect(climbDatesInRange("2026-12-30", "2027-01-02")).toEqual([
  475 |     "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02",
  476 |   ]);
  477 |   expect(climbDatesInRange("2024-02-28", "2024-03-01")).toEqual([
  478 |     "2024-02-28", "2024-02-29", "2024-03-01",
  479 |   ]);
  480 | 
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
> 507 |   await expect(tracker.getByTestId("mountain-rhythm-commitment-invitation")).toHaveCount(0);
      |                                                                              ^ Error: expect(locator).toHaveCount(expected) failed
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
  581 |   await expect(tracker.getByRole("button", { name: /^Day 1/ })).toHaveAttribute("aria-pressed", "true");
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
```