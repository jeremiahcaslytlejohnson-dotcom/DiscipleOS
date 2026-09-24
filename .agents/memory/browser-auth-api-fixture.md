---
name: Browser auth API fixture
description: Non-production email-code browser tests must route through the real API service without sending provider email.
---

Real browser authentication tests run the Vite app and API service on separate local ports. The browser app must proxy `/api` to the API service during Playwright runs so httpOnly session cookies and claim timing are exercised against the real server.

The verification-code fixture uses a reserved test-only email domain. The API captures codes in memory and exposes them only through a test endpoint for that domain while `NODE_ENV` is not production; production addresses continue through the configured email provider and normal rate limits.

**Why:** Browser-only auth tests otherwise stop at the frontend server and either cannot retrieve a delivered code or would need to inspect production email content.

**How to apply:** Keep the fixture domain and capture endpoint unavailable in production, and ensure Playwright starts or reuses the API service before testing code verification.