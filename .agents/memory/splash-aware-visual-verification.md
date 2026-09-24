---
name: Splash-aware visual verification
description: How to interpret immediate screenshots for DiscipleOS after navigation
---

The first screenshot after opening DiscipleOS can show the launch splash instead of the requested page. Treat that capture as a startup-state check, not as evidence that the page failed to render.

**Why:** The app intentionally keeps a launch splash visible briefly, and screenshot capture can happen before its removal even when the underlying page and workflow are healthy.

**How to apply:** Use a post-splash DOM assertion or a browser test that waits for the target surface before evaluating responsive layout, form states, or visual regressions.