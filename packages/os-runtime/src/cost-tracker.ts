// Per-run cost tracking. Wraps LlmAdapter to capture cost reports;
// accumulates per-run + per-node totals. Pure logic, no I/O.

import type { CostMeter, Currency, RunContext } from '@agentskit/os-core'
import { computeCost } from '@agentskit/os-core/cost/cost-meter'
import type { LlmAdapter, LlmCall, LlmResult } from './adapters.js'

export type CostEntry = {
  readonly nodeId?: string
  readonly system: string
  readonly model: string
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly costUsd: number
  readonly recordedAt: string
}

export type RunCost = {
  readonly runId: string
  readonly totalUsd: number
  readonly entries: readonly CostEntry[]
}

export class CostTracker {
  private readonly entries = new Map<string, CostEntry[]>()
  private readonly clock: () => Date

  constructor(opts: { clock?: () => Date } = {}) {
    this.clock = opts.clock ?? (() => new Date())
  }

  record(runId: string, entry: Omit<CostEntry, 'recordedAt'>): void {
    const list = this.entries.get(runId) ?? []
    list.push({ ...entry, recordedAt: this.clock().toISOString() })
    this.entries.set(runId, list)
  }

  forRun(runId: string): RunCost {
    const list = this.entries.get(runId) ?? []
    const totalUsd = list.reduce((sum, e) => sum + e.costUsd, 0)
    return { runId, totalUsd, entries: list }
  }

  clear(runId: string): void {
    this.entries.delete(runId)
  }

  totals(): ReadonlyMap<string, number> {
    const out = new Map<string, number>()
    for (const [runId, list] of this.entries) {
      out.set(runId, list.reduce((sum, e) => sum + e.costUsd, 0))
    }
    return out
  }
}

export type MeterAdapterOptions = {
  readonly tracker: CostTracker
  readonly meter?: CostMeter
  readonly currentNodeId?: () => string | undefined
  /**
   * Called after each recorded cost entry (same run). Used for live
   * observability streams (ADR-0005 `cost.tick`).
   */
  readonly onAfterRecord?: (args: {
    readonly ctx: RunContext
    readonly entry: CostEntry
    readonly runCost: RunCost
  }) => void
}

// Wraps an LlmAdapter so every invoke() reports cost into the tracker.
// If LlmResult.costUsd is provided, it's used directly; else CostMeter
// looks up pricing by (provider, model) and computes from token usage.
export const meteredLlmAdapter = (
  inner: LlmAdapter,
  opts: MeterAdapterOptions,
): LlmAdapter => ({
  id: inner.id,
  invoke: async (call: LlmCall, ctx: RunContext): Promise<LlmResult> => {
    const result = await inner.invoke(call, ctx)
    let costUsd = result.costUsd
    if (costUsd === undefined && opts.meter) {
      const breakdown = opts.meter.meter(
        { provider: call.system, model: call.model },
        {
          ...(result.inputTokens !== undefined ? { inputTokens: result.inputTokens } : {}),
          ...(result.outputTokens !== undefined ? { outputTokens: result.outputTokens } : {}),
        },
      )
      costUsd = breakdown?.total ?? 0
    }
    if (costUsd !== undefined) {
      const entry: Omit<CostEntry, 'recordedAt'> = {
        system: call.system,
        model: call.model,
        costUsd,
      }
      const nodeId = opts.currentNodeId?.()
      if (nodeId !== undefined) (entry as { nodeId?: string }).nodeId = nodeId
      if (result.inputTokens !== undefined) (entry as { inputTokens?: number }).inputTokens = result.inputTokens
      if (result.outputTokens !== undefined) (entry as { outputTokens?: number }).outputTokens = result.outputTokens
      opts.tracker.record(ctx.runId, entry)
      const runCost = opts.tracker.forRun(ctx.runId)
      const last = runCost.entries.at(-1)
      if (last !== undefined) opts.onAfterRecord?.({ ctx, entry: last, runCost })
    }
    return result
  },
})

// Build per-currency totals across a run. Currency is informational —
// CostMeter handles conversion at lookup time. This helper assumes USD.
export const summarizeRun = (cost: RunCost, currency: Currency = 'USD'): {
  currency: Currency
  totalUsd: number
  byNode: ReadonlyMap<string, number>
  byModel: ReadonlyMap<string, number>
} => {
  const byNode = new Map<string, number>()
  const byModel = new Map<string, number>()
  for (const e of cost.entries) {
    if (e.nodeId !== undefined) {
      byNode.set(e.nodeId, (byNode.get(e.nodeId) ?? 0) + e.costUsd)
    }
    const modelKey = `${e.system}:${e.model}`
    byModel.set(modelKey, (byModel.get(modelKey) ?? 0) + e.costUsd)
  }
  return { currency, totalUsd: cost.totalUsd, byNode, byModel }
}

// Re-export computeCost for convenience.
export { computeCost }
