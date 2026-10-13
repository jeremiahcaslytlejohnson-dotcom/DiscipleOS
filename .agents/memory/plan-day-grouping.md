---
name: Plan-day grouping
description: Product semantics for task-oriented Plan & Progress sections and catch-up categorization.
---

In Plan & Progress, classify each assignment by its scheduled date relative to the user's local calendar date: an assignment scheduled today is Current Day, earlier assignments are Past Days, and later assignments are Upcoming Days. An incomplete past assignment remains in Past Days as catch-up; progress does not move the current day forward or backward. A completed assignment remains in the section determined by its scheduled date.

**Why:** The user wants the details view organized around today's task while keeping catch-up history and future schedule available without displaying the entire timeline at once.

**How to apply:** Recompute section membership from assignment dates and the current local date after hydration, refresh, or sync. Keep current readings visible by default and collapse past/upcoming groups by default; preserve reading completion independently from disclosure state.

Reading-plan summary rows, cards, and Today Progress completion text retain their original progress wording and layout when schedule status is color-coded. Use green only when status explicitly shows the plan is up to date through the current scheduled day; use yellow for catch-up or unavailable status.

**Why:** The user corrected a previous change that replaced percentage and remaining-chapter text; only the color was intended to change.

**How to apply:** Use due-day completion through the local current date only to choose the color. If status cannot be determined, do not assume green. Preserve percentage text, remaining counts, wording, layout, and completion logic.
