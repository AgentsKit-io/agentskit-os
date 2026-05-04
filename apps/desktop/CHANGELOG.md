# @agentskit/desktop

## 0.0.1-alpha.0

### Patch Changes

- d6c808d: A11y pass 1 (WCAG 2.2 AA): keyboard-only navigation, screen-reader labels, ARIA landmarks, skip-to-content link, live regions, and focus-visible improvements.

  Changes:

  - Added `<SkipToContent>` as first focusable element in `App`.
  - Wrapped sidebar navigation in `<nav aria-label="Main navigation">` and sidebar in `<aside aria-label="Application sidebar">`.
  - Added `<header aria-label="Application header">` around the service-mode banner.
  - Added `id="main-content"` and `aria-label="Main content"` to the `<main>` element.
  - Added global `<LiveRegion>` in `AppShell` for polite SR announcements on navigation and notification events.
  - Updated `NotificationCommandBridge` to emit announcements via `onAnnounce` callback.
  - `TracesScreen` wrapped in `<section aria-label="Traces">` with labelled `role="region"` sub-panes.
  - `Dashboard` wrapped in `<section aria-label="Dashboard">`.
  - `TraceRowItem` gains `role="row"`, `aria-selected`, `tabIndex={0}`, and keyboard Enter/Space handler.
  - `TraceList` table gets `aria-label="Trace list"`.

- d8714f0: U-7 immersive artifact viewer. Detects artifact kind by MIME + content (code, JSON, YAML, CSV, SVG, Mermaid, HTML, Markdown, image). One renderer per kind. Fullscreen mode via Cmd+Shift+A. HTML sandboxed iframe (`sandbox="allow-scripts"` only). Closes #119
- 251bf5c: apps/desktop — D-6 global command palette (Cmd/Ctrl+K). Built-in commands cover navigation, runtime control (pause/resume), theme toggle, event-feed clear. Pluggable via `registerCommand` in the provider. Closes #40
- 50b79c2: U-6 custom dashboard widgets + #234 dashboard template marketplace stub.

  - Custom widgets: title, kind (number/sparkline/gauge/text), sidecar source + path expression. Persisted to localStorage. Picker shows them next to built-ins.
  - Marketplace stub: 3 curated dashboard layouts; remote marketplace TODO #234.

  Closes #118 #234

- fab7944: apps/desktop — D-2 dashboard wiring: stats grid (mock), recent runs table (empty state), live event feed (sidecar subscription).
- da2fb29: Example library indexed by intent. 12 examples linked to os-templates. Sidebar entry, search + intent filters, "Try in OS" via sidecar `templates.scaffoldFrom` (TODO #91). Closes #180
- 0fb764a: D-8 focus mode: full-bleed single-screen view with sidebar/banner hidden. Toggle via Cmd/Ctrl+Shift+., command palette, or sidebar button. Persisted. Closes #42
- 5569693: Fork-from-trace: observed trace spans → editable FlowConfig draft → sidecar `flows.create` (TODO #91). Modal lets user edit name + agent IDs before saving. Closes #178
- f105d17: D-11 global fuzzy search overlay (Cmd/Ctrl+/). Searches workspaces, agents, flows, runs, traces, palette commands, docs. Pure scoring (subsequence + prefix bonus). Find-similar button stub references sidecar `search.findSimilar` (TODO #91). Closes #45
- 2aaf8a0: Inline LLM prompt assistant overlay. Anchors to elements marked `data-assist-target`; Cmd+I opens. Streams responses from sidecar `assistant.stream` (TODO #92, stub mock for now). Accept/dismiss flow non-blocking. Closes #179
- bf0c08a: U-5 + #229: keyboard shortcut system. 12 built-in bindings, user rebind UI with conflict detection, JSON export/import, persisted overrides. Closes #117 #229
- 997301a: Multi-dashboard creation + drag-resize layout + saved layouts. Tab strip per dashboard, "+" creates, right-click renames/deletes. Built-in widget registry: stats-summary, recent-runs, event-feed, cost-chart, notifications-summary, traces-summary. Persisted to localStorage. Closes #233
- 730f610: D-12 multi-monitor support: open Dashboard / Traces / single-trace windows on user-selected monitor; persisted layout per purpose; tray + palette commands. Closes #46
- 93fb452: Notification preferences: per-event routing (panel / os-toast / desktop-alert / silent) + quiet hours with allow-critical override. Persisted; pure routing engine; UI modal with routing matrix + time pickers. Closes #246
- 16e6dd8: D-10 global notification center: bell with unread badge in sidebar header, slide-in panel grouped by severity, sidecar event auto-bridge, palette commands to toggle/clear. Persisted last 50 to localStorage. Closes #44
- 5ffe7a3: Plugin-contributed dashboards + widgets — extension point UI scaffolding. Marketplace + widget picker show plugin contributions alongside built-ins. Sandboxed iframe render for plugin widgets. Sidecar plugin host TODO #91/M5; stub data shipped so UX is testable. Closes #248
- 344a9db: User preferences panel: density, fonts, language, reduced motion, high contrast, telemetry opt-in. Persisted; applied to documentElement data-attributes. Closes #230
- 79fc0c9: D-13 snapshot & restore desktop state. Bundles all desktop localStorage keys (prefs, shortcuts, theme, status line, notifications, focus, onboarding, workspaces) into a versioned JSON snapshot. Export downloads; import re-applies + reloads. Closes #47
- 3ec43ee: Customizable status line / topbar — 8 built-in segments (workspace, run-mode, sidecar status, active runs, cost 24h, unread notifications, theme, time). User picks visible segments + order via config panel. Closes #232
- dd9e55e: Theme editor modal with live preview and marketplace stub. Adds per-token CSS-var overrides (surfaces, ink, accent, lines), base-theme selector, Save/Save As New/Export/Import, and a marketplace stub with three sample themes (cyber-pink, mint, paper). Registered as "Open theme editor" command in the command palette. Closes #231
- ed380e9: D-9 theme engine: persisted user choice, dark / cyber / light / system, CSS-variable overrides via Zod-typed theme registry. D-4 cyber-minimal theme ships built-in. New `<ThemeSwitcher />` os-ui component. Closes #43 #38
- 0a7c4bc: apps/desktop — first cut of the trace viewer (G-5): trace list +
  span tree pulling from os-observability. Read-only; replay button
  stub references RunSnapshot (#206). Sidecar `traces.list` /
  `traces.get` methods are TODO.
- 0211ed2: apps/desktop — D-3 system tray + service mode. Closing the main window
  hides instead of quitting; tray exposes Show/Pause/Resume/Settings/Quit
  and surfaces sidecar status. Opt-out via AGENTSKITOS_NO_TRAY=1.
- 7ece4c2: U-2 voice mode (artifact rendering already shipped in #119). Web Speech API integration; mic button in sidebar; live transcript overlay; stop on toggle or silence. Sidecar `voice.handle` routes commands (TODO #100). Closes #114
- 3a6b2fe: Fast workspace switcher + per-workspace status badge in sidebar header. Cmd/Ctrl+P opens dropdown; persisted current selection. Closes #235
- Updated dependencies [56a30a2]
- Updated dependencies [5c76c47]
- Updated dependencies [ed380e9]
- Updated dependencies [d6c808d]
- Updated dependencies [e139d1f]
  - @agentskit/os-core@0.4.0-alpha.2
  - @agentskit/os-headless@0.1.0-alpha.1
  - @agentskit/os-ui@0.1.0-alpha.0
