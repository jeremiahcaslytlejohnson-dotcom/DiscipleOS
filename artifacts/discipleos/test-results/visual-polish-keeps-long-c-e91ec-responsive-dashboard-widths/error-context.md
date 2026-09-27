# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-polish.spec.ts >> keeps long content inset and fully visible across responsive dashboard widths
- Location: tests/e2e/visual-polish.spec.ts:2058:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByTestId('dashboard-navigation-row')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('dashboard-navigation-row')
    14 × locator resolved to <div role="navigation" data-component-name="div" aria-label="Dashboard navigation" data-testid="dashboard-navigation-row" data-replit-metadata="artifacts/discipleos/src/pages/Home.tsx:4153:10" class="hidden w-full max-w-full flex-wrap items-center justify-center gap-1 overflow-visible md:mx-auto md:flex lg:gap-2">…</div>
       - unexpected value "hidden"

```

```yaml
- button "Feedback"
- heading "DISCIPLEOS" [level=1]
- link "Continue with email":
  - /url: /sign-in
- paragraph: Today’s reading · keep taking the next faithful step
- text: Verse of the day “Blessed is the one who walks not in step with the wicked.” Psalm 1:1
- button "Today’s Reading 0 of 1 chapters complete" [expanded]
- text: Today’s completion 0 of 1 chapters complete
- button "Open day view"
- text: A very long morning Scripture plan that should wrap instead of clipping 1 reading · ~0m
- button "Complete day"
- button "Open plan"
- button "Psalm 119:105 — a long assigned reading label that should remain readable Reading"
- button "Today’s Activities" [expanded]
- text: prayer
- button "Complete activity"
- button "Edit A long prayer and fellowship event title that should wrap inside the calendar row"
- text: A long prayer and fellowship event title that should wrap inside the calendar row 6:30 AM today A longer note with enough words to expose fixed-width children and unintended horizontal overflow.
- button "Progress Ordinary reading plans"
- button "Mountain Rhythm Long-term climb progress"
- link "Details":
  - /url: /mountain-rhythm
