---
name: Calendar visual test selectors
description: Naming constraint for Calendar responsive geometry probes and grouped selected-day content.
---

Calendar date-cell probes select test IDs beginning with `calendar-day-`, so non-cell wrappers must use a different prefix such as `calendar-items-list`.

**Why:** Responsive tests measure every `calendar-day-*` node as a date cell; a grouped list wrapper with that prefix inflates the measured day geometry and creates a false mobile-layout failure.

**How to apply:** Use `calendar-day-<ISO date>` only for month date buttons and reserve separate names for selected-day list, Reading, Activities, and creation-flow containers.