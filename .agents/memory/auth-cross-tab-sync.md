---
name: Cross-tab auth sync
description: Durable rules for keeping DiscipleOS authentication and local-first sync consistent across browser tabs.
---

## Decision
Cross-tab auth changes use a typed BroadcastChannel message with a localStorage event fallback. A signed-out transition immediately invalidates the client identity, clears visible account data, advances the sync generation, clears account-bound pending operations, and marks the browser local-only until an explicit sign-in. The hidden local data remains available for a later explicit claim.

**Why:** Refreshing `/api/auth/me` alone leaves another tab able to display stale account controls or replay an in-flight queue after the shared HTTP-only session is destroyed. Keeping account plans visible after logout confuses the ownership boundary, while deleting local data would strand unsynced work.

**How to apply:** Validate `/api/session/info` before account claim, pending-op flush, or authoritative hydration. Check the auth generation between awaited steps and inside sequential queue replay. Clear visible plans/events on logout, keep the local-only marker across reloads, hide the retained local snapshot while that marker is set, and remove it only after explicit sign-in.