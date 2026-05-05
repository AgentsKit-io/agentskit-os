# AgentsKitOS UI Visual System

This guide adapts the Apple-inspired design language documented in
[VoltAgent awesome-design-md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/apple/DESIGN.md)
for an operational desktop product. The reference is useful for restraint:
quiet chrome, confident typography, a single blue action color, precise
surfaces, and motion that supports intent.

AgentsKitOS is not a marketing page. It is an orchestration cockpit. The UI must
feel clean, professional, calm, and obvious while still giving power users fast
access to deep configuration.

## Visual Principles

1. **Content is the interface.** Chrome should recede. Agents, flows, runs,
   traces, policies, and evidence are the visual hierarchy.
2. **One primary action color.** Use blue for interactive emphasis. Status colors
   are reserved for state, never decoration.
3. **Glass is structural, not ornamental.** Use glass for overlays, navigation
   shells, inspectors, command palette, modals, and floating bars. Do not put
   glass on every card.
4. **No opaque mystery.** Glass surfaces must still be readable. Backdrop blur
   is paired with enough fill opacity, borders, and shadow to prevent content
   bleeding through.
5. **Operational density, not dashboard noise.** Use compact, scannable object
   layouts. Avoid decorative metric cards that do not lead to an action.
6. **Motion explains change.** View transitions, hover states, and small
   entrance/exit animations should clarify navigation, selection, and state.

## Tokens

Use semantic tokens in CSS and component APIs. Do not hardcode color utility
classes in feature screens.

| Token | Light | Dark | Purpose |
|---|---:|---:|---|
| `--akos-canvas` | `#ffffff` | `#08090b` | Page base |
| `--akos-canvas-muted` | `#f5f5f7` | `#111216` | App chrome base |
| `--akos-surface` | `#fafafc` | `#15161b` | Panels and object surfaces |
| `--akos-surface-raised` | `#ffffff` | `#1b1c22` | Popovers, detail panes |
| `--akos-ink` | `#1d1d1f` | `#f5f5f7` | Primary text |
| `--akos-ink-muted` | `#6e6e73` | `#a1a1aa` | Secondary text |
| `--akos-hairline` | `rgba(0,0,0,0.10)` | `rgba(255,255,255,0.12)` | Dividers |
| `--akos-action` | `#0066cc` | `#2997ff` | Primary interaction |
| `--akos-action-focus` | `#0071e3` | `#5eb0ff` | Focus ring and selected state |
| `--akos-success` | `#148a50` | `#30d158` | Healthy/succeeded |
| `--akos-warning` | `#b76e00` | `#ffd60a` | Warning/pending attention |
| `--akos-danger` | `#d92d20` | `#ff453a` | Failed/destructive |

Glass tokens:

| Token | Value | Purpose |
|---|---|---|
| `--akos-glass-bg` | `rgba(250,250,252,0.78)` / `rgba(18,19,24,0.78)` | Main glass fill |
| `--akos-glass-strong-bg` | `rgba(255,255,255,0.88)` / `rgba(12,13,17,0.90)` | Modal and notification fill |
| `--akos-glass-border` | `rgba(255,255,255,0.36)` / `rgba(255,255,255,0.12)` | Frosted outline |
| `--akos-glass-shadow` | `0 20px 60px rgba(0,0,0,0.24)` | Overlay depth |
| `--akos-blur` | `blur(22px) saturate(180%)` | Default backdrop |

## Typography

Use the system stack. On macOS/Tauri this resolves to SF Pro, matching the
reference without shipping remote fonts.

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
```

Typography should be quiet inside the desktop app:

| Role | Size | Weight | Line height | Use |
|---|---:|---:|---:|---|
| `display` | 32 | 600 | 1.15 | Workspace/home page titles only |
| `title` | 24 | 600 | 1.2 | Main screen titles |
| `section` | 17 | 600 | 1.3 | Panels and object sections |
| `body` | 15 | 400 | 1.5 | Most UI copy |
| `body-strong` | 15 | 600 | 1.45 | Object names |
| `caption` | 12 | 500 | 1.3 | Labels, metadata |
| `mono` | 12 | 500 | 1.45 | Tokens, IDs, traces, config |

Rules:

- Do not scale type with viewport width.
- Letter spacing is `0` by default in product UI.
- Use monospace only for data/config, not general labels.
- Avoid hero-scale text inside cards, sidebars, and modals.

## Component Style

Buttons:

- Primary actions are blue pills with native `button` semantics.
- Secondary actions are neutral or outlined pills.
- Icon-only actions use Lucide icons and accessible labels.
- Active press state may scale to `0.97`; keep it subtle.

Panels:

- Prefer flat panels with hairline borders over stacked cards.
- Do not nest cards inside cards.
- Repeated object rows may use 6-8px radius; modals and popovers may use 12px.
- Use glass on modal/notification/popover surfaces only when readability is
  preserved.

Navigation:

- Primary navigation is short and stable.
- Current item uses `aria-current` and a visible selected indicator.
- `Cmd+K` must work both from the header control and the keyboard shortcut.

Motion:

- Use view transitions for route/screen changes.
- Use reduced-motion fallbacks.
- Animate opacity/transform, not layout-heavy properties.
- Keep transitions below 180ms for routine UI and below 260ms for overlays.

## Accessibility And Contrast

Glass surfaces require explicit contrast checks. Every modal, notification,
popover, and command palette must have:

- `aria-modal` or matching popover semantics.
- Focus management.
- Opaque-enough fill for body text.
- Escape and outside-click behavior when appropriate.
- `prefers-reduced-transparency` or high-contrast fallback where possible.

## Prohibited Patterns

- Remote fonts or CDN scripts in production Tauri/webview paths.
- Transparent modals that let unrelated content compete with the modal body.
- More than one primary accent color in the same workflow.
- Decorative gradient blobs, bokeh, or unrelated illustration.
- Hardcoded feature-screen colors instead of semantic tokens.
- Recreating date, class merging, dialog, or animation primitives when a project
  library already exists.
