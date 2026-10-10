import { expect, test } from "@playwright/test";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

test("guides a new user through a first plan and opens Today's Walk", async ({ page }) => {
  const savedPlans: any[] = [];
  let createRequestCount = 0;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname.endsWith("/auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ authenticated: false, user: null }),
      });
      return;
    }

    if (pathname.endsWith("/session/info")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          established: false,
          authenticated: false,
          userId: "first-plan-onboarding-user",
        }),
      });
      return;
    }

    if (pathname.endsWith("/reading/plans")) {
      if (request.method() === "POST") {
        createRequestCount += 1;
        savedPlans.push(request.postDataJSON());
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, plans: [] }),
      });
      return;
    }

    if (pathname.endsWith("/events")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, events: [] }),
      });
      return;
    }

    if (pathname.endsWith("/rhythm/score")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, eventCompletions: [] }),
      });
      return;
    }

    if (pathname.endsWith("/verse")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reference: "Psalm 1:1",
          text: "Blessed is the one who walks not in step with the wicked.",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");

  const onboarding = page.getByTestId("first-plan-onboarding");
  await expect(onboarding).toBeVisible();
  await expect(page.getByTestId("first-plan-sign-up-link")).toBeVisible();
  await expect(page.getByTestId("first-plan-sign-in-link")).toBeVisible();
  await expect(page.getByTestId("dashboard-navigation")).toHaveCount(0);
  await expect(page.getByTestId("link-mountain-rhythm-entry")).toHaveCount(0);

  await expect(page.getByRole("heading", { name: "How would you like to start?" })).toBeVisible();
  await expect(page.getByTestId("reading-path-choices")).toContainText(
    "Wherever you are in your Scripture journey, there’s a path for you.",
  );
  await expect(page.getByTestId("reading-path-guided-description")).toHaveText(
    "New to reading the Bible? Start with a guided 27-day journey that introduces Scripture one step at a time.",
  );
  await expect(page.getByTestId("reading-path-mountain-rhythm-description")).toHaveText(
    "Struggling to read consistently? Build a lasting habit with structured climbs, reminders, and progress tracking.",
  );
  await expect(page.getByTestId("reading-path-free-climb-description")).toHaveText(
    "Already reading regularly? Choose and combine Bible reading plans that fit your interests and schedule.",
  );
  expect(
    Number.parseFloat(
      await page.getByTestId("reading-path-guided-title").evaluate((element) => getComputedStyle(element).fontSize),
    ),
  ).toBeGreaterThanOrEqual(16);
  expect(
    Number.parseFloat(
      await page.getByTestId("reading-path-guided-description").evaluate((element) => getComputedStyle(element).fontSize),
    ),
  ).toBeGreaterThanOrEqual(14);
  await expect(page.getByTestId("reading-path-guided")).toContainText("Discover Scripture");
  await expect(page.getByTestId("reading-path-mountain-rhythm")).toContainText(
    "Build a lasting reading habit",
  );
  await page.getByTestId("reading-path-free-climb-action").click();
  await expect(page.getByTestId("first-plan-choose-books")).toContainText(
    "Choose Books",
  );
  await expect(page.getByTestId("first-plan-choose-books")).toContainText(
    "Build a plan from the books you want to read.",
  );
  const chooseBooksDescription = page.getByTestId("first-plan-choose-books").getByText(
    "Build a plan from the books you want to read.",
  );
  expect(
    Number.parseFloat(
      await chooseBooksDescription.evaluate((element) => getComputedStyle(element).fontSize),
    ),
  ).toBeGreaterThanOrEqual(14);
  await expect(chooseBooksDescription).toHaveCSS("color", "rgb(226, 232, 240)");
  const presetDetail = page
    .getByTestId("first-plan-preset-gospels")
    .getByText("Matthew, Mark, Luke, and John");
  expect(
    Number.parseFloat(
      await presetDetail.evaluate((element) => getComputedStyle(element).fontSize),
    ),
  ).toBeGreaterThanOrEqual(14);
  await expect(presetDetail).toHaveCSS("color", "rgb(226, 232, 240)");
  await page.getByTestId("first-plan-preset-gospels").click();
  await expect(page.getByTestId("first-plan-preset-gospels")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await onboarding.getByRole("button", { name: "Continue", exact: true }).click();

  await page.getByTestId("first-plan-minutes-15").click();
  await onboarding.getByRole("button", { name: "Continue", exact: true }).click();

  const today = todayISO();
  await page.locator('input[aria-label="Start date"]').fill(today);
  await onboarding.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator('input[aria-label="Finish date"]')).not.toHaveValue("");
  await onboarding.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(onboarding).toContainText("Gospels");
  await expect(onboarding).toContainText("15 minutes");
  await onboarding.getByTestId("first-plan-save-action").click();

  await expect(page.getByTestId("first-plan-onboarding")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-today-content")).toBeVisible();
  await expect(page.getByTestId("dashboard-assigned-reading")).toContainText("Matthew");
  await expect.poll(() => createRequestCount).toBe(1);
  expect(savedPlans[0]).toMatchObject({
    name: "Gospels",
    selectedBooks: ["Matthew", "Mark", "Luke", "John"],
    dailyMinutes: 15,
    paceMode: "time",
  });
});

