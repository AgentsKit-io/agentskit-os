// Durable execution per RFC-0002 / ADR-0009. CheckpointStore contract +
// in-memory reference impl + resumeFlow that respects prior progress.
// Real backends (sqlite, redis, postgres) implement CheckpointStore.

import type { FlowConfig, RunContext } from '@agentskit/os-core'
import type { NodeOutcome, NodeHandlerMap, NodeHandler } from './handlers.js'
import { auditGraph, buildAdjacency, topoSort } from './topo.js'
import { edgeMatches } from './edge-matches.js'

export type CheckpointRecord = {
  readonly runId: string
  readonly nodeId: string
  readonly outcome: NodeOutcome
  readonly recordedAt: string
}

export interface CheckpointStore {
  append(record: CheckpointRecord): Promise<void>
  load(runId: string): Promise<readonly CheckpointRecord[]>
  clear(runId: string): Promise<void>
}

export class InMemoryCheckpointStore implements CheckpointStore {
  private byRun = new Map<string, CheckpointRecord[]>()

  async append(record: CheckpointRecord): Promise<void> {
    const list = this.byRun.get(record.runId) ?? []
    list.push(record)
    this.byRun.set(record.runId, list)
  }

  async load(runId: string): Promise<readonly CheckpointRecord[]> {
    return this.byRun.get(runId) ?? []
  }

  async clear(runId: string): Promise<void> {
    this.byRun.delete(runId)
  }

  async listRuns(): Promise<readonly string[]> {
    return [...this.byRun.keys()]
  }
}

export type DurableRunResult = {
  readonly status: 'completed' | 'failed' | 'paused' | 'skipped'
  readonly outcomes: ReadonlyMap<string, NodeOutcome>
  readonly executedOrder: readonly string[]
  readonly resumedFrom: readonly string[]
  readonly stoppedAt?: string
  readonly reason?: string
}

export type ResumeOptions = {
  readonly handlers: NodeHandlerMap
  readonly ctx: RunContext
  readonly store: CheckpointStore
  readonly initialInput?: unknown
  readonly onEvent?: (
    event:
      | { kind: 'node:start'; nodeId: string }
      | { kind: 'node:end'; nodeId: string; outcome: NodeOutcome }
      | { kind: 'node:resumed'; nodeId: string; outcome: NodeOutcome },
  ) => void
}

const isResumable = (outcome: NodeOutcome): boolean => outcome.kind === 'ok' || outcome.kind === 'skipped'

export const resumeFlow = async (
  flow: FlowConfig,
  opts: ResumeOptions,
): Promise<DurableRunResult> => {
  const issues = auditGraph(flow)
  if (issues.length > 0) {
    return {
      status: 'failed',
      outcomes: new Map(),
      executedOrder: [],
      resumedFrom: [],
      reason: `graph_audit: ${issues.map((i) => i.code).join(',')}`,
    }
  }

  const sorted = topoSort(flow)
  if (!sorted.ok) {
    return {
      status: 'failed',
      outcomes: new Map(),
      executedOrder: [],
      resumedFrom: [],
      reason: `cycle: ${sorted.cycle.join(',')}`,
    }
  }

  const adj = buildAdjacency(flow.edges, flow.nodes.map((n) => n.id))
  const byId = new Map(flow.nodes.map((n) => [n.id, n]))
  const outcomes = new Map<string, NodeOutcome>()
  const executed: string[] = []

  // Replay prior checkpoints — only resumable outcomes count for resume.
  const prior = await opts.store.load(opts.ctx.runId)
  const resumedFrom: string[] = []
  for (const rec of prior) {
    if (!isResumable(rec.outcome)) break
    outcomes.set(rec.nodeId, rec.outcome)
    resumedFrom.push(rec.nodeId)
    opts.onEvent?.({ kind: 'node:resumed', nodeId: rec.nodeId, outcome: rec.outcome })
  }

  // Compute initial enabled set: entry + targets reachable from already-completed nodes.
  const enabled = new Set<string>()
  if (resumedFrom.length === 0) {
    enabled.add(flow.entry)
  } else {
    for (const nodeId of resumedFrom) {
      const out = outcomes.get(nodeId)
      if (!out) continue
      for (const next of adj.get(nodeId) ?? []) {
        if (edgeMatches(next.on, out)) enabled.add(next.to)
      }
    }
    // Filter out already-completed
    for (const id of resumedFrom) enabled.delete(id)
  }

  for (const id of sorted.order) {
    if (outcomes.has(id)) continue
    if (!enabled.has(id)) continue
    const node = byId.get(id)
    if (!node) continue

    opts.onEvent?.({ kind: 'node:start', nodeId: id })

    const handler = opts.handlers[node.kind] as NodeHandler | undefined
    let outcome: NodeOutcome
    if (!handler) {
      outcome = {
        kind: 'failed',
        error: { code: 'flow.handler_missing', message: `no handler for kind "${node.kind}"` },
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

    await opts.store.append({
      runId: opts.ctx.runId,
      nodeId: id,
      outcome,
      recordedAt: new Date().toISOString(),
    })
    opts.onEvent?.({ kind: 'node:end', nodeId: id, outcome })

    if (outcome.kind === 'failed') {
      return {
        status: 'failed',
        outcomes,
        executedOrder: executed,
        resumedFrom,
        stoppedAt: id,
        reason: outcome.error.code,
      }
    }
    if (outcome.kind === 'paused') {
      return {
        status: 'paused',
        outcomes,
        executedOrder: executed,
        resumedFrom,
        stoppedAt: id,
        reason: outcome.reason,
      }
    }

    for (const next of adj.get(id) ?? []) {
      if (edgeMatches(next.on, outcome)) enabled.add(next.to)
    }
  }

  const everyExecutedSkipped =
    executed.length > 0 && executed.every((id) => outcomes.get(id)?.kind === 'skipped')
  let status: 'completed' | 'skipped' = 'completed'
  if (executed.length > 0 && everyExecutedSkipped) status = 'skipped'
  return {
    status,
    outcomes,
    executedOrder: executed,
    resumedFrom,
  }
}
