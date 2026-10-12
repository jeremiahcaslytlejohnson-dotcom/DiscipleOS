---
name: DiscipleOS stabilization freeze
description: Scope rule for Replit task suggestions during the DiscipleOS stabilization effort.
---

The owner said, “i want it locked we will mod plans after.” Freeze DiscipleOS reading-plan curricula, day schedules, chapter allocations, path definitions, and behavior for Guided Climb, Mountain Rhythm, and Free Climb. Before the forthcoming stabilization release, do not reallocate Scripture overlap, add plans, change reading content, add features, redesign UI, or surface unrelated suggestions.

Continue only approved stabilization work: finish task #132 production API security verification, then run a comprehensive non-destructive functional/security audit and make only necessary P0/P1 fixes that preserve existing behavior and protect data. Keep task #131 deferred/on hold.

Before any GitHub push or publication, verify current feature behavior and obtain the owner's explicit go-ahead on release readiness. Preserve a GitHub recovery point and carefully reconcile before changing `origin/main`; do not push or publish without that approval. Do not reset the database, migrate plan history, or silently alter plans. Consider plan-content changes only after the audit, GitHub push, and live publication, as a separate subsequent release.

Do not generate, create, queue, recommend, or surface new feature tasks or optional improvements during the freeze. Report actual blocking bugs or security/data-integrity issues as blockers instead of expanding scope.

**Why:** the user explicitly requested a suggestion freeze until the stabilization work is cleaned up.

**How to apply:** preserve existing plan behavior through stabilization. Do only #132 verification and then the approved non-destructive audit/P0-P1 fixes. Before any push or publish, verify behavior and obtain explicit release-readiness approval; keep plan-content changes for the later release.
