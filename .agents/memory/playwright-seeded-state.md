---
name: Playwright seeded state
description: Browser-test guidance for localStorage fixtures that must survive a page reload.
---

Playwright `page.addInitScript` runs on every navigation, including `page.reload()`. A fixture that unconditionally seeds localStorage will overwrite the state it is meant to verify after reload.

**Why:** Reload-persistence coverage can appear to lose a successful mutation even when the app and API are correct if the test fixture restores its original seed during navigation.

**How to apply:** Add an opt-in preserve-existing path to one-time localStorage seed helpers, and use it when the test needs to assert state after reload. Keep unconditional seeding for tests that intentionally reset state on each navigation.