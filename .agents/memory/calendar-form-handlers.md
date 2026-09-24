---
name: Calendar form handlers
description: React event-handler behavior for Calendar activity form reset helpers that accept optional date context.
---

When a Calendar form helper accepts an optional value such as a reset date, React button handlers must call it through a zero-argument wrapper rather than passing the helper directly.

**Why:** A direct `onClick={helper}` passes the click event as the first argument. The event object is not an ISO date and can break date formatting or reset the form with invalid state.

**How to apply:** Use `onClick={() => resetEventForm()}` for ordinary resets and pass an explicit date only from save logic that already has the normalized activity payload.