/**
 * Built-in widget registry.
 *
 * Each entry describes a widget kind with a label, default size, and render
 * function. The render context is passed at grid-render time and contains
 * live data hooks so widgets can access shared data without re-fetching.
 *
 * Widget kinds:
 *   stats-summary       — 4-column stat cards (totalRuns, cost, latency, errors)
 *   recent-runs         — table of recent agent runs
 *   event-feed          — live sidecar event stream
 *   cost-chart          — mock cost-over-time chart (TODO: wire real data)
 *   notifications-summary — count of unread notifications
 *   traces-summary      — placeholder trace summary
 */

import type { ReactNode } from 'react'
import type { DashboardStats } from '../screens/dashboard/use-dashboard-stats'
import type { SidecarEvent } from '../lib/sidecar'
import type { CustomWidget } from './custom/custom-widget-types'

// ---------------------------------------------------------------------------
// Render context
// ---------------------------------------------------------------------------

export type WidgetRenderContext = {
  stats: DashboardStats
  statsLoading: boolean
  events: readonly SidecarEvent[]
  isPaused: boolean
  toggleFeed: () => void
  unreadNotifications: number
}

// ---------------------------------------------------------------------------
// Registry entry
// ---------------------------------------------------------------------------

export type WidgetRegistryEntry = {
  readonly kind: string
  readonly label: string
  /** Default [w, h] in grid units */
  readonly defaultSize: readonly [number, number]
  readonly render: (ctx: WidgetRenderContext) => ReactNode
}

// ---------------------------------------------------------------------------
// Built-in widgets
// ---------------------------------------------------------------------------

export const BUILT_IN_WIDGETS: readonly WidgetRegistryEntry[] = [
  {
    kind: 'stats-summary',
    label: 'Stats Summary',
    defaultSize: [12, 2],
    render: (_ctx) => null, // resolved lazily via widget-renderers.tsx to avoid circular deps
  },
  {
    kind: 'recent-runs',
    label: 'Recent Runs',
    defaultSize: [12, 3],
    render: (_ctx) => null,
  },
  {
    kind: 'event-feed',
    label: 'Live Event Feed',
    defaultSize: [12, 3],
    render: (_ctx) => null,
  },
  {
    kind: 'cost-chart',
    label: 'Cost Chart',
    defaultSize: [6, 3],
    render: (_ctx) => null, // TODO: wire to real cost stream data
  },
  {
    kind: 'notifications-summary',
    label: 'Notifications Summary',
    defaultSize: [4, 2],
    render: (_ctx) => null,
  },
  {
    kind: 'traces-summary',
    label: 'Traces Summary',
    defaultSize: [6, 2],
    render: (_ctx) => null,
  },
]

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const _registryMap = new Map<string, WidgetRegistryEntry>(
  BUILT_IN_WIDGETS.map((e) => [e.kind, e]),
)

export function getWidgetEntry(kind: string): WidgetRegistryEntry | undefined {
  return _registryMap.get(kind)
}

export function getAllWidgetKinds(): readonly string[] {
  return BUILT_IN_WIDGETS.map((e) => e.kind)
}

// ---------------------------------------------------------------------------
// Custom widget registry
//
// Custom widgets use kind "custom:<widgetId>" and are resolved at render time
// by looking up the CustomWidget definition from the widget's props or the
// localStorage store. The actual rendering is delegated to CustomWidgetRenderer.
// ---------------------------------------------------------------------------

/**
 * Determines whether a widget kind belongs to the custom widget namespace.
 * Custom widget kinds follow the pattern "custom:<widgetId>".
 */
export function isCustomWidgetKind(kind: string): boolean {
  return kind.startsWith('custom:')
}

/**
 * Extract the custom widget ID from a "custom:<id>" kind string.
 */
export function customWidgetIdFromKind(kind: string): string {
  return kind.slice('custom:'.length)
}

/**
 * Build a "custom:<id>" kind string for the given CustomWidget.
 */
export function kindForCustomWidget(widget: CustomWidget): string {
  return `custom:${widget.id}`
}

/**
 * Synthetic WidgetRegistryEntry for a custom widget so it can participate in
 * the dashboard addWidget flow (which needs a defaultSize and label).
 */
export function makeCustomWidgetEntry(widget: CustomWidget): WidgetRegistryEntry {
  return {
    kind: kindForCustomWidget(widget),
    label: widget.title,
    defaultSize: [4, 2],
    render: (_ctx) => null, // resolved in widget-renderers.tsx
  }
}
