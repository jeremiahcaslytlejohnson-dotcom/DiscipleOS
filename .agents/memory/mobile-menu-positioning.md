---
name: Mobile menu positioning
description: Positioning constraint for the mobile dashboard navigation panel and its bottom selector.
---

The mobile navigation panel and its bottom selector are separate viewport-anchored elements: center the open panel against the phone viewport, while the Menu/Close selector stays fixed at the bottom safe area.

**Why:** A fixed panel inside an ancestor with a transform can use that ancestor as its containing block instead of the viewport, producing large vertical placement errors.

**How to apply:** Keep the mobile fixed wrapper untransformed and use flex centering for the selector. Use a viewport-centered fixed panel independently; leave desktop navigation outside this behavior.