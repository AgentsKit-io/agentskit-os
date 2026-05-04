import { describe, expect, it } from 'vitest'
import {
  decideThrottle,
  parseCostMeasurement,
  parseThrottleConfig,
} from '../../src/runtime/cost-throttle.js'

const cfg = (overrides: Record<string, unknown> = {}) => parseThrottleConfig({
  perFlow: { usdMax: 10 },
  perNode: { usdMax: 2 },
  perTool: { usdMax: 0.5 },
  preferDowngrade: true,
  preferQueue: false,
  ...overrides,
})

const meas = (overrides: Record<string, unknown> = {}) => parseCostMeasurement({
  scope: 'tool',
  estimatedUsd: 0.1,
  flowSpentUsd: 0,
  nodeSpentUsd: 0,
  fallbackAvailable: false,
  schedulerAvailable: false,
  force: false,
  ...overrides,
})

describe('decideThrottle', () => {
  it('allows when within all ceilings', () => {
    expect(decideThrottle(cfg(), meas()).action).toBe('allow')
  })

  it('rejects on per-flow breach (hard cap)', () => {
    const d = decideThrottle(cfg(), meas({ flowSpentUsd: 9.5, estimatedUsd: 1 }))
    expect(d.action).toBe('reject')
    expect(d.breachedBudget).toBe('flow')
  })

  it('downgrades on per-tool breach when fallback available', () => {
    const d = decideThrottle(cfg(), meas({ estimatedUsd: 1, fallbackAvailable: true }))
    expect(d.action).toBe('downgrade')
    expect(d.breachedBudget).toBe('tool')
  })

  it('queues on per-node breach when scheduler available + queue preferred', () => {
    const d = decideThrottle(
      cfg({ preferDowngrade: false, preferQueue: true }),
      meas({ scope: 'node', estimatedUsd: 3, schedulerAvailable: true }),
    )
    expect(d.action).toBe('queue')
    expect(d.breachedBudget).toBe('node')
  })

  it('rejects when neither fallback nor scheduler available', () => {
    const d = decideThrottle(cfg(), meas({ estimatedUsd: 1 }))
    expect(d.action).toBe('reject')
  })

  it('--force flag bypasses with audit reason', () => {
    const d = decideThrottle(cfg(), meas({ estimatedUsd: 100, force: true }))
    expect(d.action).toBe('allow')
    expect(d.bypass).toBe('force')
  })

  it('agent allowlist bypass works', () => {
    const d = decideThrottle(
      cfg({ bypassAgentIds: ['vip-bot'] }),
      meas({ estimatedUsd: 100, agentId: 'vip-bot' }),
    )
    expect(d.action).toBe('allow')
    expect(d.bypass).toBe('agent_allowlist')
  })

  it('capability token bypass works', () => {
    const d = decideThrottle(
      cfg({ bypassCapabilityTokens: ['cap-abc'] }),
      meas({ estimatedUsd: 100, capabilityToken: 'cap-abc' }),
    )
    expect(d.action).toBe('allow')
    expect(d.bypass).toBe('capability_token')
  })

  it('flow ceiling cannot be bypassed by downgrade', () => {
    const d = decideThrottle(
      cfg(),
      meas({ flowSpentUsd: 9.9, estimatedUsd: 0.5, fallbackAvailable: true }),
    )
    expect(d.action).toBe('reject')
    expect(d.breachedBudget).toBe('flow')
  })

  it('respects token budget on per-flow', () => {
    const c = parseThrottleConfig({ perFlow: { usdMax: 100, tokensMax: 1000 } })
    const d = decideThrottle(
      c,
      meas({ scope: 'flow', estimatedUsd: 0.01, estimatedTokens: 1500, flowSpentUsd: 0 }),
    )
    expect(d.action).toBe('reject')
  })
})
