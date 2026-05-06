/**
 * Fork-from-trace types (M2 #178).
 *
 * Zod schemas for ForkDraft and its node/edge sub-types.
 * These are the editable "draft" shapes produced from observed trace spans
 * and sent to the sidecar `flows.create` method.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Node kinds matching span kinds
// ---------------------------------------------------------------------------

export const ForkNodeKindZ = z.enum(['agent', 'tool', 'condition', 'flow', 'human', 'unknown'])
export type ForkNodeKind = z.infer<typeof ForkNodeKindZ>

// ---------------------------------------------------------------------------
// Node draft
// ---------------------------------------------------------------------------

export const ForkNodeDraftZ = z.object({
  /** Unique node id (typically derived from the source spanId). */
  id: z.string().min(1),
  /** Node kind — controls which handler the sidecar attaches. */
  kind: ForkNodeKindZ,
  /**
   * Agent id to execute. Present when kind === 'agent'.
   * User can edit before saving.
   */
  agent: z.string().optional(),
  /**
   * Tool id to execute. Present when kind === 'tool'.
   * User can edit before saving.
   */
  tool: z.string().optional(),
  /** Human-readable display label. Defaults to span name. */
  label: z.string().optional(),
})
export type ForkNodeDraft = z.infer<typeof ForkNodeDraftZ>

// ---------------------------------------------------------------------------
// Edge draft
// ---------------------------------------------------------------------------

export const ForkEdgeDraftZ = z.object({
  /** Source node id. */
  source: z.string().min(1),
  /** Target node id. */
  target: z.string().min(1),
})
export type ForkEdgeDraft = z.infer<typeof ForkEdgeDraftZ>

// ---------------------------------------------------------------------------
// Fork draft (top-level form value)
// ---------------------------------------------------------------------------

export const ForkDraftZ = z.object({
  /** Human-readable flow name (editable). */
  name: z.string().min(1, 'Flow name is required'),
  /** Optional description. */
  description: z.string().optional(),
  /** Ordered list of nodes derived from span tree. */
  nodes: z.array(ForkNodeDraftZ),
  /** Edges derived from parent→child span relationships. */
  edges: z.array(ForkEdgeDraftZ),
})
export type ForkDraft = z.infer<typeof ForkDraftZ>

// ---------------------------------------------------------------------------
// Sidecar response for flows.create
// ---------------------------------------------------------------------------

export type FlowCreateResponse = {
  readonly flowId: string
}
