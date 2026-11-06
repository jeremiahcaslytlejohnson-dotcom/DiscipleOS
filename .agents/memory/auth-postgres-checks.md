---
name: Auth PostgreSQL checks
description: Why auth SQL concurrency tests need an isolated real PostgreSQL instance.
---

Mock database tests are not sufficient for auth SQL concurrency. PostgreSQL may reject conditional timestamp expressions that a mock accepts, and only a real database verifies advisory-lock and conditional-update behavior.

**Why:** An invalid-code attempt failed against PostgreSQL because a conditional `CASE` timestamp expression had a type mismatch, despite mocked tests passing.

**How to apply:** Run wrong-code/attempt-limit and concurrent code-consumption/request tests against a disposable local PostgreSQL instance. Never point these tests at a shared or production database.

Expired auth-code rows containing email and IP data are retained for 24 hours after challenge expiry, then purged. Do not shorten this window: request-rate limits rely on the preceding hour of rows.

**Why:** the user selected a 24-hour retention window.

**How to apply:** Apply this policy only to expired auth challenge rows, not sessions or other user data.
