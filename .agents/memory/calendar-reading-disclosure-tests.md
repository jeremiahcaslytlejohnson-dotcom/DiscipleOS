---
name: Calendar reading disclosure tests
description: Playwright guidance for Calendar plan disclosure controls and reading completion state.
---

Test Calendar disclosure state separately from the plan's current completion state. A seeded plan can render as already complete even when the test intended an incomplete plan, so the day-action label is not a stable disclosure assertion.

**Why:** A browser fixture rendered `Undo day` for a plan seeded as incomplete. Assuming the opposite label made a collapse regression fail for the wrong reason.

**How to apply:** Assert `aria-expanded` and the readings panel's visibility for disclosure behavior. For chapter completion, assert `aria-pressed` changes after clicking. Only assert an exact day-action transition after confirming the plan's initial completion state.