```

# Test source

```ts
  154 |         status: 200,
  155 |         contentType: "application/json",
  156 |         body: JSON.stringify({ success: true, eventCompletions: [] }),
  157 |       });
  158 |       return;
  159 |     }
  160 | 
  161 |     if (pathname.endsWith("/verse")) {
  162 |       await route.fulfill({
  163 |         status: 200,
  164 |         contentType: "application/json",
  165 |         body: JSON.stringify({
  166 |           reference: "Psalm 1:1",
  167 |           text: "Blessed is the one who walks not in step with the wicked.",
  168 |         }),
  169 |       });
  170 |       return;
  171 |     }
  172 | 
  173 |     if (pathname.endsWith("/reading/day-complete") && route.request().method() === "POST") {
  174 |       const payload = route.request().postDataJSON() as {
  175 |         planId?: string;
  176 |         date?: string;
  177 |         completed?: boolean;
  178 |       };
  179 |       const plan = plans.find((item: any) => item.id === payload.planId) as any;
  180 |       const assignment = plan?.assignments?.find((item: any) => item.date === payload.date);
  181 |       if (plan && assignment) {
  182 |         plan.completed = {
  183 |           ...(plan.completed || {}),
  184 |           ...Object.fromEntries(
  185 |             assignment.readings.map((reading: any) => [reading.key, Boolean(payload.completed)]),
  186 |           ),
  187 |         };
  188 |       }
  189 |       await route.fulfill({
  190 |         status: 200,
  191 |         contentType: "application/json",
  192 |         body: JSON.stringify({ success: true }),
  193 |       });
  194 |       return;
  195 |     }
  196 | 
  197 |     await route.fulfill({
  198 |       status: 200,
  199 |       contentType: "application/json",
  200 |       body: JSON.stringify({ success: true }),
  201 |     });
  202 |   });
  203 | }
  204 | 
  205 | async function stubMountainApi(page: Page) {
  206 |   await page.route("**/api/**", async (route) => {
  207 |     const pathname = new URL(route.request().url()).pathname;
  208 |     const body = pathname.endsWith("/session/info")
  209 |       ? { success: true, established: false }
  210 |       : pathname.endsWith("/reading/plans")
  211 |         ? { success: true, plans: [] }
  212 |         : pathname.endsWith("/events")
  213 |           ? { success: true, events: [] }
  214 |           : pathname.endsWith("/rhythm/score")
  215 |             ? { success: true, eventCompletions: [] }
  216 |             : { success: true };
  217 | 
  218 |     await route.fulfill({
  219 |       status: 200,
  220 |       contentType: "application/json",
  221 |       body: JSON.stringify(body),
  222 |     });
  223 |   });
  224 | }
  225 | 
  226 | async function seedPlans(
  227 |   page: Page,
  228 |   plans: unknown[],
  229 |   events: unknown[] = [],
  230 |   preserveExisting = false,
  231 | ) {
  232 |   await page.addInitScript(
  233 |     ({ seededPlans, seededEvents, preserve }) => {
  234 |       if (preserve && localStorage.getItem("discipleos-data")) return;
  235 |       localStorage.setItem(
  236 |         "discipleos-data",
  237 |         JSON.stringify({
  238 |           ownerId: null,
  239 |           plans: seededPlans,
  240 |           events: seededEvents,
  241 |           eventCompletions: {},
  242 |           selectedPlanId: seededPlans[0]?.id || null,
  243 |         }),
  244 |       );
  245 |     },
  246 |     { seededPlans: plans, seededEvents: events, preserve: preserveExisting },
  247 |   );
  248 | }
  249 | 
  250 | async function openDashboardNavigation(page: Page) {
  251 |   await page.locator(".launch-splash").waitFor({ state: "detached" }).catch(() => {});
  252 |   if ((page.viewportSize()?.width ?? 1280) >= 768) {
  253 |     const navigationRow = page.getByTestId("dashboard-navigation-row");
> 254 |     await expect(navigationRow).toBeVisible();
      |                                 ^ Error: expect(locator).toBeVisible() failed
  255 |     return navigationRow;
  256 |   }
  257 | 
  258 |   const toggle = page.getByTestId("dashboard-navigation-toggle");
  259 |   await expect(toggle).toHaveAttribute("aria-expanded", "false");
  260 |   await toggle.click();
  261 |   await expect(page.getByTestId("dashboard-navigation-panel")).toBeVisible();
  262 |   return page.getByTestId("dashboard-navigation-panel");
  263 | }
  264 | 
  265 | async function openCreatePlanFromEmptyState(page: Page, width: number) {
  266 |   const buildPage = await page.context().newPage();
  267 |   await buildPage.setViewportSize({ width, height: 900 });
  268 |   await stubHomeApi(buildPage, []);
  269 |   await buildPage.addInitScript(() => localStorage.clear());
  270 |   await buildPage.goto("/");
  271 |   const navigation = await openDashboardNavigation(buildPage);
  272 |   await navigation.getByRole("button", { name: "Plans", exact: true }).click();
  273 |   await buildPage.getByTestId("plans-empty-create-button").click();
  274 |   await expect(buildPage.getByTestId("dashboard-build-form")).toBeVisible();
  275 |   return buildPage;
  276 | }
  277 | 
  278 | async function auditSecondaryText(page: Page, label: string) {
  279 |   return page.evaluate((stateLabel) => {
  280 |     type Color = [number, number, number, number];
  281 | 
  282 |     const parseColor = (value: string): Color | null => {
  283 |       const match = value.match(
  284 |         /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i,
  285 |       );
  286 |       if (!match) return null;
  287 |       return [
  288 |         Number(match[1]),
  289 |         Number(match[2]),
  290 |         Number(match[3]),
  291 |         match[4] === undefined ? 1 : Number(match[4]),
  292 |       ];
  293 |     };
  294 | 
  295 |     const composite = (foreground: Color, background: [number, number, number]) => {
  296 |       const alpha = foreground[3];
  297 |       return [
  298 |         foreground[0] * alpha + background[0] * (1 - alpha),
  299 |         foreground[1] * alpha + background[1] * (1 - alpha),
  300 |         foreground[2] * alpha + background[2] * (1 - alpha),
  301 |       ] as [number, number, number];
  302 |     };
  303 | 
  304 |     const luminance = ([red, green, blue]: [number, number, number]) =>
  305 |       [red, green, blue]
  306 |         .map((channel) => {
  307 |           const normalized = channel / 255;
  308 |           return normalized <= 0.03928
  309 |             ? normalized / 12.92
  310 |             : ((normalized + 0.055) / 1.055) ** 2.4;
  311 |         })
  312 |         .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  313 | 
  314 |     const contrast = (foreground: [number, number, number], background: [number, number, number]) => {
  315 |       const foregroundLuminance = luminance(foreground);
  316 |       const backgroundLuminance = luminance(background);
  317 |       const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  318 |       const darker = Math.min(foregroundLuminance, backgroundLuminance);
  319 |       return (lighter + 0.05) / (darker + 0.05);
  320 |     };
  321 | 
  322 |     const renderedBackground = (element: Element) => {
  323 |       let background: [number, number, number] = [14, 18, 22];
  324 |       const ancestors: Element[] = [];
  325 |       let current: Element | null = element;
  326 |       while (current) {
  327 |         ancestors.unshift(current);
  328 |         current = current.parentElement;
  329 |       }
  330 | 
  331 |       for (const ancestor of ancestors) {
  332 |         const parsed = parseColor(getComputedStyle(ancestor).backgroundColor);
  333 |         if (parsed && parsed[3] > 0) {
  334 |           background = composite(parsed, background);
  335 |         }
  336 |       }
  337 |       return background;
  338 |     };
  339 | 
  340 |     const visible = (element: Element) => {
  341 |       const rect = element.getBoundingClientRect();
  342 |       const styles = getComputedStyle(element);
  343 |       return rect.width > 0 && rect.height > 0 && styles.visibility !== "hidden" && styles.display !== "none";
  344 |     };
  345 | 
  346 |     const elements = Array.from(
  347 |       document.querySelectorAll(".discipleos-secondary-copy, .discipleos-meta-copy, .discipleos-field-label"),
  348 |     ).filter(visible);
  349 | 
  350 |     const metrics = elements.map((element) => {
  351 |       const styles = getComputedStyle(element);
  352 |       const foregroundColor = parseColor(styles.color);
  353 |       const backgroundColor = renderedBackground(element);
  354 |       const foreground = foregroundColor
```