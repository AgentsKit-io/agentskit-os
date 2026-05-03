# A11y Checklist — WCAG 2.2 AA Pass 1

This document records the accessibility gates met by the first a11y pass
(`feat/a11y-pass-1`, closes #121 U-9).

## Scope

Package `@agentskit/os-ui` (shared component library) and `@agentskit/desktop`
(Tauri 2 shell).

---

## WCAG 2.2 AA Gates

### 1.3.1 Info and Relationships (A)

| Element | Implementation |
|---------|---------------|
| Navigation list | `<nav aria-label="Main navigation">` wraps sidebar buttons |
| Notification panel | `role="complementary" aria-label="Notification center"` |
| Command palette | `role="dialog" aria-modal="true" aria-label="Command palette"` |
| Notification items | `role="list"` / `role="listitem"` structure |
| Trace table | `<table aria-label="Trace list">` with `<thead>` / `<tbody>` |

### 1.3.6 Identify Purpose (AAA — implemented as best-effort)

All icon-only buttons carry explicit `aria-label` attributes:
- `NotificationBell` — dynamic label including unread count.
- `FocusToggle` — "Enter focus mode" / "Exit focus mode".
- ThemeSwitcher buttons — `"{Theme} theme"` per button.
- Close button in NotificationPanel — "Close notification panel".
- Dismiss button in ServiceModeBanner — "Dismiss service mode banner".

### 2.1.1 Keyboard (A)

| Component | Keyboard support |
|-----------|-----------------|
| Sidebar nav buttons | Tab to focus, Enter/Space to activate |
| Command palette | ↑/↓ navigate, Enter run, Esc close, Cmd/Ctrl+K toggle |
| Notification panel | Tab to navigate items, Esc handled upstream |
| TraceList rows | `tabIndex={0}`, Enter/Space to select |
| SkipToContent link | Tab reveals link; activates focus on `#main-content` |
| All buttons | Native `<button>` elements — keyboard accessible by default |

### 2.1.2 No Keyboard Trap (A)

The command palette uses `role="dialog" aria-modal="true"` and closes on Esc.
The notification panel backdrop click and Esc close it.

### 2.4.1 Bypass Blocks (A)

- `<SkipToContent targetId="main-content">` rendered as first focusable element.
- `<main id="main-content">` is the target.

### 2.4.3 Focus Order (A)

Skip link → sidebar nav → main content — matches visual reading order.

### 2.4.7 Focus Visible (AA)

Global `:focus-visible` rule in `packages/os-ui/styles.css`:

```css
:focus-visible {
  outline: 2px solid var(--ag-accent);
  outline-offset: 2px;
}
```

`Button` component uses Tailwind `focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]`.

### 4.1.2 Name, Role, Value (A)

- All interactive elements have accessible names (via content, `aria-label`, or `aria-labelledby`).
- Toggle buttons use `aria-pressed` (NotificationBell, FocusToggle, ThemeSwitcher).
- Current page nav item uses `aria-current="page"`.
- Listbox uses `aria-selected` per option (PaletteList).

### 4.1.3 Status Messages (AA)

- `<LiveRegion>` component provides `aria-live="polite" role="status"` for:
  - Navigation events ("Navigated to Dashboard / Traces").
  - Notification panel open/close.
  - Notification clear.

---

## Motion & Contrast

### prefers-reduced-motion

`packages/os-ui/styles.css` includes:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### prefers-contrast: more

`packages/os-ui/styles.css` includes a block that:
- Raises `--ag-line` to a more visible shade.
- Bumps `--ag-accent` to a higher-contrast cyan.
- Sets `border-width: 2px` on panels and badges.

---

## Out of Scope (future passes)

- ARIA `grid` pattern for TraceList (roving tabindex between cells).
- Full focus trap inside modals (dialog spec).
- Colour-contrast ratio audit of all text/background combinations.
- Screen reader testing with NVDA / VoiceOver / JAWS.
- `prefers-color-scheme` OS dark mode pass-through.
