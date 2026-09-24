---
name: Reconnect sync
description: How DiscipleOS reconciles offline mutations with the server on reconnect.
---

## Decision
Event-driven reconnect sync using window.online, window.focus, and document.visibilitychange, with a 400ms debounce and an isSyncingRef in-flight guard. No polling.

**Why:** Mutations use optimistic UI + fire-and-forget fetch. While offline, failed API calls were silently dropped. On reconnect, local state and server diverged until a manual refresh.

Server-backed local state and pending operations are session-bound. The client validates the server-provided owner before replaying writes; missing or mismatched ownership is treated as untrusted and cleared, while unrelated browser preferences remain untouched.

**Why:** Browser localStorage can outlive the server session. Replaying an old event or plan ID in a new session can trigger a legitimate ownership conflict and otherwise retry forever.

**How to apply:** Keep owner metadata with both the event/plan snapshot and pending-op queue. Treat ownership 409 responses as non-retryable conflicts; continue retrying only transient failures.

## Architecture

### artifacts/discipleos/src/lib/sync.ts
- PendingOp union type (upsert-event, delete-event, upsert-plan, delete-plan, chapter-complete)
- PENDING_OPS_KEY = 'discipleos:pendingOps' (localStorage)
- loadPendingOps() / savePendingOps() — localStorage I/O
- addPendingOp(ops, op) — appends + persists, returns new array
- flushPendingOps(ops) — sequential replay to API, returns remaining (failed) ops

### artifacts/discipleos/src/pages/Home.tsx changes
- pendingOpsRef = useRef(loadPendingOps()) — stable ref, no re-render on queue change
- isSyncingRef = useRef(false) — in-flight guard
- syncWithServer() — useCallback([]) that: (1) flushPendingOps, (2) defensive re-hydrate
- Mount effect: show localStorage → await syncWithServer()
- Reconnect effect: online/focus/visibilitychange → debouncedSync (400ms) → syncWithServer()
- All mutation .catch() handlers now queue a PendingOp instead of console.warn

### Reconciliation rule (push-before-pull)
1. Flush pending ops to server in insertion order (local changes win for items modified offline)
2. Re-hydrate from server (defensive hydration rule unchanged):
   - established=true → server is authoritative even when empty
   - established=false + empty → keep localStorage (do not clear)
3. Network failure → retain current UI and localStorage, keep pending queue

### savePlanToServer (module-level)
Changed from swallowing errors to throwing, so all three call sites (createPlan, savePlanEdit, loadPresetPlan) can catch and queue a upsert-plan op.

## Tests
artifacts/api-server/tests/reconnect-sync.test.ts — 7 suites, 18 tests:
1. Start offline: established=false + empty = keep localStorage
2. Offline mutations flush on reconnect (upsert-event, upsert-plan, chapter-complete, delete-event, delete-plan)
3. Re-sending same upsert = no duplication (server uses ON CONFLICT DO UPDATE)
4. Established + empty = intentionally empty, server authoritative
5. Unestablished + empty = keep localStorage
6. 3 concurrent upserts = 1 record (idempotency under rapid sync triggers)
7. Cross-user isolation intact through reconnect
