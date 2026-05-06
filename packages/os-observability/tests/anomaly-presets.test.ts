import { describe, expect, it } from 'vitest'
import { evaluateAnomalyRules, AnomalyRuleSet } from '@agentskit/os-core'
import {
  ANOMALY_PRESET_IDS,
  BUILTIN_ANOMALY_RULES,
  defaultAnomalyRuleSet,
} from '../src/anomaly-presets.js'

const NOW = 1_700_000_000_000

describe('anomaly presets (#108)', () => {
  it('exposes the documented preset ids', () => {
    expect([...ANOMALY_PRESET_IDS].sort()).toEqual([
      'cost.budget_breach',
      'cost.spike',
      'error.rate.high',
      'tool.calls.rate_spike',
    ])
  })

  it('every preset parses through AnomalyRuleSet schema', () => {
    expect(() => AnomalyRuleSet.parse({ rules: BUILTIN_ANOMALY_RULES })).not.toThrow()
  })

  it('default ruleset detects a tool-call rate spike', () => {
    const set = AnomalyRuleSet.parse(defaultAnomalyRuleSet())
    const samples = [
      { metric: 'tool_calls_per_minute' as const, value: 500, at: NOW - 1000 },
    ]
    const alerts = evaluateAnomalyRules(set, samples, { clock: () => NOW })
    expect(alerts.find((a) => a.ruleId === 'tool.calls.rate_spike')).toBeDefined()
  })

  it('default ruleset fires error.rate.high when error rate ≥ 10%', () => {
    const set = AnomalyRuleSet.parse(defaultAnomalyRuleSet())
    const samples = [
      { metric: 'error_rate' as const, value: 0.2, at: NOW - 1000 },
    ]
    const alerts = evaluateAnomalyRules(set, samples, { clock: () => NOW })
    const er = alerts.find((a) => a.ruleId === 'error.rate.high')
    expect(er?.severity).toBe('critical')
  })
})
