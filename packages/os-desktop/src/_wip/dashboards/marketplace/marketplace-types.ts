/**
 * Zod schemas and TypeScript types for the dashboard template marketplace.
 *
 * DashboardTemplate — a named, curated dashboard layout that users can apply
 *   to create a new dashboard pre-populated with widgets.
 */

import { z } from 'zod'
import { DashboardSchema } from '../types'

// ---------------------------------------------------------------------------
// DashboardTemplate
// ---------------------------------------------------------------------------

export const DashboardTemplateSchema = z.object({
  /** Unique template id */
  id: z.string().min(1),
  /** Human-readable template name */
  name: z.string().min(1),
  /** Short description of what this template tracks */
  description: z.string().min(1),
  /** Complete dashboard object to clone when the user applies this template */
  layout: DashboardSchema,
})

export type DashboardTemplate = z.infer<typeof DashboardTemplateSchema>
