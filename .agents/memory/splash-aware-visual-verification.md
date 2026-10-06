---
name: Splash-aware visual verification
description: How to interpret immediate screenshots for DiscipleOS after navigation
---

The first screenshot after opening DiscipleOS can show the launch splash instead of the requested page. Treat that capture as a startup-state check, not as evidence that the page failed to render. In browser tests, wait for the splash to detach before interacting.

For responsive state matrices, navigate once per seeded data scenario and resize the same page across widths when the data state does not change. Avoid reloading at every width.

**Why:** The app intentionally keeps a launch splash visible briefly. Repeated reloads also multiply startup time, causing long state matrices to hit the test timeout while the final splash is still visible.

**How to apply:** Use a post-splash DOM assertion before evaluating layout or interacting. Reuse a page across viewport widths when only the viewport changes, resetting disclosure state between widths if needed.