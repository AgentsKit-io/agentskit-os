/**
 * Widget render implementations for each built-in widget kind.
 *
 * Imported by dashboard-grid.tsx at render time; avoids circular dependency
 * between widget-registry.ts (pure, no JSX) and the screen components.
 */

import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@agentskit/os-ui'
import { StatsGrid } from '../screens/dashboard/stats-grid'
import { RecentRuns } from '../screens/dashboard/recent-runs'
import { EventFeed } from '../screens/dashboard/event-feed'
import { CustomWidgetRenderer } from './custom/custom-widget-renderer'
import { isCustomWidgetKind, customWidgetIdFromKind } from './widget-registry'
import { getCustomWidget } from './custom/custom-widget-store'
import type { WidgetRenderContext } from './widget-registry'
import type { CustomWidget } from './custom/custom-widget-types'
import type { Widget } from './types'

// ---------------------------------------------------------------------------
// Per-kind render functions
// ---------------------------------------------------------------------------

function renderStatsSummary(ctx: WidgetRenderContext): ReactNode {
  return <StatsGrid stats={ctx.stats} isLoading={ctx.statsLoading} />
}

function renderRecentRuns(_ctx: WidgetRenderContext): ReactNode {
  return <RecentRuns runs={[]} />
}

function renderEventFeed(ctx: WidgetRenderContext): ReactNode {
  return (
    <EventFeed events={ctx.events} isPaused={ctx.isPaused} toggle={ctx.toggleFeed} />
  )
}

function renderCostChart(_ctx: WidgetRenderContext): ReactNode {
  // TODO: wire to real cost stream once sidecar exposes cost.stream
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-[var(--ag-ink-muted)]">
          Cost over time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-[var(--ag-line)] text-xs text-[var(--ag-ink-subtle)]">
          Chart placeholder — coming soon
        </div>
      </CardContent>
    </Card>
  )
}

function renderNotificationsSummary(ctx: WidgetRenderContext): ReactNode {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-[var(--ag-ink-muted)]">
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums text-[var(--ag-ink)]">
          {ctx.unreadNotifications}
        </p>
        <p className="mt-1 text-xs text-[var(--ag-ink-subtle)]">unread notifications</p>
      </CardContent>
    </Card>
  )
}

function renderTracesSummary(_ctx: WidgetRenderContext): ReactNode {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-[var(--ag-ink-muted)]">
          Traces
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--ag-ink-muted)]">
          Navigate to the Traces screen to inspect spans.
        </p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Dispatch map
// ---------------------------------------------------------------------------

const RENDERERS: Record<string, (ctx: WidgetRenderContext) => ReactNode> = {
  'stats-summary': renderStatsSummary,
  'recent-runs': renderRecentRuns,
  'event-feed': renderEventFeed,
  'cost-chart': renderCostChart,
  'notifications-summary': renderNotificationsSummary,
  'traces-summary': renderTracesSummary,
}

export function renderWidget(
  kind: string,
  ctx: WidgetRenderContext,
  widget?: Widget,
): ReactNode {
  // Custom widgets: resolve definition from props (template-applied) or store
  if (isCustomWidgetKind(kind)) {
    const widgetId = customWidgetIdFromKind(kind)
    // Check props first (populated when applied from a marketplace template)
    const fromProps =
      widget?.props?.['customWidgetDef'] as CustomWidget | undefined
    const definition = fromProps ?? getCustomWidget(widgetId)

    if (!definition) {
      return (
        <div className="flex h-full items-center justify-center text-xs text-[var(--ag-ink-subtle)]">
          Custom widget not found: {widgetId}
        </div>
      )
    }
    return <CustomWidgetRenderer widget={definition} />
  }

  const fn = RENDERERS[kind]
  if (!fn) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-[var(--ag-ink-subtle)]">
        Unknown widget: {kind}
      </div>
    )
  }
  return fn(ctx)
}
