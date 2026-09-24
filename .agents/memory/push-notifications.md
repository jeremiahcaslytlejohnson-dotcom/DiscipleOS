---
name: Push notifications
description: VAPID/web-push architecture, UI state rules, and test patterns for DiscipleOS push reminders.
---

## Architecture
- `POST /api/push` — session-scoped subscription upsert; 403 on endpoint takeover; returns {success:true}.
- `DELETE /api/push/:endpoint` — session-scoped no-op for wrong owner (not 403).
- `POST /api/push/test` — CRON_SECRET protected broadcast test.
- `POST /api/reminders/send` — CRON_SECRET protected; groups subs by userId; only sends to event owner.
- `sent_reminders` table — duplicate suppression; row only inserted if sentThisEvent > 0 (NOT on failure).
- 410/404 from push service → subscription deleted; other errors → subscription kept for retry.

## Production scheduling
- An external cron calling the protected POST route supports closed-browser reminders; the browser does not need to remain open.
  **Why:** Replit publishes this project as one web deployment, so an external scheduler is the compatible way to trigger the reminder worker without taking the site offline.
- `sent_reminders` deduplication is by event ID and calendar day, not scheduled-time/version. Calendar edits mint a new event ID and atomically replace the old event, so a same-day reschedule can send once as its own occurrence.
  **Why:** The duplicate check intentionally prevents overlapping runs, while a replacement identity prevents a prior version’s sent record from suppressing the user’s edited schedule.

## Required Secrets (ALL must be set manually in Replit Secrets before real delivery works)
- `VAPID_PUBLIC_KEY` — from `npx web-push generate-vapid-keys`
- `VAPID_PRIVATE_KEY` — from same command, keep secret
- `VAPID_SUBJECT` — mailto: or https: URL identifying the sender (e.g. `mailto:you@domain.com`)
- `VITE_VAPID_PUBLIC_KEY` — same value as VAPID_PUBLIC_KEY; used by the browser subscription flow
- `CRON_SECRET` — arbitrary secret for protecting /api/reminders/send and /api/push/test

## UI state rule
- `isSubscribed` state (separate from `notificationPermission`) — only set true after POST /api/push returns 200.
- `"Notifications enabled"` label driven by `isSubscribed`, NOT `permission === "granted"`.
- On page reload, SW registration checks `pushManager.getSubscription()` to restore `isSubscribed`.
- Missing VAPID_PUBLIC_KEY: logs, sets isSubscribed(false), and shows a visible setup failure; it must never show "enabled".
- If applicationServerKey is exposed, compare it before subscribe(); retire only a confirmed incompatible local subscription, pass its endpoint as scoped cleanup metadata, and preserve ownership checks.
- Browser renewal must confirm the replacement with the server before retiring a compatible previous subscription; a failed registration must leave that working subscription usable.

## Endpoint ownership concurrency
- Endpoint ownership decisions must be serialized and completed before deleting a caller's previous subscription.
  **Why:** A lookup followed by cleanup is not race-safe: two accounts can observe the same endpoint as unowned, and the losing request could otherwise delete its working subscription before discovering the ownership conflict.
  **How to apply:** Preserve this ordering whenever registration or renewal ownership rules change.

## Test patterns
- Mock web-push at module level: `vi.mock('web-push', () => ({ default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() } }))`.
- Simulate VAPID failure: `vi.mocked(webpush.setVapidDetails).mockImplementationOnce(() => { throw new Error("...") })`. Do NOT delete process.env — it pollutes subsequent tests.
- Global `beforeEach` clears mocks; tests that check calls across multiple `it()` blocks must capture the call list before the next `beforeEach` runs, or consolidate assertions into one test.
- Test env vars set in vitest.config.ts `env` block: SESSION_SECRET, VAPID_PUBLIC_KEY (fake), VAPID_PRIVATE_KEY (fake), VAPID_SUBJECT, CRON_SECRET.

## Generating real VAPID keys
```
npx web-push generate-vapid-keys
```
Paste VAPID_PUBLIC_KEY into both the server secret AND as VITE_VAPID_PUBLIC_KEY (browser-visible, not sensitive).
