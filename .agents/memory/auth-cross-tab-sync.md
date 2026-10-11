---
name: Cross-tab auth sync
description: Durable rules for keeping DiscipleOS authentication and local-first sync consistent across browser tabs.
---

## Decision
Cross-tab auth changes use a typed BroadcastChannel message with a localStorage event fallback. A signed-out transition immediately invalidates the client identity, clears visible account data, advances the sync generation, detaches account-bound pending operations in memory without relabeling or deleting their stored queue, and marks the browser local-only until identity is verified. A cached plan may be shown only when the server confirms the matching anonymous owner; otherwise keep the snapshot private and intact.

**Why:** Refreshing `/api/auth/me` alone leaves another tab able to display stale account controls or replay an in-flight queue after the shared HTTP-only session is destroyed. Hiding unverified account data prevents leakage, while preserving the cache and quarantined queue avoids stranding unsynced work.

**How to apply:** Validate `/api/session/info` before account claim, pending-op flush, or authoritative hydration. Check the auth generation between awaited steps and inside sequential queue replay. Clear visible data on logout; while local-only, verify the anonymous owner before showing cached plans and do not rewrite or replay data whose owner differs. Remove the local-only marker only after explicit sign-in.