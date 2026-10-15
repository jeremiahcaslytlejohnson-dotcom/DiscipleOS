---
name: Plan-day grouping
description: Product semantics for task-oriented Plan & Progress sections and catch-up categorization.
---

In Plan & Progress, classify each assignment by its scheduled date relative to the user's local calendar date: an assignment scheduled today is Current Day, earlier assignments are Past Days, and later assignments are Upcoming Days. An incomplete assignment dated today is still in progress, not overdue. Only an incomplete assignment dated before local today triggers catch-up/yellow status. A completed assignment remains in the section determined by its scheduled date.

**Why:** A newly created plan must not be marked overdue immediately on its first scheduled day; overdue history remains meaningful after a scheduled day has passed.

**How to apply:** Recompute section membership from assignment dates and the current local date after hydration, refresh, or sync. Keep current readings visible by default and collapse past/upcoming groups by default; preserve reading completion independently from disclosure state.

Reading-plan summary rows, cards, and Today Progress completion text retain their original progress wording and layout when schedule status is color-coded. Use the existing “Up to date” wording and green when no past assignment is incomplete, even if today's reading is unfinished; use yellow only when an earlier scheduled day is incomplete or status is unavailable.

**Why:** The user wants current-day reading treated as in progress until it becomes past due, without changing completion arithmetic or progress wording.

**How to apply:** For status and its color, check incomplete assignments with dates strictly before the local current date. Preserve percentage text, remaining counts, wording, layout, and completion logic.
