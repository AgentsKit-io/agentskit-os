/**
 * Zod schemas and TypeScript types for plugin contributions.
 *
 * Two extension points (M2 #248 — UI scaffolding; plugin host TODO #91/M5):
 *   - dashboard-template  plugins contribute dashboard layouts
 *   - widget              plugins contribute custom widget definitions
 *
 * Both extend the base PluginContribution shape { id, pluginId, version }.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

export const PluginContribution = z.object({
  /** Unique identifier for this contribution within the plugin. */
  id: z.string().min(1),
  /** The plugin that registered this contribution. */
  pluginId: z.string().min(1),
  /** SemVer of the plugin that registered this contribution. */
  version: z
    .string()
    .regex(
      new RegExp(
        '^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$',
      ),
    ),
})
export type PluginContribution = z.infer<typeof PluginContribution>

// ---------------------------------------------------------------------------
// Dashboard contribution
// ---------------------------------------------------------------------------

export const PluginWidgetSlot = z.object({
  kind: z.string().min(1),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
})
export type PluginWidgetSlot = z.infer<typeof PluginWidgetSlot>

export const PluginDashboardLayout = z.object({
  /** Display name for the dashboard template. */
  name: z.string().min(1).max(128),
  /** Short description shown in the marketplace. */
  description: z.string().max(512).optional(),
  /** Number of grid columns (default 12). */
  gridCols: z.number().int().min(1).default(12),
  /** Grid row height in px (default 80). */
  gridRowHeight: z.number().int().min(10).default(80),
  /** Widget slots pre-positioned on the layout. */
  widgets: z.array(PluginWidgetSlot),
})
export type PluginDashboardLayout = z.infer<typeof PluginDashboardLayout>

export const PluginDashboardContribution = PluginContribution.extend({
  /** The dashboard layout contributed by the plugin. */
  layout: PluginDashboardLayout,
})
export type PluginDashboardContribution = z.infer<typeof PluginDashboardContribution>

// ---------------------------------------------------------------------------
// Widget contribution
// ---------------------------------------------------------------------------

export const PluginWidgetContribution = PluginContribution.extend({
  /** Widget kind identifier (unique across all plugins). */
  kind: z.string().min(1),
  /** Human-readable label for the widget picker. */
  label: z.string().min(1).max(128),
  /** Default [w, h] in grid units. */
  defaultSize: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
  /**
   * JSON Schema for the render props accepted by `plugins.widget.render`.
   * Stored as a plain object; validated by the plugin host at render time.
   */
  renderSchema: z.record(z.string(), z.unknown()).optional(),
})
export type PluginWidgetContribution = z.infer<typeof PluginWidgetContribution>
