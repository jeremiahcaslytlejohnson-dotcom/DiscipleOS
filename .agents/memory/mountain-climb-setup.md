---
name: Mountain climb setup
description: Guardrails for the guided climb setup and its browser-test fixtures
---

Reset the setup wizard only when it is explicitly opened. Changes to active-climb props during an in-progress save must not erase the chosen route, reading budget, or review step.

**Why:** Starting a climb updates local plans optimistically before the server confirms it. A conflict response then rolls that update back; resetting on the temporary active-kind change disrupted the confirmation retry.

**How to apply:** Preserve the draft while the wizard stays open. Initialize from the current active climb and reading defaults when it opens again.

Signed-in browser API fixtures must return matching identities from both the session-info and auth-me endpoints.

**Why:** The app hydrates signed-in UI from both endpoints; faking only the session endpoint leaves the auth provider unauthenticated and shows a misleading data-verification fallback.

**How to apply:** When adding or editing signed-in browser fixtures, ensure both endpoint responses represent the same authenticated user.
