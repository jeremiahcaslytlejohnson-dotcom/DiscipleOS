---
name: Tailwind spacing overrides
description: Avoid additive physical and logical margins when tightening Tailwind vertical spacing.
---

When changing vertical spacing created by a Tailwind utility, inspect computed physical and logical margins on both adjacent elements. Override the existing margin that creates the gap rather than adding a complementary margin property.

**Why:** A spacing adjustment once increased the gap because the utility's existing margin and a new margin both applied.

**How to apply:** Use browser-computed styles to identify the source margin, override that same property at the intended breakpoint, then rerun the geometry/no-scroll check.
