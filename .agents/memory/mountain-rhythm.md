---
name: Mountain Rhythm
description: Approved product semantics for the Mountain Rhythm elevation score and access boundary.
---

Mountain Rhythm follows one explicitly selected structured reading climb: the 7-Day Climb, 20-Day Reset, or 40-Day Climb. Ordinary reading plans, custom-duration plans, and legacy 30-day resets keep their progress but never control ascent. It is never a spiritual-worth score.

The current Mountain Rhythm chart, including its background and mountain artwork, trails, lines, milestones, flags, and colors, is under separate review. Do not modify, restore, regenerate, or redesign it during setup or page-organization work.

**Why:** The user explicitly separated chart review from setup and layout work.

**How to apply:** Keep changes to the surrounding page structure and controls unless the user explicitly reopens the chart scope.

Canonical journey progress is exactly completed assigned days divided by the selected climb's planned days, with one-decimal percentage precision for proportional routes. Earned plan days are permanent and monotonic once every reading for that planned day has been completed. Reopening readings must not remove the earned day. Consistency is the on-schedule completion count divided by elapsed scheduled days; future days are excluded, and late catch-up advances journey progress without crediting the missed scheduled day. Trail elevation reflects completion timing: a first miss holds flat, consecutive misses regress, and later catch-up rises on its actual completion date.

If a plan has an explicit completion map and no reading is currently true, treat any stale earned-day metadata as reset state so a visibly untouched climb remains at Basecamp.

**Why:** Local plans can retain historical earned fields after an all-reading reset or legacy migration; trusting those fields alone makes an untouched climb appear elevated.

**How to apply:** Keep valid earned history when the explicit completion map still contains true readings, but return an empty earned-day map when the explicit map exists and all values are false.

**Why:** Ascent should communicate progress through a deliberate reading journey rather than blending unrelated spiritual activities. Separating journey progress from on-schedule consistency prevents catch-up from erasing a missed scheduled day.

**How to apply:** Require the selected plan to identify one of the three supported climbs; never fall back to another plan. Count only that climb’s assigned readings, keep Day 1 at Basecamp, and treat partial reading as today's progress only until the full day is complete. Use canonical ascent for journey progress and earned milestones, and use the recent rhythm trail for current elevation and the mountain marker. Prayer, fasting, church, birthdays, calendar events, and custom events stay separate and never affect scores, categories, elevation, commitments, or trail output.

Today should use “Climb Progress” for the compact active-plan summary; reserve “Mountain Rhythm” and “Consistency” for the dedicated consistency/detail view.

**Why:** Today answers immediate-status questions, while the dedicated view explains position in the selected climb and consistency over time. Repeating the full rhythm vocabulary on Today makes those scopes unclear.

**How to apply:** Keep Today limited to active plan identity, today’s reading status, journey progress, and useful climb stage context. Preserve the full rhythm metric and visualization on `/mountain-rhythm`.

The structured routes are intentionally distinct: the 7-Day Climb starts in Genesis and is budget-aware; the locked 20-Day Reset covers Matthew through Acts; the 40-Day Climb runs from 1 Samuel through Nehemiah.

**Why:** The user-defined route progression is Genesis for the short climb, the Gospels plus Acts for the reset, and an open-ended Old Testament-forward route for the long climb.

**How to apply:** Build new structured schedules with the authenticated or device reading defaults, keep each day's intact chapters within the budget when possible, and show the resulting estimated daily time. Do not rewrite an already active climb automatically; the 40-day route's canonical endpoint is Nehemiah.

The 40-Day Climb remains a supported calculation/schedule shape but is intentionally unavailable in the current release UI and API start boundary.

**Why:** Progress calculations and future-route data need to exist for regression coverage without making the unreleased route selectable before its release decision.

**How to apply:** Keep the 40-day schedule and metrics covered, but preserve its `Coming Later` UI state and reject direct start requests until the release boundary changes deliberately.

Structured journey schedules must use a canonical book catalog whose chapter counts are bounded by the actual Bible book, not the raw length of an auxiliary verse-estimate array.

**Why:** An oversized Psalm estimate array expanded the free 7-Day Climb into 260 readings and inflated several daily sessions beyond an hour.

**How to apply:** Validate canonical chapter counts at the shared data boundary and repair oversized saved journey schedules while preserving completions for chapters that remain valid.

The elevation chart is a day-by-day journey chart: one visible anchor per scheduled day, with missed days holding the prior elevation and later completed days rising from the immediately previous anchor.

**Why:** A generic mountain slope obscures the difference between a flat missed-day stretch and the next earned ascent, especially on the seven-day climb.

**How to apply:** Plot the journey trail points in schedule order, keep future points neutral, and retain visible day markers so the line communicates actual daily progression rather than smoothing over it.

Completion timing must be preserved separately from checkbox state: a day completed after its scheduled date raises the chart on the actual completion date, not on the old scheduled anchor. Reopening readings does not erase an already earned day.

**Why:** Current checkbox state can make a catch-up look as though it happened in the past, retroactively backfilling missed trail points and misrepresenting the journey.

