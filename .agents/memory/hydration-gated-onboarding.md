---
name: Hydration-gated onboarding
description: Session-aware rules for automatic first-run behavior in DiscipleOS.
---

Automatic first-run onboarding must wait until the session endpoint has been checked before treating the user as anonymous.

**Why:** The client auth hook and the server session can settle at different times. Starting a local structured journey in that gap can create an unintended active journey before authenticated data is hydrated.

**How to apply:** Gate automatic starter actions on a completed session check, and treat either an authenticated session flag or a server user ID as authoritative even when the client auth hook has not settled.

For first-plan onboarding specifically, wait for local hydration and the initial server reconciliation to finish, then require no plans, events, or event-completion history before showing it. Keep local-only-after-sign-out sessions on the normal experience.

**Why:** A plan-less returning user can still have calendar or completion data, and rendering before the first pull can flash onboarding or misclassify server-owned data as new.

**How to apply:** Use the completed initial sync as the onboarding gate and preserve the existing plan/event persistence and claim paths; never clear or migrate data to make the onboarding condition true.