---
"@agentskit/os-ui": minor
---

A11y pass 1 (WCAG 2.2 AA): add `LiveRegion` and `SkipToContent` components, focus-visible fallback, prefers-reduced-motion and prefers-contrast media-query overrides in styles.css.

New exports:
- `LiveRegion` — visually-hidden `aria-live` region for screen-reader announcements.
- `SkipToContent` — keyboard-accessible skip link that becomes visible on focus.

CSS additions in `styles.css`:
- Global `:focus-visible` fallback outline (`2px solid var(--ag-accent)`).
- `@media (prefers-reduced-motion: reduce)` block that disables all transitions/animations.
- `@media (prefers-contrast: more)` block that bumps border widths and raises accent contrast.