**How to apply:** Store a validated scheduled-day → completion-date map whenever a day first becomes complete; use that map for trail elevation and retain legacy earned-day keys as backward-compatible history.

Trail points expose current assignment state separately from on-schedule history. Route rows use current status; mountain markers use the historical rhythm status. Explicit completion-date history remains valid for consistency even when current reading checkboxes are all reopened.

**Why:** A catch-up day should still look complete in the route while its original scheduled anchor remains visibly missed. Current checkbox state must not rewrite a verified completion date.

**How to apply:** Keep `status` for current reading completion and `rhythmStatus` for the graph's timing history. Derive consistency and rhythm history from validated completion dates; retain the all-unchecked stale-metadata guard only for earned journey ascent and legacy inferred state.

Refresh hydration must merge locally known earned-day keys and completion dates into the server plan. Local completion dates take precedence for matching days because they preserve same-device late-catch-up timing; the server’s completed-reading map remains authoritative for reading state.

**Why:** A refresh can otherwise reinterpret a late catch-up as a scheduled-day completion and turn a missed-day trail into a smooth, false ascent.

**How to apply:** Merge history by plan ID in both the dedicated Mountain Rhythm page and shared dashboard sync. Union earned keys, prefer local dates when present, and use server dates only as fallback.

Canonical schedule repairs must be persisted through the normal plan-save path, and full-plan upserts must preserve earned-day keys and completion dates while still honoring the submitted reading checkbox map.

**Why:** Repairing only in browser memory leaves old oversized plans in the database, while a later reconnect save can erase timing metadata written by day completion.

**How to apply:** On hydration, save an oversized named journey after normalizing it to the canonical schedule. On server upsert, merge append-only journey history from the stored document before replacing the plan payload.

Active, completed, and expired structured-plan lifecycle must use one shared client/server definition. A full set of earned scheduled days keeps the old instance historical even if its reading checkboxes are later reopened; an incomplete instance expires after its inclusive end date. Save an IANA time zone on new structured plans so browser selection and API conflict checks use the same calendar day; legacy plans use America/New_York. This lifecycle status is separate from the all-unchecked guard for live ascent metrics.

**Why:** A completed or past-dated climb must not block a genuinely new instance or return as the active climb after refresh, sync, or account claim, while prior progress records remain intact.

**How to apply:** Use the shared lifecycle helper when selecting active climbs, enforcing the one-active-climb API boundary, and claiming anonymous plans. Keep ordinary plans outside this lifecycle and never delete or overwrite a prior plan when starting a new climb.

Expired climbs should stay in the existing history view rather than reappearing as a separate past-climb section in Plans; the user clarified, “once there done, there done.”

**Why:** The Plans panel should focus on the active climb, while completed or expired instances remain historical.

**How to apply:** Do not add an expired-climb fallback to the active Plans panel. Keep past days visible for catch-up only while their climb is active; use the existing history view for ended climbs.

A confirmed cancellation is terminal for that owned climb instance but does not delete the plan or its reading history. It may update only the same stored journey kind, and cannot create or repurpose a locked journey. Canceling the active climb frees the active slot for a new climb. Calendar events and their reminders remain separate and unchanged.

**Why:** Users need to stop a climb without erasing progress or affecting unrelated plans and reminders.

**How to apply:** Persist cancellation through the normal plan-save path, show canceled instances with past climbs, and leave ordinary plans and Calendar data untouched.

The same owner-scoped active climb and plan ID must drive Mountain Rhythm, Home/Today, Plans, and Calendar. Screens may present the schedule differently, but must not drop a climb merely because it is not an ordinary reading plan.

**Why:** Filtering structured plans for a screen-specific list must not make their assigned readings, dates, completion state, or progress appear lost elsewhere.

**How to apply:** Hydrate the complete owner-scoped plan collection once per source, retain valid owner-matched local state during sync, and exclude structured plans only from ordinary-plan presentation. Provide the active climb's scheduled readings on Today and its schedule on Plans; Calendar and Mountain Rhythm should continue using the same plan ID and assignments.

Prayer and fasting remain optional Calendar commitments, independent of Scripture completion and climb metrics. Prayer recurrence stays unchanged. Fasting dates are date-only and constrained to the selected climb's inclusive start/end dates: the 7-Day Climb offers every remaining day with only the next valid day suggested; the 20-Day Reset suggests Days 1 and 11, and the 40-Day Climb suggests Days 1, 11, 21, and 31. Missed dates are not seeded, and the 365/366-day default remains unimplemented. All-day fast reminders default to noon the preceding local day.

**Why:** The owner approved a step-by-step prayer/fasting scheduler while explicitly keeping these disciplines separate from climb progress and avoiding duplicate schedule or reminder systems.

**How to apply:** Reuse owner-scoped Calendar events, occurrence completions, and the existing reminder dispatcher. Validate every selected fasting date on edit, review, and save; never shift climb dates or extend a climb to fit a commitment. Preserve saved schedules and completion history; do not change prayer recurrence, reading-plan dates, or add prayer/fasting effects to Mountain Rhythm scoring.

