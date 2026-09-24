---
name: Feedback operations
description: Durable rules for feedback persistence, owner-only access, notifications, and review state.
---

Feedback submissions are the permanent record in PostgreSQL. Notification email is best-effort after the insert and must never make a successful save fail or roll back.

**Why:** Users should not lose feedback because an external email provider is unavailable.

Notification delivery is tracked as a durable outbox state. New rows start pending, successful sends become sent, and failures retain attempt/error metadata for an owner-triggered retry; rows with no status predate tracking and are never retried automatically.

**Why:** Retrying only tracked rows prevents duplicate notifications for historical feedback, while the provider idempotency key protects the crash window between an accepted send and the local success update.

**How to apply:** Keep retry claims atomic and lease-based so concurrent operators do not deliver the same row at once; expose failure metadata to the owner inbox.

Owner inbox reads and review updates must be authorized server-side for the configured owner account; hiding the Settings section in the client is only a presentation detail.

**Why:** Feedback contains user-submitted content and regular accounts must not be able to read it by calling the API directly.

**How to apply:** Preserve existing rows when adding review metadata; use a nullable timestamp so old rows begin as New and can be marked Reviewed without a destructive migration.