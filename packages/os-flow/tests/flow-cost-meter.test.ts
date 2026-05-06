import { describe, expect, it } from 'vitest'
import { cancelOnBudget, createFlowCostMeter } from '../src/flow-cost-meter.js'

describe('createFlowCostMeter (#199)', () => {
  it('emits cumulative totals on each record', () => {
    const meter = createFlowCostMeter({ system: 'anthropic', model: 'claude-opus-4-7' })
    const a = meter.record({ deltaUsd: 0.01, inputTokens: 100, outputTokens: 20, nodeId: 'n1' })
    expect(a.kind).toBe('cost.tick')
    expect(a.totalUsd).toBeCloseTo(0.01)
    expect(a.cumulativeInputTokens).toBe(100)
    expect(a.cumulativeOutputTokens).toBe(20)
    expect(a.nodeId).toBe('n1')

    const b = meter.record({ deltaUsd: 0.04, inputTokens: 150, outputTokens: 30 })
    expect(b.totalUsd).toBeCloseTo(0.05)
    expect(b.cumulativeInputTokens).toBe(250)
    expect(b.cumulativeOutputTokens).toBe(50)
    expect(b.deltaUsd).toBeCloseTo(0.04)
  })

  it('fires onBudgetExceeded exactly once when the budget is crossed', () => {
    const fires: number[] = []
    const meter = createFlowCostMeter({
      system: 'openai',
      model: 'gpt-4o',
      budgetUsd: 0.1,
      onBudgetExceeded: (e) => fires.push(e.totalUsd),
    })
    meter.record({ deltaUsd: 0.05 })
    expect(fires).toHaveLength(0)
    expect(meter.budgetExceeded()).toBe(false)

    meter.record({ deltaUsd: 0.06 })
    expect(fires).toHaveLength(1)
    expect(meter.budgetExceeded()).toBe(true)

    meter.record({ deltaUsd: 0.05 })
    expect(fires).toHaveLength(1)
  })

  it('snapshot returns the current totals with deltaUsd=0', () => {
    const meter = createFlowCostMeter({ system: 's', model: 'm' })
    meter.record({ deltaUsd: 0.02 })
    const snap = meter.snapshot()
    expect(snap.deltaUsd).toBe(0)
    expect(snap.totalUsd).toBeCloseTo(0.02)
  })

  it('cancelOnBudget aborts when the meter has already crossed the budget', () => {
    const ctrl = new AbortController()
    const meter = createFlowCostMeter({
      system: 's',
      model: 'm',
      budgetUsd: 0.01,
      onBudgetExceeded: () => ctrl.abort('budget'),
    })
    meter.record({ deltaUsd: 0.05 })
    expect(ctrl.signal.aborted).toBe(true)
    cancelOnBudget(meter, ctrl)
    expect(ctrl.signal.aborted).toBe(true)
  })

  it('treats non-finite deltas as zero', () => {
    const meter = createFlowCostMeter({ system: 's', model: 'm' })
    meter.record({ deltaUsd: Number.NaN })
    expect(meter.totalUsd()).toBe(0)
  })
})
