/**
 * PluginContributionsProvider — fetches and exposes plugin-contributed
 * dashboard templates and custom widget definitions.
 *
 * Sidecar method: `plugins.list-contributions`
 * TODO #91 / M5 — the full plugin host runtime is not yet implemented.
 * Until then, `sidecarRequest` falls back to `{}` (no Tauri) and we serve
 * stub data so the UX is fully testable today.
 *
 * Stub data: 1 mock dashboard template + 1 mock widget.
 *
 * Closes #248
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { sidecarRequest } from '../lib/sidecar'
import {
  PluginDashboardContribution,
  PluginWidgetContribution,
} from './contribution-types'
import type { z } from 'zod'

// ---------------------------------------------------------------------------
// Sidecar response shape
// ---------------------------------------------------------------------------

type ContributionsResponse = {
  dashboards?: unknown[]
  widgets?: unknown[]
}

// ---------------------------------------------------------------------------
// Stub fallback (TODO #91/M5 — remove once plugin host ships)
// ---------------------------------------------------------------------------

const STUB_DASHBOARD: PluginDashboardContribution = {
  id: 'stub-overview',
  pluginId: 'agentskit-demo-plugin',
  version: '0.1.0',
  layout: {
    name: 'Plugin Overview',
    description: 'Demo dashboard contributed by the stub plugin.',
    gridCols: 12,
    gridRowHeight: 80,
    widgets: [
      { kind: 'stats-summary', x: 0, y: 0, w: 12, h: 2 },
      { kind: 'event-feed', x: 0, y: 2, w: 6, h: 3 },
      { kind: 'cost-chart', x: 6, y: 2, w: 6, h: 3 },
    ],
  },
}

const STUB_WIDGET: PluginWidgetContribution = {
  id: 'stub-hello',
  pluginId: 'agentskit-demo-plugin',
  version: '0.1.0',
  kind: 'plugin:agentskit-demo-plugin:stub-hello',
  label: 'Hello from Plugin',
  defaultSize: [4, 2],
  renderSchema: { message: { type: 'string' } },
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type PluginContributionsContextValue = {
  /** Plugin-contributed dashboard templates. */
  dashboards: readonly PluginDashboardContribution[]
  /** Plugin-contributed widget definitions. */
  widgets: readonly PluginWidgetContribution[]
  /** Re-fetch contributions from the sidecar. */
  refresh: () => void
}

const PluginContributionsContext = createContext<
  PluginContributionsContextValue | undefined
>(undefined)

export function usePluginContributions(): PluginContributionsContextValue {
  const ctx = useContext(PluginContributionsContext)
  if (!ctx) {
    throw new Error(
      'usePluginContributions must be used within a PluginContributionsProvider',
    )
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type PluginContributionsProviderProps = {
  children: React.ReactNode
}

function parseDashboards(raw: unknown[]): PluginDashboardContribution[] {
  const results: PluginDashboardContribution[] = []
  for (const item of raw) {
    const parsed = PluginDashboardContribution.safeParse(item)
    if (parsed.success) results.push(parsed.data)
  }
  return results
}

function parseWidgets(raw: unknown[]): PluginWidgetContribution[] {
  const results: PluginWidgetContribution[] = []
  for (const item of raw) {
    const parsed = PluginWidgetContribution.safeParse(item)
    if (parsed.success) results.push(parsed.data)
  }
  return results
}

export function PluginContributionsProvider({
  children,
}: PluginContributionsProviderProps) {
  const [dashboards, setDashboards] = useState<PluginDashboardContribution[]>([
    STUB_DASHBOARD,
  ])
  const [widgets, setWidgets] = useState<PluginWidgetContribution[]>([
    STUB_WIDGET,
  ])

  const fetchContributions = useCallback(async () => {
    try {
      // TODO #91/M5 — sidecar plugin host: implement `plugins.list-contributions`
      const response = await sidecarRequest<ContributionsResponse>(
        'plugins.list-contributions',
        { kinds: ['dashboard-template', 'widget'] },
      )

      // When Tauri is not available (dev/web), sidecarRequest returns {} and
      // we keep the stubs. When the plugin host ships, it returns real data.
      if (
        response &&
        typeof response === 'object' &&
        ('dashboards' in response || 'widgets' in response)
      ) {
        if (Array.isArray(response.dashboards)) {
          setDashboards(parseDashboards(response.dashboards))
        }
        if (Array.isArray(response.widgets)) {
          setWidgets(parseWidgets(response.widgets))
        }
      }
      // else: no real response — stubs remain
    } catch {
      // Non-fatal: stubs remain
    }
  }, [])

  useEffect(() => {
    void fetchContributions()
  }, [fetchContributions])

  const value = useMemo<PluginContributionsContextValue>(
    () => ({
      dashboards,
      widgets,
      refresh: () => void fetchContributions(),
    }),
    [dashboards, widgets, fetchContributions],
  )

  return (
    <PluginContributionsContext.Provider value={value}>
      {children}
    </PluginContributionsContext.Provider>
  )
}
