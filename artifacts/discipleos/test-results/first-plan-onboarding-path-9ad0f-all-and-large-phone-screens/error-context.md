# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: first-plan-onboarding.spec.ts >> path choices adapt cleanly across small and large phone screens
- Location: tests/e2e/first-plan-onboarding.spec.ts:271:1

# Error details

```
Error: 320x568: {"scrollHeight":496,"clientHeight":492,"shell":{"top":0,"height":496,"scrollHeight":496,"minHeight":"100%","paddingTop":"0px","paddingBottom":"0px"},"home":{"top":0,"height":496,"scrollHeight":496,"minHeight":"100%","paddingTop":"12px","paddingBottom":"8px"},"onboarding":{"top":80,"height":408,"scrollHeight":408,"minHeight":"400px","paddingTop":"0px","paddingBottom":"0px"},"cards":[{"id":"reading-path-choices","top":91,"height":362},{"id":"reading-path-guided","top":123,"height":110},{"id":"reading-path-guided-description","top":170,"height":54},{"id":"reading-path-mountain-rhythm","top":233,"height":110},{"id":"reading-path-mountain-rhythm-description","top":280,"height":54},{"id":"reading-path-free-climb","top":343,"height":110},{"id":"reading-path-free-climb-description","top":390,"height":54}]}

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 493
Received:    496
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - status "Loading DiscipleOS"
  - button "Feedback" [ref=e3] [cursor=pointer]:
    - generic [ref=e4]: ✦
    - text: Feedback
  - generic [ref=e8]:
    - banner [ref=e9]:
      - heading "DISCIPLEOS" [level=1] [ref=e10]
      - link "Continue with email" [ref=e11] [cursor=pointer]:
        - /url: /sign-in
    - main [ref=e12]:
      - generic [ref=e14]:
        - region "Reading paths" [ref=e15]:
          - heading "How would you like to start?" [level=2] [ref=e16]
          - generic [ref=e17]:
            - article [ref=e18]:
              - button "Guided Climb New to reading the Bible? Start with a guided 27-day journey that introduces Scripture one step at a time." [ref=e19]:
                - generic [ref=e20]:
                  - generic [ref=e21]: Guided Climb
                  - generic [ref=e29]: New to reading the Bible? Start with a guided 27-day journey that introduces Scripture one step at a time.
            - article [ref=e30]:
              - link "Mountain Rhythm Struggling to read consistently? Build a lasting habit with structured climbs, reminders, and progress tracking." [ref=e31] [cursor=pointer]:
                - /url: /mountain-rhythm
                - generic [ref=e32]:
                  - generic [ref=e33]: Mountain Rhythm
                  - generic [ref=e41]: Struggling to read consistently? Build a lasting habit with structured climbs, reminders, and progress tracking.
            - article [ref=e42]:
              - button "Free Climb Already reading regularly? Choose and combine Bible reading plans that fit your interests and schedule." [ref=e43]:
                - generic [ref=e44]:
                  - generic [ref=e45]: Free Climb
                  - generic [ref=e54]: Already reading regularly? Choose and combine Bible reading plans that fit your interests and schedule.
        - generic [ref=e55]:
          - text: "Sync plans:"
          - link "Create a free account first" [ref=e56] [cursor=pointer]:
            - /url: /sign-up
          - text: or
          - link "sign in" [ref=e57] [cursor=pointer]:
            - /url: /sign-in
          - text: .
```

# Test source

