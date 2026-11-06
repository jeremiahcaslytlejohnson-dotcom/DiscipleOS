---
name: Auth PostgreSQL checks
description: Why auth SQL concurrency tests need an isolated real PostgreSQL instance.
---

Mock database tests are not sufficient for auth SQL concurrency. PostgreSQL may reject conditional timestamp expressions that a mock accepts, and only a real database verifies advisory-lock and conditional-update behavior.

**Why:** An invalid-code attempt failed against PostgreSQL because a conditional `CASE` timestamp expression had a type mismatch, despite mocked tests passing.

**How to apply:** Run wrong-code/attempt-limit and concurrent code-consumption/request tests against a disposable local PostgreSQL instance. Never point these tests at a shared or production database.