Mountain Rhythm discipline tracking reuses Calendar event occurrence records keyed by event ID and local date. Recent summaries show recorded completed actions against scheduled opportunities, without treating unrecorded opportunities as proof of failure. Same-discipline schedule edits keep event identity; ending early sets an occurrence cutoff instead of deleting records; explicit Calendar deletion confirms that the associated completion history will also be removed.

**Why:** Discipline records must remain independent of Scripture progress while preserving meaningful completed actions through schedule changes and honoring an explicit request to delete.

**How to apply:** Share the existing owner-scoped event and completion state between Mountain Rhythm and Calendar. Retain and display completed historical occurrences when recurrence changes, allow undo of a recorded historical completion, and exclude future occurrences after the saved cutoff from Calendar and reminders.

The October 20, 2026 reference screenshot is the canonical Mountain Rhythm chart standard. Keep one dark translucent dashboard card with the compact climb header, three aligned metrics, layered mountain landscape, five labeled milestone guides, current/next milestone statement, and collapsed explainer. Show one marker per scheduled date: the solid green line and shaded area are recorded elevation through today; a subdued dashed continuation is planned, not earned; Today is highlighted at its real current-elevation position. Preserve distinct journey progress, consistency, and current-elevation meanings. Scale day-axis labels to avoid clutter on long schedules, including 365-point inputs, without changing which climb types the scoring system supports.

**Why:** The owner designated the October 20 screenshot as the standard and wants the chart to be clear without misrepresenting real completion. A second decorative day route and duplicate markers caused confusion. Future terrain must never look earned, and a visually rising line must not override actual flat or regressing history. Mountain Rhythm visual tests must mock API requests and avoid database writes unless an isolated test database is explicitly configured. The owner prefers one rugged foreground hero with restrained background depth and rejects cabin/house decoration.

**How to apply:** Keep the existing asymmetric foreground silhouette and no more than two low-contrast background ranges; do not add new scenery. Plot scheduled dates in order, use only historical `score.trail` values for the solid/filled earned segment through today, and keep the planned future continuation dashed, muted, and unfilled. Connect that planned continuation from the current endpoint through the existing future waypoint coordinates only; preserve the earned line and omit the planned line when no future waypoints remain. Place a single date marker on the appropriate route position; place Today at `score.currentElevationPercent` and annotate that same point with its flag. Start the date axis just after the rendered milestone-label column with a modest responsive buffer, then map dates evenly to the existing right margin. Keep the five labels left-aligned and accessible, retain all five visibly when they fit, and reduce axis-label density as point count grows while preserving date-to-x mapping. Keep the SVG viewBox, plot height, and internal geometry fixed when adjusting whitespace above the chart; use surrounding section spacing rather than scaling or cropping chart content. Because SVG viewBox text can scale nonuniformly, verify rendered label bounding boxes and adjacent-label spacing at actual narrow-phone and desktop widths rather than relying on SVG coordinates alone. Do not smooth away real missed-day regressions or hardcode example percentages. Keep the responsive metric summary and collapsed help disclosure. Assess rendered desktop and phone layouts at actual sizes using mocked data; avoid database writes unless an isolated test database is explicitly configured.

When the owner explicitly requests planned-terrain refinement, future day circles may use deterministic, display-only cumulative elevations with varied daily gains, and the dashed future connector may curve gently through those same waypoint centers. The profile must remain nondecreasing, end at the Summit guide, and never alter actual progress.

**Why:** The owner approved showing that future progress can have small gains, stronger pushes, and shallow stretches, while explicitly keeping unfinished readings visually distinct from earned ascent.

**How to apply:** Change only future waypoint Y coordinates and the subdued dashed connector. Use a deterministic profile based on climb length, keep every X coordinate fixed, preserve the achieved route/current marker/Today flag and Summit endpoint, and never add fills or alter scenery, milestones, completion state, or layout.

Stage 2 discipline accents are explicitly deferred until the owner separately approves implementation. If approved, completed prayer and fasting may strengthen a day's visual trail accent only when Scripture is also complete; discipline activity alone must never advance ascent. This must not change Scripture completion percentages, consistency, milestones, or earned days.

Keep the dense, layered evergreen forest as static scenery across the chart's lower foreground, with varied heights, irregular spacing, and muted green depth layers. Keep it below the chart labels; it must never represent or move with reading progress.

**Why:** The owner explicitly asked to restore the previously implemented forest after it was thinned to sparse triangles, and wants it separated from chart data.

**How to apply:** Reuse the historical narrow, filled pine silhouettes in layered green tones. Keep them in the lower band beneath the day-axis labels and behind the dynamic overlay; do not alter chart labels, markers, or progress lines while restoring the forest.

**Why:** The owner requested a staged rollout and explicitly authorized only the current visual terrain refinement.

**How to apply:** Do not implement discipline-driven visual changes without a new, separate owner approval. Any future accent remains visual-only and gated by completed Scripture.