---
name: First-party auth boundary
description: Durable identity, session, and delivery rules for DiscipleOS passwordless authentication.
---

DiscipleOS owns passwordless email-code authentication and web sessions. Verification codes are short-lived, single-use, HMAC-protected records in Postgres; authenticated account ownership and anonymous browser ownership remain separate.

**Why:** Local-first browsing must continue without an account, while cloud sync, cross-device restore, paid ownership, and account-bound reminders need durable account identity. Mixing anonymous and account sessions can orphan or expose data.

**How to apply:** Keep account identity in the Postgres session cookie, preserve the anonymous session through `/api/account/claim`, and never fall back to displaying a local verification code. Treat missing email delivery configuration as an explicit external blocker.

Historical provider identity mappings are retained only to preserve ownership continuity; runtime authentication must not depend on the retired provider.

**Why:** Existing records may be owned by identifiers from the former provider, and email-only matching is unsafe during migration.

**How to apply:** Use the durable mapping for migration/support evidence, but continue reading and writing app data through the existing local `users.id`.

Passwordless authentication uses one neutral email flow: the backend accepts a valid email, sends a one-time code, and decides only after verification whether to reuse or create the account.

**Why:** The user confirmed that separating “sign in” and “create account” adds unnecessary friction and can reveal account-existence distinctions before verification.

**How to apply:** Keep compatibility URLs if needed, but do not expose account-mode choices or existence-specific responses before a valid code is consumed.