---
name: Responsive disclosure probes
description: Testing guidance for responsive forms that collapse content only on mobile
---

Responsive accordion content should use the same breakpoint as the app's mobile layout when switching from collapsed to fully visible. Geometry and control-baseline probes should measure rendered content at that breakpoint rather than counting hidden controls as zero-height. When disclosure state is persisted locally, browser fixtures must reset it between scenarios; when a section is populated asynchronously, wait for its rendered state before measuring geometry.

**Why:** A test that queries all inputs can include controls inside `display: none` sections, producing false layout failures even though the tablet/desktop UI intentionally shows the complete form.

**How to apply:** Scope DOM-order probes to the actual section elements, assert mobile hidden/open states separately from tablet/desktop visibility, reset local disclosure keys in init fixtures, and wait for asynchronous starter content before checking shared gutters. Check the document's normal scroll width instead of introducing inner scroll containers.