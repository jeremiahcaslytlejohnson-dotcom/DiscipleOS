---
name: Active-climb sync tests
description: Preserve earned-day history when browser fixtures simulate offline Mountain Rhythm completion.
---

For offline active-climb browser tests, the API fixture must persist both the scheduled day that was earned and the actual completion date from a chapter-completion request. Verify those fields after reconnect and refresh, alongside the completed chapter flag.

**Why:** A fixture that only updates `completed[key]` can make checkbox state look correct while Mountain Rhythm progress and completion timing silently drift.

**How to apply:** When testing structured reading journeys across reconnects, assert stored completion history and the visible progress in Today, Mountain Rhythm, Plans, and Calendar.
