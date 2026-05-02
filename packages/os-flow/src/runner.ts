// In-memory FlowConfig executor. Topo-ordered, run-mode aware.
// Pure async — durable storage hooked via checkpoint callback if provided.

import type { FlowConfig, FlowEdge, FlowNode, RunContext } from '@agentskit/os-core'
import type { NodeHandler, NodeHandlerMap, NodeOutcome } from './handlers.js'
import { auditGraph, buildAdjacency, topoSort } from './topo.js'

export type RunResult = {
  readonly status: 'completed' | 'failed' | 'paused' | 'skipped'
  readonly outcomes: ReadonlyMap<string, NodeOutcome>
  readonly executedOrder: readonly string[]
  readonly stoppedAt?: string
  readonly reason?: string
}

export type CheckpointFn = (
  nodeId: string,
  outcome: NodeOutcome,
  ctx: RunContext,
) => void | Promise<void>

export type RunOptions = {
  readonly handlers: NodeHandlerMap
  readonly ctx: RunContext
  readonly initialInput?: unknown
  readonly checkpoint?: CheckpointFn
  readonly onEvent?: (
    event:
      | { kind: 'node:start'; nodeId: string }
      | { kind: 'node:end'; nodeId: string; outcome: NodeOutcome },
  ) => void
}

const edgeMatches = (edge: FlowEdge, outcome: NodeOutcome): boolean => {
  switch (edge.on) {
    case 'always':
      return true
    case 'success':
      return outcome.kind === 'ok' || outcome.kind === 'skipped'
    case 'failure':
      return outcome.kind === 'failed'
    case 'true':
      return outcome.kind === 'ok' && outcome.value === true
    case 'false':
      return outcome.kind === 'ok' && outcome.value === false
  }
}

export const runFlow = async (flow: FlowConfig, opts: RunOptions): Promise<RunResult> => {
  const issues = auditGraph(flow)
  if (issues.length > 0) {
    return {
      status: 'failed',
      outcomes: new Map(),
      executedOrder: [],
      reason: `graph_audit: ${issues.map((i) => i.code).join(',')}`,
    }
  }

  const sorted = topoSort(flow)
  if (!sorted.ok) {
    return {
      status: 'failed',
      outcomes: new Map(),
      executedOrder: [],
      reason: `cycle: ${sorted.cycle.join(',')}`,
    }
  }

  const adj = buildAdjacency(flow.edges, flow.nodes.map((n) => n.id))
  const byId = new Map<string, FlowNode>(flow.nodes.map((n) => [n.id, n]))
  const outcomes = new Map<string, NodeOutcome>()
  const executed: string[] = []
  const enabled = new Set<string>([flow.entry])

  for (const id of sorted.order) {
    if (!enabled.has(id)) continue
    const node = byId.get(id)
    if (!node) continue

    opts.onEvent?.({ kind: 'node:start', nodeId: id })

    const handler = opts.handlers[node.kind] as NodeHandler | undefined
    let outcome: NodeOutcome
    if (!handler) {
      outcome = {
        kind: 'failed',
        error: { code: 'flow.handler_missing', message: `no handler registered for kind "${node.kind}"` },
      }
    } else {
      try {
        outcome = await handler(node as never, opts.initialInput, opts.ctx)
      } catch (err) {
        outcome = {
          kind: 'failed',
          error: {
            code: 'flow.handler_threw',
            message: (err as Error).message ?? String(err),
          },
        }
      }
    }

    outcomes.set(id, outcome)
    executed.push(id)

    if (opts.checkpoint) await opts.checkpoint(id, outcome, opts.ctx)
    opts.onEvent?.({ kind: 'node:end', nodeId: id, outcome })

    if (outcome.kind === 'failed') {
      return {
        status: 'failed',
        outcomes,
        executedOrder: executed,
        stoppedAt: id,
        reason: outcome.error.code,
      }
    }
    if (outcome.kind === 'paused') {
      return {
        status: 'paused',
        outcomes,
        executedOrder: executed,
        stoppedAt: id,
        reason: outcome.reason,
      }
    }

    for (const next of adj.get(id) ?? []) {
      if (edgeMatches({ from: id, to: next.to, on: next.on }, outcome)) {
        enabled.add(next.to)
      }
    }
  }

  const allSkipped = executed.length > 0 && executed.every((id) => outcomes.get(id)?.kind === 'skipped')
  return {
    status: allSkipped ? 'skipped' : 'completed',
    outcomes,
    executedOrder: executed,
  }
}
