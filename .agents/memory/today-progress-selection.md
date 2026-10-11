---
name: Today progress selection
description: Product boundary for the consolidated Home/Today plan progress selector.
---

The Today Progress selector is transient presentation state only. It must not persist or mutate `selectedPlanId`, plan data, Today’s assigned readings, Calendar assignments, auth ownership, or sync state. Populate it from saved plans with unfinished readings; keep overdue incomplete plans available for catch-up and omit completed plans and empty path placeholders.

**Why:** the user explicitly approved consolidating Mountain Rhythm, Guided Climb, and Free Climb progress without changing reading behavior or stored data.

**How to apply:** Keep Home’s Today progress selection independent from Plans selection, reading completion, Calendar projections, and persistence.
