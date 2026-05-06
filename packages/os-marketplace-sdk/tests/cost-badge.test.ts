import { describe, expect, it } from 'vitest'
import { buildPluginCostBadge } from '../src/cost-badge.js'

describe('buildPluginCostBadge (#218)', () => {
  it('returns null when there are no runs', () => {
    expect(buildPluginCostBadge({ totalCostUsd: 0, runCount: 0 })).toBeNull()
  })

  it('returns free tier when avg is zero', () => {
    const b = buildPluginCostBadge({ totalCostUsd: 0, runCount: 5 })
    expect(b?.tier).toBe('free')
    expect(b?.label).toBe('Free / run')
  })

  it('rounds avg cost per run to 6 decimals and labels < $0.01', () => {
    const b = buildPluginCostBadge({ totalCostUsd: 0.04, runCount: 10 })
    expect(b?.avgCostPerRun).toBeCloseTo(0.004)
    expect(b?.label).toBe('< $0.01 / run')
    expect(b?.tier).toBe('cheap')
  })

  it('produces standard tier for sub-dollar runs', () => {
    const b = buildPluginCostBadge({ totalCostUsd: 1.3, runCount: 10 })
    expect(b?.tier).toBe('standard')
    expect(b?.label).toBe('$0.130 / run')
  })

  it('produces expensive tier when avg ≥ $0.50', () => {
    const b = buildPluginCostBadge({ totalCostUsd: 50, runCount: 10 })
    expect(b?.tier).toBe('expensive')
    expect(b?.label).toBe('$5.00 / run')
  })

  it('threads window through to the badge', () => {
    const b = buildPluginCostBadge({ totalCostUsd: 1, runCount: 10, window: 'trailing-30d' })
    expect(b?.window).toBe('trailing-30d')
  })

  it('rejects non-finite inputs', () => {
    expect(buildPluginCostBadge({ totalCostUsd: NaN, runCount: 10 })).toBeNull()
    expect(buildPluginCostBadge({ totalCostUsd: 1, runCount: Infinity })).toBeNull()
  })
})
