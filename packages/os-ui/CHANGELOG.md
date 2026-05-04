# @agentskit/os-ui

## 0.1.0-alpha.0

### Minor Changes

- ed380e9: D-9 theme engine: persisted user choice, dark / cyber / light / system, CSS-variable overrides via Zod-typed theme registry. D-4 cyber-minimal theme ships built-in. New `<ThemeSwitcher />` os-ui component. Closes #43 #38
- d6c808d: A11y pass 1 (WCAG 2.2 AA): add `LiveRegion` and `SkipToContent` components, focus-visible fallback, prefers-reduced-motion and prefers-contrast media-query overrides in styles.css.

  New exports:

  - `LiveRegion` — visually-hidden `aria-live` region for screen-reader announcements.
  - `SkipToContent` — keyboard-accessible skip link that becomes visible on focus.

  CSS additions in `styles.css`:

  - Global `:focus-visible` fallback outline (`2px solid var(--ag-accent)`).
  - `@media (prefers-reduced-motion: reduce)` block that disables all transitions/animations.
  - `@media (prefers-contrast: more)` block that bumps border widths and raises accent contrast.

- e139d1f: Initial scaffold of @agentskit/os-ui — shadcn-based React primitives + dark cyan theme tokens shared by the desktop shell and any embedder.

  Components: Button, Card, Badge, Kbd, Tooltip, GlassPanel.
  Tokens: tokens.css + styles.css ready to import.

  Closes #113

### Patch Changes

- 5c76c47: Initial scaffold of apps/desktop — Tauri 2 shell + React 19 + Tailwind + shadcn front-end + @agentskit/os-headless sidecar over JSON-RPC stdio. Per ADR-0018.

  Closes #35
  Refs #36 #37 #43 #38 #44
