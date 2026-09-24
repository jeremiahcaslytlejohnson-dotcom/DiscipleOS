---
name: Browser auth callback fixtures
description: Playwright behavior to account for when testing redirect-based auth without provider credentials.
---

Playwright route fulfillments used for navigation may update the address bar for a synthetic 302 without issuing the follow-up request. Auth callback fixtures should invoke the callback URL explicitly, install the session cookie in the browser context, and navigate back to the app before asserting authenticated state.

**Why:** A mocked provider redirect can otherwise leave the page on an empty callback response, making a passing callback handler look like a failed login.

**How to apply:** Keep provider-independent auth tests at the browser boundary, assert the callback query and cookie-backed API responses, and use explicit app navigation after intercepted callback and logout responses.
