---
name: Account data claim
description: The ownership rule for migrating DiscipleOS's legacy anonymous browser data into managed accounts.
---

Anonymous events, reading plans, and push subscriptions are migrated only when the person signs in from the browser session that created them. A different browser, even when signed into the same account, reads account data but cannot claim another anonymous browser's records.

**Why:** This preserves a person's current local experience during the account rollout without creating a mechanism for users to import or infer another person's anonymous data.

**How to apply:** Keep the anonymous session identifier separate from the authenticated account identifier. Any future migration or recovery feature must require explicit, user-verifiable ownership rather than accepting an arbitrary browser or record ID.

Email verification should claim the current browser's anonymous data before navigating into the authenticated app; the app's normal sync remains an idempotent retry.

**Why:** Waiting for the destination page to notice the new session creates a timing window where local plans can appear disconnected or be reconciled against the account before the claim completes.

**How to apply:** Preserve the browser session through verification, run `/api/account/claim` immediately after successful code verification, then refresh the auth context and hydrate plans.