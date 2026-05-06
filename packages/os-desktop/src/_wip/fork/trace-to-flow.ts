/**
 * trace-to-flow — pure conversion from observed trace spans to a ForkDraft.
 *
 * Walks the span tree, emits one node per span, and builds edges from the
 * parent→child relationships expressed in `parentSpanId`.
 *
 * Rules:
 *   - Span kind maps directly to ForkNodeKind.
 *   - For agent spans, reads `agentskitos.agent_id` attribute as `agent`.
 *   - For tool spans, reads `agentskitos.node_id` attribute as `tool`.
 *   - For parallel branches (multiple spans sharing a parent) multiple edges
 *     fan out from the same source node.
 *   - The flow name defaults to `<flowId> fork` derived from the root span
 *     attribute `agentskitos.flow_id`, falling back to the traceId.
 *   - Node ids use the spanId directly for stable references.
 */

import type { Span, SpanKind } from '../screens/traces/use-traces'
import type { ForkDraft, ForkNodeDraft, ForkEdgeDraft, ForkNodeKind } from './fork-types'
import { ForkDraftZ } from './fork-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapSpanKind(kind: SpanKind): ForkNodeKind {
  switch (kind) {
    case 'agent':
      return 'agent'
    case 'tool':
      return 'tool'
    case 'flow':
      return 'flow'
    case 'human':
      return 'human'
    case 'unknown':
      return 'unknown'
    default: {
      const _exhaustive: never = kind
      void _exhaustive
      return 'unknown'
    }
  }
}

function resolveAgent(span: Span): string | undefined {
  const val = span.attributes['agentskitos.agent_id']
  return typeof val === 'string' ? val : undefined
}

function resolveTool(span: Span): string | undefined {
  const val = span.attributes['agentskitos.node_id']
  return typeof val === 'string' ? val : undefined
}

function resolveFlowName(spans: readonly Span[]): string {
  const root = spans.find((s) => s.parentSpanId === undefined)
  if (!root) {
    const traceId = spans[0]?.traceId ?? 'trace'
    return `${traceId} fork`
  }
  const flowId = root.attributes['agentskitos.flow_id']
  if (typeof flowId === 'string' && flowId.length > 0) {
    return `${flowId} fork`
  }
  return `${root.traceId} fork`
}

function spanToNode(span: Span): ForkNodeDraft {
  const kind = mapSpanKind(span.kind)
  const node: ForkNodeDraft = {
    id: span.spanId,
    kind,
    label: span.name,
  }

  const agent = resolveAgent(span)
  if (agent !== undefined) {
    return { ...node, agent }
  }

  const tool = resolveTool(span)
  if (tool !== undefined) {
    return { ...node, tool }
  }

  return node
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Converts a flat array of trace spans into a ForkDraft.
 *
 * The conversion is purely structural — it does NOT call into any I/O or
 * sidecar. All edge cases (empty spans, disconnected spans, parallel
 * branches) are handled gracefully.
 */
export function traceToFlowDraft(spans: readonly Span[]): ForkDraft {
  if (spans.length === 0) {
    return ForkDraftZ.parse({
      name: 'empty fork',
      nodes: [],
      edges: [],
    })
  }

  // Build node list — one node per span, order preserved (BFS-ish, parent before child).
  // Sort so that spans with no parent come first, then by startedAt for stability.
  const sorted = [...spans].sort((a, b) => {
    // roots first
    const aIsRoot = a.parentSpanId === undefined ? 0 : 1
    const bIsRoot = b.parentSpanId === undefined ? 0 : 1
    if (aIsRoot !== bIsRoot) return aIsRoot - bIsRoot
    return a.startedAt.localeCompare(b.startedAt)
  })

  const nodes: ForkNodeDraft[] = sorted.map(spanToNode)

  // Build edges from parentSpanId relationships.
  const edges: ForkEdgeDraft[] = []
  const spanIds = new Set(spans.map((s) => s.spanId))

  for (const span of spans) {
    if (span.parentSpanId !== undefined && spanIds.has(span.parentSpanId)) {
      edges.push({ source: span.parentSpanId, target: span.spanId })
    }
  }

  const name = resolveFlowName(spans)

  return ForkDraftZ.parse({ name, nodes, edges })
}
