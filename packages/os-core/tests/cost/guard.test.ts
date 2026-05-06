import { describe, expect, it } from 'vitest'
import { evaluateCostGuard, CostQuota } from '../../src/index.js'

describe('evaluateCostGuard (#107)', () => {
  it('allows when usage is below 80% utilization', () => {
    const v = evaluateCostGuard(
      { dailyUsd: 10, monthlyUsd: 100 },
      CostQuota.parse({ daily: 50, monthly: 1000 }),
    )
    expect(v.kind).toBe('allow')
    if (v.kind === 'allow') expect(v.nearestUtilization).toBeCloseTo(0.2)
  })

  it('warns at warnAt threshold', () => {
    const v = evaluateCostGuard(
      { dailyUsd: 45, monthlyUsd: 100 },
      CostQuota.parse({ daily: 50 }),
    )
    expect(v.kind).toBe('warn')
  })

  it('denies when any cap is exhausted', () => {
    const v = evaluateCostGuard(
      { dailyUsd: 51, monthlyUsd: 100 },
      CostQuota.parse({ daily: 50, monthly: 1000 }),
    )
    expect(v.kind).toBe('deny')
  })

  it('checks per-agent caps when supplied', () => {
    const v = evaluateCostGuard(
      { dailyUsd: 10, monthlyUsd: 50, perAgentUsd: { 'fix-bot': 9 } },
      CostQuota.parse({ daily: 100, perAgent: { 'fix-bot': 10 } }),
      { warnAt: 0.85 },
    )
    expect(v.kind).toBe('warn')
    if (v.kind === 'warn') expect(v.reason).toContain('fix-bot')
  })

  it('honours custom warnAt', () => {
    const v = evaluateCostGuard(
      { dailyUsd: 25, monthlyUsd: 0 },
      CostQuota.parse({ daily: 50 }),
      { warnAt: 0.4 },
    )
    expect(v.kind).toBe('warn')
  })
})
