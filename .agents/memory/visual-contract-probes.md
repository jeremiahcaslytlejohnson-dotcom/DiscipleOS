---
name: Visual contract probes
description: Durable guidance for responsive UI assertions when surface roles change between dashboard tabs
---

When a visual pass changes containment or priority roles, browser assertions should query the surface rendered in the state being measured instead of assuming a component remains mounted after navigation. Treat fixed navigation actions as a separate contract from the dashboard's functional content order.

**Why:** Flattening a dashboard can intentionally remove nested item surfaces from a tab while preserving the shared functional surface contract elsewhere; fixed navigation can also contain actions with the same labels as page-level calls to action, so broad selectors can report the wrong priority or count.

**How to apply:** Keep responsive assertions tied to explicit surface roles and rendered test states, scope page-level CTA counts to the relevant surface, and use interaction assertions for tab-specific behavior rather than relying on stale DOM nodes.

The Today hierarchy is intentionally explicit: standalone Verse of the Day, Today’s Reading, Today’s Activities, collapsed ordinary-plan Progress, then collapsed Mountain Rhythm; do not reintroduce a Today’s Walk wrapper.

**Why:** The approved lean dashboard removes duplicated Verse placement, dashboard stat concepts, and the empty Today’s Walk container while preserving the underlying reading and activity data.

**How to apply:** Test the rendered section order and disclosure defaults directly. Keep empty states inside Reading or Activities, and keep Progress ordinary-plan-only without duplicating today-level completion.

Rendered hydration tests should seed the same event/plan payload through both the API route and localStorage whenever the app performs defensive local-first hydration.

**Why:** Supplying the fixture through only one source can make async hydration race with the test and produce a false empty-state failure.

**How to apply:** Keep route stubs and browser storage fixtures aligned before asserting derived dashboard counts.