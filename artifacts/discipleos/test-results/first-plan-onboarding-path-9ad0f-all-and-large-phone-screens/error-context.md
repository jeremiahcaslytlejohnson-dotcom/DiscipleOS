# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: first-plan-onboarding.spec.ts >> path choices adapt cleanly across small and large phone screens
- Location: tests/e2e/first-plan-onboarding.spec.ts:349:1

# Error details

```
Error: expect(locator).toHaveCSS(expected) failed

Locator:  getByText('Wherever you are in your Scripture journey, there’s a path for you.')
Expected: "rgb(241, 245, 249)"
Received: "rgb(201, 205, 211)"
Timeout:  5000ms

Call log:
  - Expect "toHaveCSS" with timeout 5000ms
  - waiting for getByText('Wherever you are in your Scripture journey, there’s a path for you.')
    14 × locator resolved to <p data-component-name="p" class="discipleos-onboarding-intro text-sm leading-5 text-[#F1F5F9]" data-replit-metadata="artifacts/discipleos/src/components/ReadingPathChoices.tsx:72:8">Wherever you are in your Scripture journey, there…</p>
       - unexpected value "rgb(201, 205, 211)"

```

```yaml
- paragraph: Wherever you are in your Scripture journey, there’s a path for you.
```

# Test source

