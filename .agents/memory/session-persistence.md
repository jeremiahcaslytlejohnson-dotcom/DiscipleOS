---
name: Session persistence
description: How DiscipleOS sessions are persisted across server restarts and how the frontend handles hydration safely.
---

## Decision
Replace express-session MemoryStore with connect-pg-simple backed by the existing Neon/pg pool.

**Why:** MemoryStore loses all sessions on API server restart. In Replit's dev environment, the API server restarts frequently. A new session = new userId = server returns empty data for the old browser cookie. `loadData()` unconditionally overwrote localStorage with the empty server response, wiping all user data.

**How to apply:**
- `createPgSessionStore()` in `artifacts/api-server/src/app.ts` wraps `connect-pg-simple` around the shared `pool` from `@workspace/db` with `createTableIfMissing: true`.
- `createApp(sessionStore?)` is a factory — pass a store to override (used in tests to simulate restarts).
- Module-level `export default createApp()` is the production singleton.

## sessionEstablished flag

Stored on `req.session.sessionEstablished: boolean`. Set to `true` in:
- `routes/events.ts` POST handler (after first successful write)
- `routes/reading.ts` POST /reading/plans handler

Exposed via `GET /api/session/info` → `{ userId, established: boolean }`.

**Why:** With a persistent store, an established session returning empty data means the user intentionally has no data (authoritative). An unestablished session returning empty data means either a genuinely new user OR a restart scenario where the session wasn't recovered — in both cases, don't erase localStorage.

## Frontend defensive hydration (Home.tsx loadData)

1. Fetch `/api/session/info` in parallel with events and plans.
2. If `established === true` → always apply server state (even if empty).
3. If `established === false` AND server data is non-empty → apply server data.
4. If `established === false` AND server data is empty → keep localStorage data (do NOT call setEvents/setPlans with empty).

This avoids the original failure mode while also not incorrectly ignoring real server data when it exists.

## Cache-control requirement

Sync reads for session info, events, and plans must request `cache: "no-store"`.

**Why:** The artifact proxy can return `304 Not Modified` for API reads. Fetch treats 304 as non-OK, which prevented client ownership establishment and could leave recent optimistic writes absent after refresh.

**How to apply:** Any authoritative hydration request must bypass the browser cache and only treat a fresh JSON response as the source of truth.

## Tests
`tests/restart-persistence.test.ts` — 16 tests across 3 phases:
- Phase 1: creates data on server A, captures cookie
- Phase 2: creates server B with a SEPARATE PgStore (same DB), verifies same userId + data recovered
- Phase 3: defensive hydration guard — unestablished+empty vs established+empty behaviors

All 26 tests (12 auth-isolation + 14 restart-persistence) pass.
