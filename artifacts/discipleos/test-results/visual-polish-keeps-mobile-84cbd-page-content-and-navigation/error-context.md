# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-polish.spec.ts >> keeps mobile account and feedback controls clear of page content and navigation
- Location: tests/e2e/visual-polish.spec.ts:756:1

# Error details

```
Error: expect(received).not.toBeNull()

Received: null
```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - status "Loading DiscipleOS" [ref=f1e3]
  - button "Feedback" [ref=f1e4] [cursor=pointer]:
    - generic [ref=f1e5]: ✦
    - text: Feedback
  - generic [ref=f1e7]:
    - generic [ref=f1e8]:
      - generic [ref=f1e9]:
        - heading "DISCIPLEOS" [level=1] [ref=f1e10]
        - link "Continue with email" [ref=f1e11] [cursor=pointer]:
          - /url: /sign-in
      - generic [ref=f1e12]:
        - paragraph [ref=f1e13]:
          - generic [ref=f1e14]: Discipline that
          - generic [ref=f1e15]: moves mountains.
        - paragraph [ref=f1e16]: Build steady habits in Scripture, prayer, and your daily walk with God.
    - button "Open menu" [ref=f1e19]:
      - generic [ref=f1e22]: Menu
    - generic [ref=f1e23]:
      - generic [ref=f1e26]:
        - generic [ref=f1e27]: Verse of the day
        - generic [ref=f1e28]: “Blessed is the one who walks not in step with the wicked.”
        - generic [ref=f1e29]: Psalm 1:1
      - generic [ref=f1e30]:
        - button "Today’s Reading No ordinary reading scheduled today" [expanded] [ref=f1e32]:
          - generic [ref=f1e36]:
            - generic [ref=f1e37]: Today’s Reading
            - generic [ref=f1e38]: No ordinary reading scheduled today
        - generic [ref=f1e41]:
          - generic [ref=f1e43]:
            - generic [ref=f1e44]: Today’s completion
            - generic [ref=f1e45]: No ordinary reading scheduled today
          - generic [ref=f1e46]:
            - generic [ref=f1e47]: No ordinary reading is scheduled today.
            - button "Create a Plan" [ref=f1e48]
      - generic [ref=f1e49]:
        - button "Today’s Activities" [expanded] [ref=f1e51]
        - generic [ref=f1e61]:
          - generic [ref=f1e62]:
            - generic [ref=f1e63]: prayer
            - generic [ref=f1e64]:
              - button "Complete activity" [ref=f1e65]
              - button "Edit Morning prayer" [ref=f1e68]
          - generic [ref=f1e72]: Morning prayer
          - generic [ref=f1e73]: 6:30 AM today
          - generic [ref=f1e74]: A quiet start
      - button "Progress Ordinary reading plans" [ref=f1e77]:
        - generic [ref=f1e81]:
          - generic [ref=f1e82]: Progress
          - generic [ref=f1e83]: Ordinary reading plans
      - generic [ref=f1e87]:
        - button "Mountain Rhythm Long-term climb progress" [ref=f1e88]:
          - generic [ref=f1e92]:
            - generic [ref=f1e93]: Mountain Rhythm
            - generic [ref=f1e94]: Long-term climb progress
        - link "Details" [ref=f1e97] [cursor=pointer]:
          - /url: /mountain-rhythm
