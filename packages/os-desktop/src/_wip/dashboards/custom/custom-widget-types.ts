/**
 * Zod schemas and TypeScript types for user-defined custom dashboard widgets.
 *
 * CustomWidget — a widget the user configures via the editor, persisted to
 *   localStorage. It polls a sidecar JSON-RPC method and resolves the result
 *   with an optional path expression.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// CustomWidget
// ---------------------------------------------------------------------------

export const CustomWidgetKindSchema = z.enum(['number', 'sparkline', 'gauge', 'text'])
export type CustomWidgetKind = z.infer<typeof CustomWidgetKindSchema>

export const CustomWidgetSourceSchema = z.object({
  /** Sidecar JSON-RPC method to call, e.g. "metrics.cost.total" */
  method: z.string().min(1),
  /** Dot-path into the response object, e.g. "data.value" */
  pathExpr: z.string().optional(),
  /** Poll interval in milliseconds (default: 5000) */
  pollMs: z.number().int().min(100).optional(),
})

export type CustomWidgetSource = z.infer<typeof CustomWidgetSourceSchema>

export const CustomWidgetFormatSchema = z.object({
  /** String prepended to the displayed value, e.g. "$" */
  prefix: z.string().optional(),
  /** String appended to the displayed value, e.g. "ms" */
  suffix: z.string().optional(),
  /** Decimal precision for numeric kinds */
  precision: z.number().int().min(0).max(20).optional(),
})

export type CustomWidgetFormat = z.infer<typeof CustomWidgetFormatSchema>

export const CustomWidgetSchema = z.object({
  /** Unique widget id (UUID-like) */
  id: z.string().min(1),
  /** Human-readable title shown in the widget header */
  title: z.string().min(1),
  /** Visual display kind */
  kind: CustomWidgetKindSchema,
  /** Sidecar data source configuration */
  source: CustomWidgetSourceSchema,
  /** Optional display formatting */
  format: CustomWidgetFormatSchema.optional(),
})

export type CustomWidget = z.infer<typeof CustomWidgetSchema>
