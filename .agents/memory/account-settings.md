---
name: Account reading settings
description: Account-scoped reading defaults are stored separately from plans and only seed future ordinary plan drafts.
---

Account reading defaults must remain a separate, authenticated data surface. Saving them may change the next ordinary plan draft, but must never rewrite existing plans, completion history, Calendar events, or structured Mountain Rhythm climbs. New plans should snapshot the Settings pace used to create them so their details continue to show the original pace later.

**Why:** Reading preferences describe future intent; applying them retroactively would change historical progress and could corrupt the meaning of Mountain Rhythm.

**How to apply:** Keep settings validation and ownership independent from the anonymous data-claim flow, scope any browser fallback storage by authenticated user ID, and persist the selected pace mode on new plan records without retroactively applying future defaults.