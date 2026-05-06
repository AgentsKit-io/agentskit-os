import { describe, expect, it } from 'vitest'
import {
  AnomalyRuleSet,
  evaluateAnomalyRules,
  type AnomalySample,
} from '../../src/index.js'

const NOW = 1_700_000_000_000

describe('evaluateAnomalyRules (#215)', () => {
  it('fires gt rule when observed mean exceeds threshold', () => {
    const set = AnomalyRuleSet.parse({
      rules: [
        {
          id: 'cost-too-high',
          metric: 'cost_per_run',
          op: 'gt',
          threshold: 1,
          windowSeconds: 60,
          severity: 'critical',
        },
      ],
    })
    const samples: AnomalySample[] = [
      { metric: 'cost_per_run', value: 1.5, at: NOW - 1000 },
      { metric: 'cost_per_run', value: 2, at: NOW - 5000 },
    ]
    const alerts = evaluateAnomalyRules(set, samples, { clock: () => NOW })
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.ruleId).toBe('cost-too-high')
    expect(alerts[0]?.severity).toBe('critical')
  })

  it('detects a spike_x against the baseline window', () => {
    const set = AnomalyRuleSet.parse({
      rules: [
        {
          id: 'cost-spike',
          metric: 'cost_per_run',
          op: 'spike_x',
          threshold: 3,
          windowSeconds: 60,
          baselineSeconds: 600,
        },
      ],
    })
    const samples: AnomalySample[] = [
      // Recent window — high
      { metric: 'cost_per_run', value: 1.0, at: NOW - 1000 },
      { metric: 'cost_per_run', value: 1.2, at: NOW - 30_000 },
      // Baseline window — low
      { metric: 'cost_per_run', value: 0.1, at: NOW - 200_000 },
      { metric: 'cost_per_run', value: 0.2, at: NOW - 400_000 },
    ]
    const alerts = evaluateAnomalyRules(set, samples, { clock: () => NOW })
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.reason).toMatch(/ratio=/)
  })

  it('absent rule fires when no samples are in the window', () => {
    const set = AnomalyRuleSet.parse({
      rules: [
        {
          id: 'no-runs',
          metric: 'cost_per_run',
          op: 'absent',
          threshold: 0,
          windowSeconds: 30,
        },
      ],
    })
    const alerts = evaluateAnomalyRules(set, [], { clock: () => NOW })
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.ruleId).toBe('no-runs')
  })

  it('does not fire when inside threshold', () => {
    const set = AnomalyRuleSet.parse({
      rules: [
        {
          id: 'latency-ok',
          metric: 'latency_ms',
          op: 'gt',
          threshold: 250,
          windowSeconds: 60,
        },
      ],
    })
    const samples: AnomalySample[] = [
      { metric: 'latency_ms', value: 100, at: NOW - 1000 },
      { metric: 'latency_ms', value: 200, at: NOW - 5000 },
    ]
    const alerts = evaluateAnomalyRules(set, samples, { clock: () => NOW })
    expect(alerts).toEqual([])
  })

  it('parses rule sets and rejects unknown metrics', () => {
    const r = AnomalyRuleSet.safeParse({
      rules: [{ id: 'x', metric: 'bogus', op: 'gt', threshold: 1, windowSeconds: 60 }],
    })
    expect(r.success).toBe(false)
  })
})
