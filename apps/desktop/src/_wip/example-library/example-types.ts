/**
 * Example library — Zod schema and TypeScript types.
 *
 * An Example is a curated starter scenario indexed by user intent.
 * Each entry links to a template from @agentskit/os-templates (or null
 * for "coming soon" items) and carries display metadata.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const ExampleSchema = z.object({
  /** Unique slug, e.g. "triage-support-tickets-basic". */
  id: z.string().min(1),

  /**
   * The user-facing intent phrase shown as a category badge.
   * One of the canonical intent labels from the example library.
   */
  intent: z.string().min(1),

  /** Short human-readable title. */
  title: z.string().min(1),

  /** One-to-three sentence description of what the example does. */
  description: z.string().min(1),

  /**
   * ID of the linked template in @agentskit/os-templates.
   * Null means the template is not yet published ("coming soon").
   */
  templateId: z.string().nullable(),

  /** Searchable keyword tags. */
  tags: z.array(z.string()),

  /** Estimated cost per single run in USD. Optional. */
  estCostUsd: z.number().nonnegative().optional(),

  /** Estimated token consumption per run. Optional. */
  estTokens: z.number().int().nonnegative().optional(),

  /** Link to an interactive demo (hosted or video). Optional. */
  demoUrl: z.string().url().optional(),
})

export type Example = z.infer<typeof ExampleSchema>
