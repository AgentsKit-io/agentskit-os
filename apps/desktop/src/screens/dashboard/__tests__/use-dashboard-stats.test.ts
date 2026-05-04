import { describe, expect, it } from 'vitest'
import { normalizeDashboardStats } from '../use-dashboard-stats'

describe('normalizeDashboardStats', () => {
  it('fills missing sidecar stats with zeroes', () => {
    expect(normalizeDashboardStats({})).toEqual({
      totalRuns24h: 0,
      liveCostUsd: 0,
      avgLatencyMs: 0,
      errorRatePct: 0,
    })
  })

  it('keeps finite numeric sidecar stats', () => {
    expect(
      normalizeDashboardStats({
        totalRuns24h: 12,
        liveCostUsd: 0.42,
        avgLatencyMs: 155.5,
        errorRatePct: 3.2,
      }),
    ).toEqual({
      totalRuns24h: 12,
      liveCostUsd: 0.42,
      avgLatencyMs: 155.5,
      errorRatePct: 3.2,
    })
  })
})
