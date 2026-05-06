/**
 * Zod schemas and TypeScript types for the multi-dashboard system.
 *
 * WidgetId         — opaque branded string
 * Widget           — a single positioned widget on a grid
 * Dashboard        — named collection of widgets + grid config
 * DashboardSet     — full persisted state (all dashboards + activeId)
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// WidgetId
// ---------------------------------------------------------------------------

export const WidgetIdSchema = z.string().min(1).brand('WidgetId')
export type WidgetId = z.infer<typeof WidgetIdSchema>

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------

export const WidgetSchema = z.object({
  id: WidgetIdSchema,
  kind: z.string().min(1),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
  props: z.record(z.string(), z.unknown()).optional(),
})

export type Widget = z.infer<typeof WidgetSchema>

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const DashboardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  widgets: z.array(WidgetSchema),
  gridCols: z.number().int().min(1).default(12),
  gridRowHeight: z.number().int().min(10).default(80),
})

export type Dashboard = z.infer<typeof DashboardSchema>

// ---------------------------------------------------------------------------
// DashboardSet
// ---------------------------------------------------------------------------

export const DashboardSetSchema = z.object({
  dashboards: z.array(DashboardSchema),
  activeId: z.string().min(1),
})

export type DashboardSet = z.infer<typeof DashboardSetSchema>