test("development first-launch preview shows the chooser without mutating saved data", async ({ page }) => {
  let planWriteCount = 0;
  let eventWriteCount = 0;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname.endsWith("/auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ authenticated: false, user: null }),
      });
      return;
    }

    if (pathname.endsWith("/session/info")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          established: true,
          authenticated: false,
          userId: "dev-preview-user",
        }),
      });
      return;
    }

    if (pathname.endsWith("/reading/plans")) {
      if (request.method() === "POST" || request.method() === "DELETE") {
        planWriteCount += 1;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          plans: [{ id: "existing-dev-plan", name: "Existing plan", assignments: [], completed: {} }],
        }),
      });
      return;
    }

    if (pathname.endsWith("/events")) {
      if (request.method() === "POST" || request.method() === "DELETE") {
        eventWriteCount += 1;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          events: [{ id: "existing-dev-event", title: "Existing event", type: "prayer", date: todayISO() }],
        }),
      });
      return;
    }

    if (pathname.endsWith("/rhythm/score")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, eventCompletions: [] }),
      });
      return;
    }

    if (pathname.endsWith("/verse")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reference: "Psalm 1:1", text: "Blessed is the one." }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/?preview=first-launch");

  await expect(page.getByTestId("first-plan-onboarding")).toBeVisible();
  await expect(page.getByTestId("first-launch-preview-notice")).toBeVisible();
  await expect(page.getByTestId("first-launch-preview-notice")).toHaveCSS(
    "color",
    "rgb(241, 245, 249)",
  );
  expect(
    Number.parseFloat(
      await page.getByTestId("first-launch-preview-notice").evaluate((element) => getComputedStyle(element).fontSize),
    ),
  ).toBeGreaterThanOrEqual(12);
  const previewMetrics = await page.locator(".discipleos-app-content").evaluate((element) => {
    const home = element.querySelector<HTMLElement>(".discipleos-content--home");
    const choices = element.querySelector<HTMLElement>('[data-testid="reading-path-choices"]');
    const notice = element.querySelector<HTMLElement>('[data-testid="first-launch-preview-notice"]');
    const grid = choices?.querySelector<HTMLElement>(":scope > div");
    return {
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      homePaddingBottom: home && getComputedStyle(home).paddingBottom,
      noticeBottom: notice?.getBoundingClientRect().bottom,
      gridTop: grid?.getBoundingClientRect().top,
      gridMarginBlockStart: grid && getComputedStyle(grid).marginBlockStart,
    };
  });
  expect(
    previewMetrics.scrollHeight,
    JSON.stringify(previewMetrics),
  ).toBeLessThanOrEqual(previewMetrics.clientHeight + 1);
  await expect(page.getByTestId("reading-path-guided-action")).toBeDisabled();
  await expect(page.getByTestId("reading-path-free-climb-action")).toBeDisabled();
  await expect(page.getByTestId("reading-path-mountain-rhythm-action")).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(page.getByTestId("first-plan-sign-in-link")).toHaveCount(0);
  expect(planWriteCount).toBe(0);
  expect(eventWriteCount).toBe(0);
});

