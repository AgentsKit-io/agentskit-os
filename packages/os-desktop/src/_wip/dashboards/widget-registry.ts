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
 *
 * Plugin widgets use the `plugin:<pluginId>:<widgetId>` kind prefix and are
 * rendered via PluginWidgetRenderer (sandboxed iframe). Detection is via
 * `isPluginWidgetKind()`.
 *
 * Part of M2 #248 — plugin-contributed dashboards + widgets extension point.
 */

import type { ReactNode } from 'react'
import type { DashboardStats } from '../screens/dashboard/use-dashboard-stats'
import type { SidecarEvent } from '../lib/sidecar'

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
// Plugin widget detection
// ---------------------------------------------------------------------------

/**
 * Returns true for kinds using the `plugin:<pluginId>:<widgetId>` convention.
 * These kinds are not in the built-in registry and are rendered via
 * PluginWidgetRenderer (sandboxed iframe).
 */
export function isPluginWidgetKind(kind: string): boolean {
  return kind.startsWith('plugin:')
}

/**
 * Parse a plugin widget kind string into its constituent parts.
 * Returns undefined if the kind does not match the `plugin:` prefix.
 */
export function parsePluginWidgetKind(
  kind: string,
): { pluginId: string; widgetId: string } | undefined {
  if (!isPluginWidgetKind(kind)) return undefined
  // Format: plugin:<pluginId>:<widgetId>
  // pluginId itself may not contain colons; widgetId may.
  const withoutPrefix = kind.slice('plugin:'.length)
  const firstColon = withoutPrefix.indexOf(':')
  if (firstColon === -1) return undefined
  const pluginId = withoutPrefix.slice(0, firstColon)
  const widgetId = withoutPrefix.slice(firstColon + 1)
  if (!pluginId || !widgetId) return undefined
  return { pluginId, widgetId }
}
