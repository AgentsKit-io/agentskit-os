/**
 * Hard-coded curated dashboard templates for the marketplace stub.
 *
 * Each template is a complete DashboardTemplate object (Zod-validated) that
 * can be applied to create a new dashboard.
 *
 * Templates:
 *   1. Cost watch     — track spending with built-in cost-chart + custom cost metrics
 *   2. Run health     — built-in run stats + live event feed
 *   3. Latency dashboard — trace latency summary + custom p99 gauge
 *
 * See TODO #234 for the remote marketplace integration point.
 */

import { WidgetIdSchema } from '../types'
import type { WidgetId } from '../types'
import type { DashboardTemplate } from './marketplace-types'

/** Helper to cast a string literal to the branded WidgetId type. */
function wid(s: string): WidgetId {
  return WidgetIdSchema.parse(s)
}

// ---------------------------------------------------------------------------
// Template: Cost watch
// ---------------------------------------------------------------------------

const COST_WATCH_TEMPLATE: DashboardTemplate = {
  id: 'tpl-cost-watch',
  name: 'Cost watch',
  description: 'Monitor LLM spend in real time with cost trends and a total-cost metric.',
  layout: {
    id: 'dashboard-cost-watch',
    name: 'Cost watch',
    gridCols: 12,
    gridRowHeight: 80,
    widgets: [
      {
        id: wid('cw-stats'),
        kind: 'stats-summary',
        x: 0,
        y: 0,
        w: 12,
        h: 2,
      },
      {
        id: wid('cw-cost-chart'),
        kind: 'cost-chart',
        x: 0,
        y: 2,
        w: 8,
        h: 3,
      },
      {
        id: wid('cw-custom-total'),
        kind: 'custom:cost-total',
        x: 8,
        y: 2,
        w: 4,
        h: 3,
        props: {
          customWidgetDef: {
            id: 'cost-total',
            title: 'Total cost',
            kind: 'number',
            source: { method: 'metrics.cost.total', pathExpr: 'total', pollMs: 10000 },
            format: { prefix: '$', precision: 4 },
          },
        },
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// Template: Run health
// ---------------------------------------------------------------------------

const RUN_HEALTH_TEMPLATE: DashboardTemplate = {
  id: 'tpl-run-health',
  name: 'Run health',
  description: 'Overview of agent run success/failure rates with a live event feed.',
  layout: {
    id: 'dashboard-run-health',
    name: 'Run health',
    gridCols: 12,
    gridRowHeight: 80,
    widgets: [
      {
        id: wid('rh-stats'),
        kind: 'stats-summary',
        x: 0,
        y: 0,
        w: 12,
        h: 2,
      },
      {
        id: wid('rh-runs'),
        kind: 'recent-runs',
        x: 0,
        y: 2,
        w: 6,
        h: 3,
      },
      {
        id: wid('rh-feed'),
        kind: 'event-feed',
        x: 6,
        y: 2,
        w: 6,
        h: 3,
      },
      {
        id: wid('rh-custom-err'),
        kind: 'custom:error-rate',
        x: 0,
        y: 5,
        w: 4,
        h: 2,
        props: {
          customWidgetDef: {
            id: 'error-rate',
            title: 'Error rate',
            kind: 'gauge',
            source: {
              method: 'metrics.runs.error_rate',
              pathExpr: 'rate',
              pollMs: 15000,
            },
            format: { suffix: '%', precision: 1 },
          },
        },
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// Template: Latency dashboard
// ---------------------------------------------------------------------------

const LATENCY_TEMPLATE: DashboardTemplate = {
  id: 'tpl-latency',
  name: 'Latency dashboard',
  description: 'Track p50/p99 latency for your agent runs with sparklines.',
  layout: {
    id: 'dashboard-latency',
    name: 'Latency dashboard',
    gridCols: 12,
    gridRowHeight: 80,
    widgets: [
      {
        id: wid('lat-traces'),
        kind: 'traces-summary',
        x: 0,
        y: 0,
        w: 12,
        h: 2,
      },
      {
        id: wid('lat-custom-p50'),
        kind: 'custom:latency-p50',
        x: 0,
        y: 2,
        w: 6,
        h: 3,
        props: {
          customWidgetDef: {
            id: 'latency-p50',
            title: 'p50 latency',
            kind: 'sparkline',
            source: {
              method: 'metrics.latency.percentiles',
              pathExpr: 'p50',
              pollMs: 5000,
            },
            format: { suffix: 'ms', precision: 0 },
          },
        },
      },
      {
        id: wid('lat-custom-p99'),
        kind: 'custom:latency-p99',
        x: 6,
        y: 2,
        w: 6,
        h: 3,
        props: {
          customWidgetDef: {
            id: 'latency-p99',
            title: 'p99 latency',
            kind: 'gauge',
            source: {
              method: 'metrics.latency.percentiles',
              pathExpr: 'p99',
              pollMs: 5000,
            },
            format: { suffix: 'ms', precision: 0 },
          },
        },
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// Curated templates list
// ---------------------------------------------------------------------------

export const CURATED_TEMPLATES: readonly DashboardTemplate[] = [
  COST_WATCH_TEMPLATE,
  RUN_HEALTH_TEMPLATE,
  LATENCY_TEMPLATE,
] as const
