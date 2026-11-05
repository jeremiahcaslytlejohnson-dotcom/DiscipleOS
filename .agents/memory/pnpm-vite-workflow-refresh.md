---
name: PNPM Vite workflow refresh
description: Avoid stale Vite package paths after workspace lockfile updates.
---

After changing workspace package versions, refresh the installed packages and restart affected Vite workflows before treating missing files under the PNPM store as application defects.

**Why:** A Vite process kept importing a removed package-store path after lockfile resolution changed; a fresh workflow started cleanly with the new version.

**How to apply:** After PNPM dependency changes, run a full install and restart the relevant artifact workflows before preview verification.