test("path choices adapt cleanly across small and large phone screens", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/auth/me")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: false, user: null }) });
      return;
    }
    if (pathname.endsWith("/session/info")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, established: false, authenticated: false, userId: "mobile-path-test" }) });
      return;
    }
    if (pathname.endsWith("/reading/plans")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, plans: [] }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, events: [], eventCompletions: [] }) });
  });
  await page.addInitScript(() => localStorage.clear());

  const cardHeightsByViewport: Array<{
    viewportHeight: number;
    cardHeight: number;
    cardGap: number;
  }> = [];
  const mobileViewports = [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 402, height: 874 },
    { width: 412, height: 915 },
    { width: 384, height: 854 },
    { width: 448, height: 998 },
  ];
  await page.setViewportSize(mobileViewports[0]);
  await page.goto("/");
  await page.locator(".launch-splash").waitFor({ state: "detached" });
  for (const viewport of mobileViewports) {
    await page.setViewportSize(viewport);
    const onboarding = page.getByTestId("first-plan-onboarding");
    await expect(onboarding).toBeVisible();
    await expect(page.getByTestId("first-plan-sign-up-link")).toBeVisible();
    await expect(page.getByTestId("first-plan-sign-in-link")).toBeVisible();
    await expect(page.locator("header h1")).toBeVisible();
    await expect(page.getByTestId("first-launch-preview-notice")).toHaveCount(0);
    const intro = page.getByText(
      "Wherever you are in your Scripture journey, there’s a path for you.",
    );
    if (viewport.height <= 640) await expect(intro).toBeHidden();
    else {
      await expect(intro).toBeVisible();
      expect(
        Number.parseFloat(
          await intro.evaluate((element) => getComputedStyle(element).fontSize),
        ),
      ).toBeGreaterThanOrEqual(14);
      await expect(intro).toHaveCSS("color", "rgb(241, 245, 249)");
    }
    await expect(page.getByTestId("reading-path-guided-description")).toHaveText(
      "New to reading the Bible? Start with a guided 27-day journey that introduces Scripture one step at a time.",
    );
    await expect(page.getByTestId("reading-path-mountain-rhythm-description")).toHaveText(
      "Struggling to read consistently? Build a lasting habit with structured climbs, reminders, and progress tracking.",
    );
    await expect(page.getByTestId("reading-path-free-climb-description")).toHaveText(
      "Already reading regularly? Choose and combine Bible reading plans that fit your interests and schedule.",
    );
    const contentArea = page.locator(".discipleos-app-content");
    const contentBox = await contentArea.boundingBox();
    expect(contentBox).not.toBeNull();
    const cardHeights: number[] = [];
    const cardTops: number[] = [];
    const cardBottoms: number[] = [];
    for (const id of [
      "reading-path-guided-action",
      "reading-path-mountain-rhythm-action",
      "reading-path-free-climb-action",
    ]) {
      const action = page.getByTestId(id);
      await expect(action).toBeVisible();
      const box = await action.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
      cardHeights.push(box!.height);
      cardTops.push(box!.y);
      cardBottoms.push(box!.y + box!.height);
      expect(box!.y + box!.height).toBeLessThanOrEqual(
        contentBox!.y + contentBox!.height,
      );
      const description = page.getByTestId(
        `${id.replace("-action", "")}-description`,
      );
      const title = page.getByTestId(`${id.replace("-action", "")}-title`);
      expect(
        Number.parseFloat(await title.evaluate((element) => getComputedStyle(element).fontSize)),
      ).toBeGreaterThanOrEqual(16);
      const descriptionStyle = await description.evaluate((element) => {
        const style = getComputedStyle(element);
        return { fontSize: Number.parseFloat(style.fontSize), lineHeight: Number.parseFloat(style.lineHeight), color: style.color };
      });
      expect(descriptionStyle.fontSize).toBeGreaterThanOrEqual(14);
      expect(descriptionStyle.lineHeight).toBeGreaterThanOrEqual(20);
      expect(descriptionStyle.color).toBe("rgb(226, 232, 240)");
      const descriptionLines = await description.evaluate((element) => {
        const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
        return Math.round(element.getBoundingClientRect().height / lineHeight);
      });
      expect(descriptionLines, `${viewport.width}x${viewport.height} ${id}`).toBeLessThanOrEqual(4);
    }
    expect(Math.max(...cardHeights) - Math.min(...cardHeights)).toBeLessThanOrEqual(1);
    expect(Math.max(...cardHeights)).toBeLessThanOrEqual(164);
    const cardGap =
      (cardTops[1] - cardBottoms[0] + cardTops[2] - cardBottoms[1]) / 2;
    cardHeightsByViewport.push({
      viewportHeight: viewport.height,
      cardHeight: Math.max(...cardHeights),
      cardGap,
    });
    const scrollMetrics = await contentArea.evaluate((element) => {
      const describe = (selector: string) => {
        const node = element.querySelector<HTMLElement>(selector);
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          top: Math.round(rect.top),
          height: Math.round(rect.height),
          scrollHeight: node.scrollHeight,
          minHeight: style.minHeight,
          paddingTop: style.paddingTop,
          paddingBottom: style.paddingBottom,
        };
      };
      return {
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        shell: describe(".discipleos-shell"),
        home: describe(".discipleos-content--home"),
        onboarding: describe("[data-testid='first-plan-onboarding']"),
        cards: Array.from(
          element.querySelectorAll<HTMLElement>("[data-testid^='reading-path-']:not([data-testid$='-action'])"),
        ).map((card) => ({
          id: card.dataset.testid,
          top: Math.round(card.getBoundingClientRect().top),
          height: Math.round(card.getBoundingClientRect().height),
        })),
      };
    });
    expect(
      scrollMetrics.scrollHeight,
      `${viewport.width}x${viewport.height}: ${JSON.stringify(scrollMetrics)}`,
    ).toBeLessThanOrEqual(scrollMetrics.clientHeight + 1);
    const zones = await contentArea.evaluate((element) => {
      const content = element.getBoundingClientRect();
      const main = element.querySelector<HTMLElement>('[data-testid="first-plan-onboarding"]');
      const surface = main?.querySelector<HTMLElement>(".discipleos-functional-surface");
      const choices = element.querySelector<HTMLElement>('[data-testid="reading-path-choices"]');
      const grid = choices?.querySelector<HTMLElement>(":scope > div");
      const brandHeader = element.querySelector<HTMLElement>(".discipleos-content--first-plan > header");
      const choiceHeading = choices?.querySelector<HTMLElement>(":scope > h2");
      const intro = choices?.querySelector<HTMLElement>(".discipleos-onboarding-intro");
      const footer = element.querySelector<HTMLElement>("[data-testid='first-plan-lower-controls']");
      const actions = Array.from(
        element.querySelectorAll<HTMLElement>('[data-testid$="-action"][data-testid^="reading-path-"]'),
      );
      const mainRect = main?.getBoundingClientRect();
      const describe = (node: HTMLElement | null | undefined) => {
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          top: rect.top,
          height: rect.height,
          flex: style.flex,
          display: style.display,
        };
      };
      const cardRects = actions.map((action) => action.getBoundingClientRect());
      const firstCardTop = Math.min(...cardRects.map((rect) => rect.top));
      const lastCardBottom = Math.max(...cardRects.map((rect) => rect.bottom));
      return {
        contentHeight: content.height,
        mainWidthRatio: mainRect ? mainRect.width / window.innerWidth : 0,
        topRatio: (firstCardTop - content.top) / content.height,
        cardsRatio: (lastCardBottom - firstCardTop) / content.height,
        lowerRatio: (content.bottom - lastCardBottom) / content.height,
        parts: {
          main: describe(main),
          surface: describe(surface),
          choices: describe(choices),
          grid: describe(grid),
          brandHeader: describe(brandHeader),
          choiceHeading: describe(choiceHeading),
          intro: describe(intro),
          footer: describe(footer),
        },
      };
    });
    expect(zones.mainWidthRatio, `${viewport.width}x${viewport.height}: ${JSON.stringify(zones)}`).toBeGreaterThanOrEqual(0.9);
    expect(zones.mainWidthRatio, `${viewport.width}x${viewport.height}: ${JSON.stringify(zones)}`).toBeLessThanOrEqual(0.94);
    if (viewport.height >= 667) {
      expect(zones.topRatio, `${viewport.width}x${viewport.height}: ${JSON.stringify(zones)}`).toBeGreaterThanOrEqual(0.1);
      expect(zones.topRatio, `${viewport.width}x${viewport.height}: ${JSON.stringify(zones)}`).toBeLessThanOrEqual(0.28);
      expect(zones.cardsRatio, `${viewport.width}x${viewport.height}: ${JSON.stringify(zones)}`).toBeGreaterThanOrEqual(0.58);
      expect(zones.cardsRatio, `${viewport.width}x${viewport.height}: ${JSON.stringify(zones)}`).toBeLessThanOrEqual(0.78);
      expect(zones.lowerRatio, `${viewport.width}x${viewport.height}: ${JSON.stringify(zones)}`).toBeGreaterThanOrEqual(0.1);
      expect(zones.lowerRatio, `${viewport.width}x${viewport.height}: ${JSON.stringify(zones)}`).toBeLessThanOrEqual(0.23);
    }
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  }
  const heightFor = (viewportHeight: number) =>
    cardHeightsByViewport.find((result) => result.viewportHeight === viewportHeight)!
      .cardHeight;
  const gapFor = (viewportHeight: number) =>
    cardHeightsByViewport.find((result) => result.viewportHeight === viewportHeight)!
      .cardGap;
  expect(heightFor(874)).toBeGreaterThan(heightFor(667));
  expect(heightFor(915)).toBeGreaterThanOrEqual(heightFor(874));
  expect(gapFor(915)).toBeGreaterThan(gapFor(667));

  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.locator("header h1")).toBeVisible();
    await expect(page.getByTestId("first-plan-sign-in-link")).toBeVisible();
    const cardBoxes = await Promise.all(
      [
        "reading-path-guided-action",
        "reading-path-mountain-rhythm-action",
        "reading-path-free-climb-action",
      ].map(async (id) => {
        const card = page.getByTestId(id);
        await expect(card).toBeVisible();
        return card.boundingBox();
      }),
    );
    expect(cardBoxes.every(Boolean)).toBe(true);
    expect(cardBoxes[0]!.width).toBeGreaterThanOrEqual(300);
    for (const box of cardBoxes.slice(1)) {
      expect(Math.abs(box!.x - cardBoxes[0]!.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(box!.width - cardBoxes[0]!.width)).toBeLessThanOrEqual(1);
    }
    const logo = await page.locator("header h1").boundingBox();
    expect(logo).not.toBeNull();
    expect(logo!.x + logo!.width).toBeLessThanOrEqual(viewport.width);
    if (viewport.height <= 500) {
      for (const id of ["first-plan-sign-up-link", "first-plan-sign-in-link"]) {
        const linkBox = await page.getByTestId(id).boundingBox();
        expect(linkBox).not.toBeNull();
        expect(linkBox!.y + linkBox!.height).toBeLessThanOrEqual(viewport.height);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
  }
});