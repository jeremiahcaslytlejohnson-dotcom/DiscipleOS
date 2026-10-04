---
name: Mobile menu positioning
description: Positioning constraint for the mobile dashboard navigation panel and its bottom selector.
---

On phones, keep Menu/Close and Feedback in a safe-area-anchored bottom action band outside the scrolling app content. Center the open navigation panel against the viewport, independently of that dock.

**Why:** The fixed controls previously covered Calendar dates and activity-form fields while users scrolled. A dedicated dock keeps those actions available without placing them over interactive content.

**How to apply:** Reserve the dock height outside the mobile content scroller; do not let page content scroll behind the controls. Keep fixed ancestors untransformed so the navigation panel remains centered in the phone viewport. Leave desktop navigation in normal flow.