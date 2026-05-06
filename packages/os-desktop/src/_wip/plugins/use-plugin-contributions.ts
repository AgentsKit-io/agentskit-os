import { useCallback } from 'react'
import { sidecarRequest } from '../lib/sidecar'
import {
  PluginDashboardContribution,
  PluginWidgetContribution,
} from './contribution-types'

type ContributionsResponse = {
  dashboards?: unknown[]
  widgets?: unknown[]
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

export const usePluginContributionsFetch = (): (() => Promise<{
  dashboards?: PluginDashboardContribution[]
  widgets?: PluginWidgetContribution[]
}>) => {
  return useCallback(async () => {
    const response = await sidecarRequest<ContributionsResponse>(
      'plugins.list-contributions',
      { kinds: ['dashboard-template', 'widget'] },
    )

    const out: {
      dashboards?: PluginDashboardContribution[]
      widgets?: PluginWidgetContribution[]
    } = {}
    if (response && typeof response === 'object') {
      if (Array.isArray(response.dashboards)) out.dashboards = parseDashboards(response.dashboards)
      if (Array.isArray(response.widgets)) out.widgets = parseWidgets(response.widgets)
    }
    return out
  }, [])
}