```ts
  285 |     }
  286 |     await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, events: [], eventCompletions: [] }) });
  287 |   });
  288 |   await page.addInitScript(() => localStorage.clear());
  289 | 
  290 |   const cardHeightsByViewport: Array<{ viewportHeight: number; cardHeight: number }> = [];
  291 |   for (const viewport of [
  292 |     { width: 320, height: 568 },
  293 |     { width: 375, height: 667 },
  294 |     { width: 384, height: 854 },
  295 |     { width: 448, height: 998 },
  296 |   ]) {
  297 |     await page.setViewportSize(viewport);
  298 |     await page.goto("/");
  299 |     const onboarding = page.getByTestId("first-plan-onboarding");
  300 |     await expect(onboarding).toBeVisible();
  301 |     await expect(page.getByTestId("first-plan-sign-up-link")).toBeVisible();
  302 |     await expect(page.getByTestId("first-plan-sign-in-link")).toBeVisible();
  303 |     await expect(page.locator("header h1")).toBeVisible();
  304 |     await expect(page.getByTestId("first-launch-preview-notice")).toHaveCount(0);
  305 |     const intro = page.getByText(
  306 |       "Wherever you are in your Scripture journey, there’s a path for you.",
  307 |     );
  308 |     if (viewport.height <= 640) await expect(intro).toBeHidden();
  309 |     else await expect(intro).toBeVisible();
  310 |     await expect(page.getByTestId("reading-path-guided-description")).toHaveText(
  311 |       "New to reading the Bible? Start with a guided 27-day journey that introduces Scripture one step at a time.",
  312 |     );
  313 |     await expect(page.getByTestId("reading-path-mountain-rhythm-description")).toHaveText(
  314 |       "Struggling to read consistently? Build a lasting habit with structured climbs, reminders, and progress tracking.",
  315 |     );
  316 |     await expect(page.getByTestId("reading-path-free-climb-description")).toHaveText(
  317 |       "Already reading regularly? Choose and combine Bible reading plans that fit your interests and schedule.",
  318 |     );
  319 |     const contentArea = page.locator(".discipleos-app-content");
  320 |     const contentBox = await contentArea.boundingBox();
  321 |     expect(contentBox).not.toBeNull();
  322 |     const cardHeights: number[] = [];
  323 |     for (const id of [
  324 |       "reading-path-guided-action",
  325 |       "reading-path-mountain-rhythm-action",
  326 |       "reading-path-free-climb-action",
  327 |     ]) {
  328 |       const action = page.getByTestId(id);
  329 |       await expect(action).toBeVisible();
  330 |       const box = await action.boundingBox();
  331 |       expect(box?.width).toBeGreaterThanOrEqual(44);
  332 |       expect(box?.height).toBeGreaterThanOrEqual(44);
  333 |       cardHeights.push(box!.height);
  334 |       expect(box!.y + box!.height).toBeLessThanOrEqual(
  335 |         contentBox!.y + contentBox!.height,
  336 |       );
  337 |       const description = page.getByTestId(
  338 |         `${id.replace("-action", "")}-description`,
  339 |       );
  340 |       const descriptionLines = await description.evaluate((element) => {
  341 |         const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
  342 |         return Math.round(element.getBoundingClientRect().height / lineHeight);
  343 |       });
  344 |       expect(descriptionLines, `${viewport.width}x${viewport.height} ${id}`).toBeLessThanOrEqual(3);
  345 |     }
  346 |     expect(Math.max(...cardHeights) - Math.min(...cardHeights)).toBeLessThanOrEqual(1);
  347 |     expect(Math.max(...cardHeights)).toBeLessThanOrEqual(164);
  348 |     cardHeightsByViewport.push({
  349 |       viewportHeight: viewport.height,
  350 |       cardHeight: Math.max(...cardHeights),
  351 |     });
  352 |     const scrollMetrics = await contentArea.evaluate((element) => {
  353 |       const describe = (selector: string) => {
  354 |         const node = element.querySelector<HTMLElement>(selector);
  355 |         if (!node) return null;
  356 |         const rect = node.getBoundingClientRect();
  357 |         const style = getComputedStyle(node);
  358 |         return {
  359 |           top: Math.round(rect.top),
  360 |           height: Math.round(rect.height),
  361 |           scrollHeight: node.scrollHeight,
  362 |           minHeight: style.minHeight,
  363 |           paddingTop: style.paddingTop,
  364 |           paddingBottom: style.paddingBottom,
  365 |         };
  366 |       };
  367 |       return {
  368 |         scrollHeight: element.scrollHeight,
  369 |         clientHeight: element.clientHeight,
  370 |         shell: describe(".discipleos-shell"),
  371 |         home: describe(".discipleos-content--home"),
  372 |         onboarding: describe("[data-testid='first-plan-onboarding']"),
  373 |         cards: Array.from(
  374 |           element.querySelectorAll<HTMLElement>("[data-testid^='reading-path-']:not([data-testid$='-action'])"),
  375 |         ).map((card) => ({
  376 |           id: card.dataset.testid,
  377 |           top: Math.round(card.getBoundingClientRect().top),
  378 |           height: Math.round(card.getBoundingClientRect().height),
  379 |         })),
  380 |       };
  381 |     });
  382 |     expect(
  383 |       scrollMetrics.scrollHeight,
  384 |       `${viewport.width}x${viewport.height}: ${JSON.stringify(scrollMetrics)}`,
> 385 |     ).toBeLessThanOrEqual(scrollMetrics.clientHeight + 1);
      |       ^ Error: 320x568: {"scrollHeight":496,"clientHeight":492,"shell":{"top":0,"height":496,"scrollHeight":496,"minHeight":"100%","paddingTop":"0px","paddingBottom":"0px"},"home":{"top":0,"height":496,"scrollHeight":496,"minHeight":"100%","paddingTop":"12px","paddingBottom":"8px"},"onboarding":{"top":80,"height":408,"scrollHeight":408,"minHeight":"400px","paddingTop":"0px","paddingBottom":"0px"},"cards":[{"id":"reading-path-choices","top":91,"height":362},{"id":"reading-path-guided","top":123,"height":110},{"id":"reading-path-guided-description","top":170,"height":54},{"id":"reading-path-mountain-rhythm","top":233,"height":110},{"id":"reading-path-mountain-rhythm-description","top":280,"height":54},{"id":"reading-path-free-climb","top":343,"height":110},{"id":"reading-path-free-climb-description","top":390,"height":54}]}
  386 |     const hasHorizontalOverflow = await page.evaluate(
  387 |       () => document.documentElement.scrollWidth > window.innerWidth,
  388 |     );
  389 |     expect(hasHorizontalOverflow).toBe(false);
  390 |   }
  391 |   const heightFor = (viewportHeight: number) =>
  392 |     cardHeightsByViewport.find((result) => result.viewportHeight === viewportHeight)!
  393 |       .cardHeight;
  394 |   expect(heightFor(854)).toBeGreaterThan(heightFor(667));
  395 |   expect(heightFor(998)).toBeGreaterThan(heightFor(854));
  396 | 
  397 |   for (const viewport of [
  398 |     { width: 1024, height: 768 },
  399 |     { width: 844, height: 390 },
  400 |   ]) {
  401 |     await page.setViewportSize(viewport);
  402 |     await page.goto("/");
  403 |     await expect(page.locator("header h1")).toBeVisible();
  404 |     await expect(page.getByTestId("first-plan-sign-in-link")).toBeVisible();
  405 |     const cardBoxes = await Promise.all(
  406 |       [
  407 |         "reading-path-guided-action",
  408 |         "reading-path-mountain-rhythm-action",
  409 |         "reading-path-free-climb-action",
  410 |       ].map(async (id) => {
  411 |         const card = page.getByTestId(id);
  412 |         await expect(card).toBeVisible();
  413 |         return card.boundingBox();
  414 |       }),
  415 |     );
  416 |     expect(cardBoxes.every(Boolean)).toBe(true);
  417 |     expect(cardBoxes[0]!.width).toBeGreaterThanOrEqual(300);
  418 |     for (const box of cardBoxes.slice(1)) {
  419 |       expect(Math.abs(box!.x - cardBoxes[0]!.x)).toBeLessThanOrEqual(1);
  420 |       expect(Math.abs(box!.width - cardBoxes[0]!.width)).toBeLessThanOrEqual(1);
  421 |     }
  422 |     const logo = await page.locator("header h1").boundingBox();
  423 |     expect(logo).not.toBeNull();
  424 |     expect(logo!.x + logo!.width).toBeLessThanOrEqual(viewport.width);
  425 |     if (viewport.height <= 500) {
  426 |       for (const id of ["first-plan-sign-up-link", "first-plan-sign-in-link"]) {
  427 |         const linkBox = await page.getByTestId(id).boundingBox();
  428 |         expect(linkBox).not.toBeNull();
  429 |         expect(linkBox!.y + linkBox!.height).toBeLessThanOrEqual(viewport.height);
  430 |       }
  431 |     }
  432 |     expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
  433 |       viewport.width,
  434 |     );
  435 |   }
  436 | });
```