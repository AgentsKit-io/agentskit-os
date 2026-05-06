// Per #199 — real-time cost stream + cancel hook.
// Pure: no I/O, no timers. Callers emit ticks into their event bus and
// trigger AbortController.abort() when the meter says the budget is exceeded.

import type { FlowCostTickEvent } from './flow-observability-events.js'

export type FlowCostMeterOpts = {
  readonly system: string
  readonly model: string
  /** Optional total budget in USD; once exceeded the meter trips. */
  readonly budgetUsd?: number
  /** Invoked the first time the budget is exceeded; useful for cancellation. */
  readonly onBudgetExceeded?: (event: FlowCostTickEvent) => void
}

export type FlowCostMeterUpdate = {
  readonly deltaUsd: number
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly nodeId?: string
}

export type FlowCostMeter = {
  readonly system: string
  readonly model: string
  readonly totalUsd: () => number
  readonly cumulativeInputTokens: () => number
  readonly cumulativeOutputTokens: () => number
  readonly budgetUsd: () => number | undefined
  readonly budgetExceeded: () => boolean
  readonly record: (update: FlowCostMeterUpdate) => FlowCostTickEvent
  readonly snapshot: () => FlowCostTickEvent
}

const numericOrZero = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

/**
 * Build a stateful cost meter for a single (system, model) stream.
 *
 * On every `record(update)`, emits a `FlowCostTickEvent` with cumulative totals
 * + the delta. When `budgetUsd` is set and the cumulative crosses it for the
 * first time, fires `onBudgetExceeded` exactly once so callers can `abort()`.
 */
export const createFlowCostMeter = (opts: FlowCostMeterOpts): FlowCostMeter => {
  let total = 0
  let inputTokens = 0
  let outputTokens = 0
  let exceededFired = false

  const buildEvent = (update: FlowCostMeterUpdate): FlowCostTickEvent => ({
    kind: 'cost.tick',
    totalUsd: total,
    deltaUsd: update.deltaUsd,
    cumulativeInputTokens: inputTokens,
    cumulativeOutputTokens: outputTokens,
    ...(update.inputTokens !== undefined ? { inputTokens: update.inputTokens } : {}),
    ...(update.outputTokens !== undefined ? { outputTokens: update.outputTokens } : {}),
    ...(update.nodeId !== undefined ? { nodeId: update.nodeId } : {}),
    system: opts.system,
    model: opts.model,
  })

  const isExceeded = (): boolean =>
    typeof opts.budgetUsd === 'number' && Number.isFinite(opts.budgetUsd) && total >= opts.budgetUsd

  const record = (update: FlowCostMeterUpdate): FlowCostTickEvent => {
    const delta = numericOrZero(update.deltaUsd)
    total += delta
    inputTokens += numericOrZero(update.inputTokens)
    outputTokens += numericOrZero(update.outputTokens)
    const event = buildEvent({ ...update, deltaUsd: delta })
    if (!exceededFired && isExceeded()) {
      exceededFired = true
      opts.onBudgetExceeded?.(event)
    }
    return event
  }

  const snapshot = (): FlowCostTickEvent =>
    buildEvent({ deltaUsd: 0 })

  return {
    system: opts.system,
    model: opts.model,
    totalUsd: () => total,
    cumulativeInputTokens: () => inputTokens,
    cumulativeOutputTokens: () => outputTokens,
    budgetUsd: () => opts.budgetUsd,
    budgetExceeded: () => exceededFired,
    record,
    snapshot,
  }
}

/**
 * Convenience: wire the meter to an `AbortController` so that crossing the
 * budget cancels the run. Returns the controller for caller use.
 */
export const cancelOnBudget = (meter: FlowCostMeter, controller: AbortController): AbortController => {
  // The meter calls onBudgetExceeded once. We can't retro-bind, so callers
  // pass `onBudgetExceeded: () => controller.abort('budget')` at construction.
  // This helper exists for symmetry / discoverability and to abort early
  // when the budget was already exceeded before binding.
  if (meter.budgetExceeded()) controller.abort()
  return controller
}
