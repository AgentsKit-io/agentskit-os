/**
 * Assistant types — Zod schemas and TypeScript types for the inline LLM
 * prompt assistant (M2, issue #179).
 *
 * `AssistantTarget` describes the element that the overlay is anchored to.
 * `AssistantSuggestion` holds a single streaming / completed response.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// AssistantTarget
// ---------------------------------------------------------------------------

export const AssistantTargetSchema = z.object({
  /** Matches `data-assist-target` attribute on the DOM element. */
  id: z.string(),
  /** Semantic kind — used by the sidecar to select the right prompt template. */
  kind: z.enum(['agent', 'flow-node', 'trace-span', 'config-field']),
  /** Optional structured context forwarded to the sidecar with the prompt. */
  context: z.record(z.string(), z.unknown()).optional(),
})

export type AssistantTarget = z.infer<typeof AssistantTargetSchema>

// ---------------------------------------------------------------------------
// AssistantSuggestion
// ---------------------------------------------------------------------------

export const AssistantSuggestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  response: z.string(),
  status: z.enum(['streaming', 'complete', 'error']),
  createdAt: z.string(), // ISO-8601
})

export type AssistantSuggestion = z.infer<typeof AssistantSuggestionSchema>
