---
name: Browser smoke tests
description: Environment requirements for running Playwright browser checks in this Nix workspace
---

Playwright browser checks require both the downloaded Chromium runtime and the shared GLib/graphics libraries declared through the workspace Nix configuration.

**Why:** A browser package can install and download successfully while Chromium still exits immediately when a shared library such as libgbm is unavailable.

**How to apply:** When adding or repairing Playwright checks, install the browser runtime and verify the required system packages are present before diagnosing test code.
