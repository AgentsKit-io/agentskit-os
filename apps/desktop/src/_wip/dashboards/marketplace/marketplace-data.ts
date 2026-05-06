/**
 * Built-in dashboard marketplace templates.
 *
 * Pure data — no React, no hooks.
 * Plugin-contributed templates are integrated at the panel layer
 * (marketplace-panel.tsx) via usePluginContributions().
 *
 * Each template describes a named layout with pre-positioned widget slots.
 */

export type MarketplaceWidgetSlot = {
  readonly kind: string
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export type MarketplaceTemplate = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly gridCols: number
  readonly gridRowHeight: number
  readonly widgets: readonly MarketplaceWidgetSlot[]
}

export const BUILT_IN_TEMPLATES: readonly MarketplaceTemplate[] = [
  {
    id: 'overview',
    name: 'Overview',
    description: 'Stats, recent runs, and live event feed at a glance.',
    gridCols: 12,
    gridRowHeight: 80,
    widgets: [
      { kind: 'stats-summary', x: 0, y: 0, w: 12, h: 2 },
      { kind: 'recent-runs', x: 0, y: 2, w: 12, h: 3 },
      { kind: 'event-feed', x: 0, y: 5, w: 12, h: 3 },
    ],
  },
  {
    id: 'cost-focus',
    name: 'Cost Focus',
    description: 'Cost chart and notifications for budget-conscious teams.',
    gridCols: 12,
    gridRowHeight: 80,
    widgets: [
      { kind: 'cost-chart', x: 0, y: 0, w: 8, h: 3 },
      { kind: 'notifications-summary', x: 8, y: 0, w: 4, h: 2 },
      { kind: 'stats-summary', x: 0, y: 3, w: 12, h: 2 },
    ],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Just the essentials — stats and traces.',
    gridCols: 12,
    gridRowHeight: 80,
    widgets: [
      { kind: 'stats-summary', x: 0, y: 0, w: 12, h: 2 },
      { kind: 'traces-summary', x: 0, y: 2, w: 6, h: 2 },
    ],
  },
]
