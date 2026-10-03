---
name: Push notifications
description: VAPID/web-push architecture, UI state rules, and test patterns for DiscipleOS push reminders.
---

## Architecture
- `POST /api/push` — session-scoped subscription upsert; 403 on endpoint takeover; returns {success:true}.
- `DELETE /api/push/:endpoint` — session-scoped no-op for wrong owner (not 403).
- `POST /api/push/test` — CRON_SECRET protected broadcast test.
- `POST /api/reminders/send` — CRON_SECRET protected; groups subs by userId; only sends to event owner.
- `sent_reminders` records each successful event-to-subscription delivery; failed subscriptions remain eligible for retry.
- 410/404 from push service → subscription deleted; other errors → subscription kept for retry.

## Product scope
- Reliable scheduled reminders are the essential product scope; any native app work should be limited to what makes reminders dependable.
  **Why:** The owner clarified that reminders are the core purpose, while store presence or a broad web-app port is secondary.
  **How to apply:** Prioritize end-to-end Android/iOS closed-app notification delivery and only the controls needed for it; do not expand into unrelated native features unless requested.

## Production scheduling
- Use one Replit scheduled deployment for closed-browser reminders. Its cadence must be a five-field cron expression (for example, `* * * * *` for every minute); do not run a second scheduler at the same time.
  **Why:** Replit rejects natural-language intervals, so invalid schedule syntax can prevent the worker from starting. Duplicate triggers increase database and push load even when successful sends are suppressed.
  **How to apply:** Keep one active scheduled trigger. If moving to an external cron, disable the Replit scheduled deployment first. Check production secret presence through metadata only; never print secret values.
- Treat a `.replit` scheduled block as configuration, not proof that a production Scheduled Deployment is active; the Autoscale API command does not launch the standalone reminder runner.
  **Why:** The live web/API deployment and the scheduled worker have separate entry points, and Autoscale logs do not establish scheduled-run execution.
  **How to apply:** Confirm a real production scheduled invocation before calling reminders active; do not create another trigger solely because Autoscale logs lack worker events.
- The owner confirmed an external cron scheduler is configured for reminders; its provider and execution history are not visible in this workspace.
  **Why:** External scheduler state is managed outside the repository and was directly confirmed by the owner.
  **How to apply:** Treat its setup as owner-confirmed, but do not claim its provider, last successful invocation, or whether the Replit scheduled deployment is active without separate evidence.
- The available deployment tools and published Admin API cannot create or activate a Scheduled Deployment; the API exposes only read-only deployment endpoints, and run history is separate from Autoscale logs.
  **Why:** A code/config change or website publish alone does not prove the standalone worker is active.
  **How to apply:** Keep the single scheduled entry prepared; the owner must activate it in the signed-in Replit Publishing UI and verify a real worker completion in Monitoring before calling reminders operational.
- `sent_reminders` deduplication is by event ID and calendar day, not scheduled-time/version. Calendar edits mint a new event ID and atomically replace the old event, so a same-day reschedule can send once as its own occurrence.
  **Why:** The duplicate check intentionally prevents overlapping runs, while a replacement identity prevents a prior version’s sent record from suppressing the user’s edited schedule.
- Reminder delivery keeps the existing one-minute scheduler cadence and accepts only the due minute plus one minute of lateness; calculate due dates across local midnight for early next-day events.
  **Why:** The owner chose a one-minute maximum delay and asked that reminders crossing midnight not be lost.
  **How to apply:** Keep the retry cutoff at one minute, and consider both today’s and tomorrow’s event occurrence when finding reminders due on today’s local date. Never test this by sending a live/manual notification.

## Per-device retry invariant
- Deduplicate successful sends per event and subscription endpoint; never let one device's success suppress retries to another device.
  **Why:** Event-wide broadcast markers can hide a failed phone delivery when a laptop succeeds.
  **How to apply:** Keep successful rows endpoint-specific and leave failed endpoints unrecorded. Legacy `broadcast` rows do not identify which devices received a push, so they must not block endpoint retries.

## Manual diagnostic pushes
- Keep account-targeted diagnostics on a separate authenticated path; resolve one account, send only to its registrations, and do not modify scheduled reminder state.
  **Why:** A device test must not broadcast to other accounts, create sent-reminder records, or change normal reminder delivery.
  **How to apply:** Fail closed if the target or registrations are missing, return privacy-safe per-device provider results, and do not treat provider acceptance as proof of display or scheduler operation.

## Delivery evidence
- The owner reports intermittent mobile reminders: two arrived with the app closed, but an expected 7:40 p.m. EDT reminder on Oct. 3, 2026 was missed.
  **Why:** Direct receipt reports show background delivery can succeed but is not reliable; the 7:40 run recorded no due event or send attempt.
  **How to apply:** Compare scheduler timing and phone receipt per occurrence; do not change reminder defaults from this observation alone.
- The owner reports that tapping “Reminders enabled” appears to precede working delivery; both page-load restoration and the button POST to `/api/push`, so server logs cannot identify which path registered it.
  **Why:** A successful registration was logged shortly before a reminder run sent to two subscriptions, but neither the click source nor the phone endpoint is identifiable in those logs.
  **How to apply:** Treat this as a plausible correlation, not proof the tap is required; if it recurs, compare app-load and click times with each reminder receipt.
- The user opens DiscipleOS on their phone from the home-screen-installed app.
  **Why:** Installed web apps have app-level notification controls that differ from browser-tab settings.
  **How to apply:** Diagnose notification permission through the phone's app settings; don't ask which access mode they use unless it changes.
- A successful Web Push provider response proves provider acceptance, not that an operating system displayed the notification.
  **Why:** Device display/receipt is outside the server's observable delivery boundary; even a saved successful-send row cannot confirm that the user saw it.
  **How to apply:** Report provider acceptance per registration, distinguish it from device receipt, and treat a missing send record as “no success recorded” rather than proof that the provider never accepted it.

## Deployment health and database pool errors
- Keep `/api` and `/api/healthz` on the same database-readiness handler before session middleware, and handle idle pool errors without wrapping or suppressing query failures.
  **Why:** Promotion probes may hit the artifact root instead of its configured health path; database-backed session writes caused root probes to fail, while an unhandled idle-client termination could crash the API.
  **How to apply:** Probe PostgreSQL with a read-only query, return non-2xx when it fails, and log only safe error metadata for idle-client events.

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

## Android foreground notifications
- Use `ServiceWorkerRegistration.showNotification()` for foreground reminders; do not rely on `new Notification()` in a page.
  **Why:** Android browsers and installed PWAs may reject the page constructor even when notification permission is granted.
  **How to apply:** When the service worker forwards a push to a visible page, have the page request a service-worker notification and retain duplicate suppression.

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
