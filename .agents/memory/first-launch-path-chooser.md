---
name: First-launch path chooser
description: Product guidance for the DiscipleOS phone-sized path-selection screen.
---

**Rule:** Explain who each reading path serves and what it does in concise, legible, benefit-oriented copy. Use a compact vertical stack of three full-width, content-sized tappable cards with modest consistent padding and uniform gaps; never stretch cards to fill viewport height or distribute spare height between them. Center the group vertically when the available space permits. Keep descriptions around 16px with clear contrast, all three choices and sign-in access visible without scrolling on standard phones, and preserve the approved copy, entry actions, and saved data. Keep preview-only notices compact and render them only in preview.

**Why:** The user rejected the viewport-percentage layout because it created large card interiors and gaps with clustered text, and explicitly prioritized coherent visual rhythm and readability over filling the screen.

**How to apply:** Recheck the full first-launch screen, including the header, helper intro, sign-in links, and fixed bottom dock, at 375×667 and tall-phone sizes; assert no vertical or horizontal scroll and verify the sign-in links are not clipped.

**Wide-screen rule:** Keep the first-launch choices in a single column on desktop and landscape; widen the container and lay out each card’s label, description, and arrow horizontally instead of squeezing them into three columns. On short landscape screens, compact the cards and keep the feedback control clear of the choices.

**Why:** The user preferred the readable phone card stack and explicitly rejected narrow three-column cards on desktop/landscape.

**How to apply:** Check desktop and short-landscape widths for readable descriptions, an unclipped logo, visible sign-in links, and no floating controls covering a choice.

**Plans empty-state rule:** On phone-sized Plans tabs with no plans, hide the marketing hero and redundant “Planned reading” heading, and compact the empty-state container so all three path choices stay visible without scrolling. Restore the hero at desktop widths.

**Why:** The phone dashboard otherwise pushes the last path choice below the viewport; the empty state already has its own “Choose a reading path” heading.

**How to apply:** Keep this compact treatment scoped to the empty Plans tab; do not hide the hero on populated Plans views or alter the first-launch chooser.
