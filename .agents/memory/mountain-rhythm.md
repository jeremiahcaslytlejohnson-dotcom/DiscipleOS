---
name: Mountain Rhythm
description: Approved product semantics for the Mountain Rhythm elevation score and access boundary.
---

Mountain Rhythm follows one explicitly selected structured reading climb: the 7-Day Climb, 20-Day Reset, or 40-Day Climb. Ordinary reading plans, custom-duration plans, and legacy 30-day resets keep their progress but never control ascent. It is never a spiritual-worth score.

Canonical journey progress is exactly completed assigned days divided by the selected climb's planned days, with one-decimal percentage precision for proportional routes. Earned plan days are permanent and monotonic once every reading for that planned day has been completed. Reopening readings must not remove the earned day. The visible current trail elevation and mountain marker follow the recent consistency signal: a first miss holds flat, consecutive misses regress, and later consistency recovers it; future and unscheduled days are neutral.

If a plan has an explicit completion map and no reading is currently true, treat any stale earned-day metadata as reset state so a visibly untouched climb remains at Basecamp.

**Why:** Local plans can retain historical earned fields after an all-reading reset or legacy migration; trusting those fields alone makes an untouched climb appear elevated.

**How to apply:** Keep valid earned history when the explicit completion map still contains true readings, but return an empty earned-day map when the explicit map exists and all values are false.

**Why:** Ascent should communicate progress through a deliberate reading journey rather than blending unrelated spiritual activities. Separating earned history from recent rhythm prevents a miss from erasing prior faithfulness.

**How to apply:** Require the selected plan to identify one of the three supported climbs; never fall back to another plan. Count only that climb’s assigned readings, keep Day 1 at Basecamp, and treat partial reading as today's progress only until the full day is complete. Use canonical ascent for journey progress and earned milestones, and use the recent rhythm trail for current elevation and the mountain marker. Prayer, fasting, church, birthdays, calendar events, and custom events stay separate and never affect scores, categories, elevation, commitments, or trail output.

Today should use “Climb Progress” for the compact active-plan summary; reserve “Mountain Rhythm” and “Recent rhythm” for the dedicated consistency/detail view.

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

Refresh hydration must merge locally known earned-day keys and completion dates into the server plan. Local completion dates take precedence for matching days because they preserve same-device late-catch-up timing; the server’s completed-reading map remains authoritative for reading state.

**Why:** A refresh can otherwise reinterpret a late catch-up as a scheduled-day completion and turn a missed-day trail into a smooth, false ascent.

**How to apply:** Merge history by plan ID in both the dedicated Mountain Rhythm page and shared dashboard sync. Union earned keys, prefer local dates when present, and use server dates only as fallback.

Canonical schedule repairs must be persisted through the normal plan-save path, and full-plan upserts must preserve earned-day keys and completion dates while still honoring the submitted reading checkbox map.

**Why:** Repairing only in browser memory leaves old oversized plans in the database, while a later reconnect save can erase timing metadata written by day completion.

**How to apply:** On hydration, save an oversized named journey after normalizing it to the canonical schedule. On server upsert, merge append-only journey history from the stored document before replacing the plan payload.