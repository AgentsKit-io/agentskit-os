import { describe, expect, it } from 'vitest'
import { entitlementsFor, evaluatePlanUsage } from '../../src/index.js'

describe('plan entitlements (#123)', () => {
  it('free tier caps agents at 5 and disables cloud sync', () => {
    const e = entitlementsFor('free')
    expect(e.maxAgents).toBe(5)
    expect(e.cloudSync).toBe(false)
  })

  it('pro tier enables cloud sync + hosted triggers', () => {
    const e = entitlementsFor('pro')
    expect(e.cloudSync).toBe(true)
    expect(e.hostedTriggers).toBe(true)
    expect(e.enterpriseSso).toBe(false)
  })

  it('enterprise tier has unlimited caps', () => {
    const e = entitlementsFor('enterprise')
    expect(e.maxAgents).toBe(Number.POSITIVE_INFINITY)
    expect(e.enterpriseSso).toBe(true)
  })

  it('self-hosted tier inherits enterprise + adds airgap', () => {
    const e = entitlementsFor('self-hosted')
    expect(e.airGapDeployment).toBe(true)
  })

  it('evaluatePlanUsage flags maxAgents on free tier', () => {
    const v = evaluatePlanUsage('free', {
      agentCount: 6,
      flowCount: 1,
      seatCount: 1,
      runsThisMonth: 10,
    })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.reasons[0]?.key).toBe('maxAgents')
  })

  it('evaluatePlanUsage passes when under every cap', () => {
    const v = evaluatePlanUsage('pro', {
      agentCount: 4,
      flowCount: 4,
      seatCount: 1,
      runsThisMonth: 100,
    })
    expect(v.ok).toBe(true)
  })
})