```ts
  298 |       homePaddingBottom: home && getComputedStyle(home).paddingBottom,
  299 |       noticeBottom: notice?.getBoundingClientRect().bottom,
  300 |       gridTop: grid?.getBoundingClientRect().top,
  301 |       gridMarginBlockStart: grid && getComputedStyle(grid).marginBlockStart,
  302 |     };
  303 |   });
  304 |   expect(
  305 |     previewMetrics.scrollHeight,
  306 |     JSON.stringify(previewMetrics),
  307 |   ).toBeLessThanOrEqual(previewMetrics.clientHeight + 1);
  308 |   await expect(page.getByTestId("reading-path-guided-action")).toBeDisabled();
  309 |   await expect(page.getByTestId("reading-path-free-climb-action")).toBeDisabled();
  310 |   await expect(page.getByTestId("reading-path-mountain-rhythm-action")).toHaveAttribute(
  311 |     "aria-disabled",
  312 |     "true",
  313 |   );
  314 |   for (const card of [
  315 |     page.getByTestId("reading-path-guided-action"),
  316 |     page.getByTestId("reading-path-mountain-rhythm-action"),
  317 |     page.getByTestId("reading-path-free-climb-action"),
  318 |   ]) {
  319 |     await expect(card).toHaveCSS("opacity", "1");
  320 |     const textColors = await card.evaluate((element) => {
  321 |       const title = element.querySelector<HTMLElement>('[data-testid$="-title"]');
  322 |       const description = element.querySelector<HTMLElement>('[data-testid$="-description"]');
  323 |       const accent = element.querySelector<HTMLElement>("svg");
  324 |       return {
  325 |         title: title && getComputedStyle(title).color,
  326 |         description: description && getComputedStyle(description).color,
  327 |         accent: accent && getComputedStyle(accent).color,
  328 |       };
  329 |     });
  330 |     expect(textColors.title).toBe("rgb(245, 246, 248)");
  331 |     expect(textColors.description).toBe("rgb(201, 205, 211)");
  332 |     expect(textColors.accent).toBe("rgb(244, 197, 66)");
  333 |   }
  334 |   await page.setViewportSize({ width: 1280, height: 900 });
  335 |   await expect(page.getByTestId("first-plan-onboarding")).toBeVisible();
  336 |   await expect(page.getByTestId("reading-path-guided-action")).toHaveCSS("opacity", "1");
  337 |   await expect(
  338 |     page.getByTestId("reading-path-guided-title"),
  339 |   ).toHaveCSS("color", "rgb(245, 246, 248)");
  340 |   await expect(
  341 |     page.getByTestId("reading-path-guided-action").locator("svg").first(),
  342 |   ).toHaveCSS("color", "rgb(244, 197, 66)");
  343 |   await expect(page.getByTestId("reading-path-guided-action")).toContainText("Discover Scripture");
  344 |   await expect(page.getByTestId("first-plan-sign-in-link")).toHaveCount(0);
  345 |   expect(planWriteCount).toBe(0);
  346 |   expect(eventWriteCount).toBe(0);
  347 | });
  348 | 
  349 | test("path choices adapt cleanly across small and large phone screens", async ({ page }) => {
  350 |   await page.route("**/api/**", async (route) => {
  351 |     const pathname = new URL(route.request().url()).pathname;
  352 |     if (pathname.endsWith("/auth/me")) {
  353 |       await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: false, user: null }) });
  354 |       return;
  355 |     }
  356 |     if (pathname.endsWith("/session/info")) {
  357 |       await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, established: false, authenticated: false, userId: "mobile-path-test" }) });
  358 |       return;
  359 |     }
  360 |     if (pathname.endsWith("/reading/plans")) {
  361 |       await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, plans: [] }) });
  362 |       return;
  363 |     }
  364 |     await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, events: [], eventCompletions: [] }) });
  365 |   });
  366 |   await page.addInitScript(() => localStorage.clear());
  367 | 
  368 |   const mobileViewports = [
  369 |     { width: 375, height: 667 },
  370 |     { width: 402, height: 874 },
  371 |     { width: 412, height: 915 },
  372 |     { width: 384, height: 854 },
  373 |     { width: 448, height: 998 },
  374 |     { width: 320, height: 568 },
  375 |   ];
  376 |   await page.setViewportSize(mobileViewports[0]);
  377 |   await page.goto("/");
  378 |   await page.locator(".launch-splash").waitFor({ state: "detached" });
  379 |   for (const viewport of mobileViewports) {
  380 |     await page.setViewportSize(viewport);
  381 |     const onboarding = page.getByTestId("first-plan-onboarding");
  382 |     await expect(onboarding).toBeVisible();
  383 |     await expect(page.getByTestId("first-plan-sign-up-link")).toBeVisible();
  384 |     await expect(page.getByTestId("first-plan-sign-in-link")).toBeVisible();
  385 |     await expect(page.locator("header h1")).toBeVisible();
  386 |     await expect(page.getByTestId("first-launch-preview-notice")).toHaveCount(0);
  387 |     const intro = page.getByText(
  388 |       "Wherever you are in your Scripture journey, there’s a path for you.",
  389 |     );
  390 |     if (viewport.height <= 640) await expect(intro).toBeHidden();
  391 |     else {
  392 |       await expect(intro).toBeVisible();
  393 |       expect(
  394 |         Number.parseFloat(
  395 |           await intro.evaluate((element) => getComputedStyle(element).fontSize),
  396 |         ),
  397 |       ).toBeGreaterThanOrEqual(14);
> 398 |       await expect(intro).toHaveCSS("color", "rgb(241, 245, 249)");
      |                           ^ Error: expect(locator).toHaveCSS(expected) failed
  399 |     }
  400 |     await expect(page.getByTestId("reading-path-guided-description")).toHaveText(
  401 |       "New to reading the Bible? Start with a guided 27-day journey that introduces Scripture one step at a time.",
  402 |     );
  403 |     await expect(page.getByTestId("reading-path-mountain-rhythm-description")).toHaveText(
  404 |       "Struggling to read consistently? Build a lasting habit with structured climbs, reminders, and progress tracking.",
  405 |     );
  406 |     await expect(page.getByTestId("reading-path-free-climb-description")).toHaveText(
  407 |       "Already reading regularly? Choose and combine Bible reading plans that fit your interests and schedule.",
  408 |     );
  409 |     const contentArea = page.locator(".discipleos-app-content");
  410 |     const contentBox = await contentArea.boundingBox();
  411 |     expect(contentBox).not.toBeNull();
  412 |     if (viewport.height >= 667) {
  413 |       for (const id of ["first-plan-sign-up-link", "first-plan-sign-in-link"]) {
  414 |         const linkBox = await page.getByTestId(id).boundingBox();
  415 |         expect(linkBox).not.toBeNull();
  416 |         expect(linkBox!.y + linkBox!.height).toBeLessThanOrEqual(
  417 |           contentBox!.y + contentBox!.height,
  418 |         );
  419 |       }
  420 |     }
  421 |     const cardHeights: number[] = [];
  422 |     const cardTops: number[] = [];
  423 |     const cardBottoms: number[] = [];
  424 |     for (const id of [
  425 |       "reading-path-guided-action",
  426 |       "reading-path-mountain-rhythm-action",
  427 |       "reading-path-free-climb-action",
  428 |     ]) {
  429 |       const action = page.getByTestId(id);
  430 |       await expect(action).toBeVisible();
  431 |       const box = await action.boundingBox();
  432 |       expect(box?.width).toBeGreaterThanOrEqual(44);
  433 |       expect(box?.height).toBeGreaterThanOrEqual(44);
  434 |       cardHeights.push(box!.height);
  435 |       cardTops.push(box!.y);
  436 |       cardBottoms.push(box!.y + box!.height);
  437 |       if (viewport.height >= 667) {
  438 |         expect(box!.y + box!.height).toBeLessThanOrEqual(
  439 |           contentBox!.y + contentBox!.height,
  440 |         );
  441 |       }
  442 |       const description = page.getByTestId(
  443 |         `${id.replace("-action", "")}-description`,
  444 |       );
  445 |       const title = page.getByTestId(`${id.replace("-action", "")}-title`);
  446 |       expect(
  447 |         Number.parseFloat(await title.evaluate((element) => getComputedStyle(element).fontSize)),
  448 |       ).toBeGreaterThanOrEqual(16);
  449 |       const descriptionStyle = await description.evaluate((element) => {
  450 |         const style = getComputedStyle(element);
  451 |         return { fontSize: Number.parseFloat(style.fontSize), lineHeight: Number.parseFloat(style.lineHeight), color: style.color };
  452 |       });
  453 |       expect(descriptionStyle.fontSize).toBeGreaterThanOrEqual(16);
  454 |       expect(descriptionStyle.lineHeight).toBeGreaterThanOrEqual(21);
  455 |       expect(descriptionStyle.color).toBe("rgb(241, 245, 249)");
  456 |       const descriptionLines = await description.evaluate((element) => {
  457 |         const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
  458 |         return Math.round(element.getBoundingClientRect().height / lineHeight);
  459 |       });
  460 |       expect(descriptionLines, `${viewport.width}x${viewport.height} ${id}`).toBeLessThanOrEqual(4);
  461 |     }
  462 |     const cardGap =
  463 |       (cardTops[1] - cardBottoms[0] + cardTops[2] - cardBottoms[1]) / 2;
  464 |     expect(cardGap).toBeGreaterThanOrEqual(10);
  465 |     expect(cardGap).toBeLessThanOrEqual(14);
  466 |     expect(Math.max(...cardHeights)).toBeLessThanOrEqual(180);
  467 |     const scrollMetrics = await contentArea.evaluate((element) => {
  468 |       const describe = (selector: string) => {
  469 |         const node = element.querySelector<HTMLElement>(selector);
  470 |         if (!node) return null;
  471 |         const rect = node.getBoundingClientRect();
  472 |         const style = getComputedStyle(node);
  473 |         return {
  474 |           top: Math.round(rect.top),
  475 |           height: Math.round(rect.height),
  476 |           scrollHeight: node.scrollHeight,
  477 |           minHeight: style.minHeight,
  478 |           paddingTop: style.paddingTop,
  479 |           paddingBottom: style.paddingBottom,
  480 |         };
  481 |       };
  482 |       return {
  483 |         scrollHeight: element.scrollHeight,
  484 |         clientHeight: element.clientHeight,
  485 |         shell: describe(".discipleos-shell"),
  486 |         home: describe(".discipleos-content--home"),
  487 |         onboarding: describe("[data-testid='first-plan-onboarding']"),
  488 |         cards: Array.from(
  489 |           element.querySelectorAll<HTMLElement>("[data-testid^='reading-path-']:not([data-testid$='-action'])"),
  490 |         ).map((card) => ({
  491 |           id: card.dataset.testid,
  492 |           top: Math.round(card.getBoundingClientRect().top),
  493 |           height: Math.round(card.getBoundingClientRect().height),
  494 |         })),
  495 |       };
  496 |     });
  497 |     if (viewport.height >= 667) {
  498 |       expect(
```