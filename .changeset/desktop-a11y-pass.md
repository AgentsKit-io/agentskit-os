---
"@agentskit/desktop": patch
---

A11y pass 1 (WCAG 2.2 AA): keyboard-only navigation, screen-reader labels, ARIA landmarks, skip-to-content link, live regions, and focus-visible improvements.

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