```

# Test source

```ts
  683 |     expect(savedPlan.readingMode).toBe("random");
  684 |     expect(
  685 |       Math.max(...savedPlan.assignments.map((assignment: any) => assignment.estimatedMinutes)),
  686 |     ).toBeLessThanOrEqual(30);
  687 |     await expect(page.getByTestId("plan-created-feedback")).toBeVisible();
  688 |     await expect(page.getByTestId("plan-created-feedback")).toContainText("Plan created");
  689 |     await expect(page.getByTestId("plan-created-view-today")).toBeVisible();
  690 |     await expect(page.getByTestId("plan-created-go-plans")).toBeVisible();
  691 | 
  692 |     const finalLayout = await page.evaluate(() => ({
  693 |       documentWidth: document.documentElement.scrollWidth,
  694 |       formOverflowX: getComputedStyle(document.querySelector('[data-testid="dashboard-plans-list"]')).overflowX,
  695 |     }));
  696 |     expect(finalLayout.documentWidth).toBeLessThanOrEqual(width + 1);
  697 |     expect(finalLayout.formOverflowX).not.toMatch(/auto|scroll/);
  698 | 
  699 |     await page.getByTestId("plans-create-button").click();
  700 |     await expect(page.getByTestId("plan-create-step-1")).toBeVisible();
  701 |     await page.getByTestId("plan-create-preset-newTestament").click();
  702 |     await page.getByTestId("plan-create-next").click();
  703 |     await page.getByTestId("plan-create-next").click();
  704 |     await page.getByTestId("plan-create-next").click();
  705 |     await page.getByTestId("plan-create-name").fill("Evening Scripture");
  706 |     await page.getByTestId("plan-create-next").click();
  707 |     await page.getByTestId("plan-create-submit").click();
  708 |     await expect(
  709 |       page.locator('[data-testid^="planned-reading-card-"]').filter({ hasText: "Evening Scripture" }),
  710 |     ).toBeVisible();
  711 |   }
  712 | });
  713 | 
  714 | test("keeps Mountain Rhythm, empty, and auth secondary states legible", async ({ page }) => {
  715 |   await stubMountainApi(page);
  716 | 
  717 |   for (const width of [360, 1280]) {
  718 |     await page.setViewportSize({ width, height: 900 });
  719 |     await page.goto("/mountain-rhythm");
  720 |     await expect(page.getByTestId("mountain-rhythm-panel")).toBeVisible();
  721 | 
  722 |     const mountainAudit = await auditSecondaryText(page, `Mountain Rhythm ${width}px`);
  723 |     expect(mountainAudit.count).toBeGreaterThan(0);
  724 |     expect(mountainAudit.failures).toEqual([]);
  725 | 
  726 |     const routeStates = await page.evaluate(() => {
  727 |       const available = document.querySelector('[data-testid="button-choose-7-day-climb"]');
  728 |       const comingLater = document.querySelector('[data-testid="button-choose-40-day-climb"]');
  729 |       return {
  730 |         availableOpacity: available ? getComputedStyle(available).opacity : "",
  731 |         comingLaterOpacity: comingLater ? getComputedStyle(comingLater).opacity : "",
  732 |         comingLaterDisabled: comingLater instanceof HTMLButtonElement ? comingLater.disabled : false,
  733 |       };
  734 |     });
  735 |     expect(routeStates.availableOpacity).toBe("1");
  736 |     expect(routeStates.comingLaterOpacity).toBe("0.6");
  737 |     expect(routeStates.comingLaterDisabled).toBe(true);
  738 | 
  739 |     await page.goto("/");
  740 |     await expect(page.getByTestId("dashboard-plans-empty-state")).toHaveCount(0);
  741 |     const emptyHomeAudit = await auditSecondaryText(page, `Empty Today ${width}px`);
  742 |     expect(emptyHomeAudit.count).toBeGreaterThan(0);
  743 |     expect(emptyHomeAudit.failures).toEqual([]);
  744 | 
  745 |     await page.goto("/sign-in");
  746 |     const authCard = page.locator(".discipleos-auth-card");
  747 |     await expect(authCard).toBeVisible();
  748 |     await expect(authCard.locator("input").first()).toBeVisible();
  749 |     const authLabel = authCard.locator(".cl-formFieldLabel").first();
  750 |     if (await authLabel.count()) {
  751 |       expect(await authLabel.getAttribute("class")).toContain("text-slate-200");
  752 |     }
  753 |   }
  754 | });
  755 | 
  756 | test("keeps mobile account and feedback controls clear of page content and navigation", async ({ page }) => {
  757 |   await stubHomeApi(page, []);
  758 | 
  759 |   for (const width of [320, 360, 390, 430]) {
  760 |     await page.setViewportSize({ width, height: 900 });
  761 |     await page.goto("/");
  762 |     await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  763 | 
  764 |     const accountLink = page.getByRole("link", { name: "Continue with email", exact: true });
  765 |     const feedback = page.getByRole("button", { name: "Feedback", exact: true });
  766 |     const navigation = page.getByTestId("dashboard-navigation-toggle");
  767 |     const brandTitle = page.getByRole("heading", { name: "DISCIPLEOS", exact: true });
  768 |     const heroTitle = page.getByText("Discipline that", { exact: true });
  769 |     const heroTagline = page.getByText(
  770 |       "Build steady habits in Scripture, prayer, and your daily walk with God.",
  771 |       { exact: true },
  772 |     );
  773 | 
  774 |     await expect(accountLink).toBeVisible();
  775 |     await expect(brandTitle).toBeVisible();
  776 |     const accountBox = await accountLink.boundingBox();
  777 |     const brandBox = await brandTitle.boundingBox();
  778 |     const titleBox = await heroTitle.boundingBox();
  779 |     const taglineBox = await heroTagline.boundingBox();
  780 |     const feedbackBox = await feedback.boundingBox();
  781 |     const navigationBox = await navigation.boundingBox();
  782 | 
> 783 |     expect(accountBox).not.toBeNull();
      |                            ^ Error: expect(received).not.toBeNull()
  784 |     expect(brandBox).not.toBeNull();
  785 |     expect(titleBox).not.toBeNull();
  786 |     expect(taglineBox).not.toBeNull();
  787 |     expect(feedbackBox).not.toBeNull();
  788 |     expect(navigationBox).not.toBeNull();
  789 |     expect((accountBox?.y ?? 0)).toBeLessThan((brandBox?.y ?? Infinity) + (brandBox?.height ?? 0));
  790 |     expect((accountBox?.y ?? 0) + (accountBox?.height ?? 0)).toBeGreaterThan((brandBox?.y ?? Infinity));
  791 |     const headerRowBottom = Math.max(
  792 |       (accountBox?.y ?? 0) + (accountBox?.height ?? 0),
  793 |       (brandBox?.y ?? 0) + (brandBox?.height ?? 0),
  794 |     );
  795 |     expect(headerRowBottom).toBeLessThanOrEqual((heroTitle?.y ?? Infinity) - 12);
  796 |     expect((titleBox?.y ?? 0) + (titleBox?.height ?? 0)).toBeLessThanOrEqual((taglineBox?.y ?? Infinity) - 12);
  797 |     expect((feedbackBox?.y ?? 0) + (feedbackBox?.height ?? 0)).toBeLessThanOrEqual((navigationBox?.y ?? Infinity) - 8);
  798 | 
  799 |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  800 |     const scrolledFeedbackBox = await feedback.boundingBox();
  801 |     const scrolledNavigationBox = await navigation.boundingBox();
  802 |     const mountainBox = await page.getByTestId("dashboard-mountain-rhythm").boundingBox();
  803 |     expect(scrolledFeedbackBox).not.toBeNull();
  804 |     expect(scrolledNavigationBox).not.toBeNull();
  805 |     expect(mountainBox).not.toBeNull();
  806 |     expect((scrolledFeedbackBox?.y ?? 0) + (scrolledFeedbackBox?.height ?? 0)).toBeLessThanOrEqual(
  807 |       scrolledNavigationBox?.y ?? Infinity,
  808 |     );
  809 |     expect((mountainBox?.y ?? 0) + (mountainBox?.height ?? 0)).toBeLessThanOrEqual(
  810 |       (scrolledFeedbackBox?.y ?? Infinity) - 8,
  811 |     );
  812 |   }
  813 | });
  814 | 
  815 | test("uses a full-width shell and compact returning header on desktop", async ({ page }) => {
  816 |   const plan = makeOrdinaryPlan();
  817 |   await stubHomeApi(page, plan);
  818 |   await seedPlans(page, [plan]);
  819 |   await page.goto("/");
  820 | 
  821 |   await expect(page.getByText("Today’s reading", { exact: false }).first()).toBeVisible();
  822 |   await expect(page.getByText("Today’s Reading", { exact: true })).toBeVisible();
  823 |   await expect(page.getByText("Discipline that", { exact: true })).toHaveCount(0);
  824 | 
  825 |   const layout = await page.evaluate(() => ({
  826 |     viewportWidth: window.innerWidth,
  827 |     documentWidth: document.documentElement.scrollWidth,
  828 |     shellWidth: document.querySelector(".discipleos-shell")?.getBoundingClientRect().width,
  829 |   }));
  830 |   expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  831 |   expect(layout.shellWidth).toBe(layout.viewportWidth);
  832 | });
  833 | 
  834 | test("keeps calendar dates clean while exposing selected-day events accessibly", async ({ page }) => {
  835 |   const plan = makeOrdinaryPlan();
  836 |   const event = {
  837 |     id: "visual-polish-event",
  838 |     title: "Morning prayer",
  839 |     type: "prayer",
  840 |     date: todayISO(),
  841 |     time: "06:30",
  842 |     notes: "A quiet start",
  843 |     remind: false,
  844 |     repeat: "none",
  845 |   };
  846 |   await stubHomeApi(page, plan);
  847 |   await seedPlans(page, [plan], [event]);
  848 |   await page.goto("/");
  849 |   const navigation = await openDashboardNavigation(page);
  850 |   await navigation.getByRole("button", { name: "Calendar" }).click();
  851 | 
  852 |   const day = page.getByTestId(`calendar-day-${todayISO()}`);
  853 |   await expect(day).toHaveAttribute("aria-label", /Prayer/);
  854 |   await expect(day).toContainText(String(new Date().getDate()));
  855 |   await expect(day.getByTestId(`calendar-marker-${todayISO()}-P`)).toHaveText("P");
  856 |   await day.click();
  857 |   await expect(page.getByText(/^Activities for /)).toBeVisible();
  858 |   await expect(page.getByText("Morning prayer", { exact: true })).toBeVisible();
  859 |   await page.getByTestId("dashboard-calendar-activities").getByRole("button", { name: "Complete activity" }).click();
  860 |   await expect(page.getByTestId(`calendar-marker-${todayISO()}-P`)).toHaveClass(/text-emerald-400/);
  861 | });
  862 | 
  863 | test("lets custom events be completed and reopened", async ({ page }) => {
  864 |   const event = {
  865 |     id: "visual-polish-custom-event",
  866 |     title: "Fellowship gathering",
  867 |     type: "event",
  868 |     date: todayISO(),
  869 |     time: "18:00",
  870 |     notes: "A custom event",
  871 |     remind: false,
  872 |     repeat: "none",
  873 |     countsTowardRhythm: false,
  874 |   };
  875 |   const plan = makeOrdinaryPlan("custom-event-plan", "Custom event coverage");
  876 |   await stubHomeApi(page, plan, [event]);
  877 |   await seedPlans(page, [plan], [event]);
  878 |   await page.goto("/");
  879 | 
  880 |   const navigation = await openDashboardNavigation(page);
  881 |   await navigation.getByRole("button", { name: "Calendar", exact: true }).click();
  882 |   const activities = page.getByTestId("dashboard-calendar-activities");
  883 |   await expect(activities.getByText("Fellowship gathering", { exact: true })).toBeVisible();
```