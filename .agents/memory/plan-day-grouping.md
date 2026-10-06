---
name: Plan-day grouping
description: Product semantics for task-oriented Plan & Progress sections and catch-up categorization.
---

In Plan & Progress, classify each assignment by its scheduled date relative to the user's local calendar date: an assignment scheduled today is Current Day, earlier assignments are Past Days, and later assignments are Upcoming Days. An incomplete past assignment remains in Past Days as catch-up; progress does not move the current day forward or backward. A completed assignment remains in the section determined by its scheduled date.

**Why:** The user wants the details view organized around today's task while keeping catch-up history and future schedule available without displaying the entire timeline at once.

**How to apply:** Recompute section membership from assignment dates and the current local date after hydration, refresh, or sync. Keep current readings visible by default and collapse past/upcoming groups by default; preserve reading completion independently from disclosure state.
