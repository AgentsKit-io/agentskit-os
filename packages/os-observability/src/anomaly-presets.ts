// Per #108 — anomaly detection preset library wiring #215 rules.
// Pure: built-in AnomalyRule presets dogfood teams use as a starting point.

import type { AnomalyRule } from '@agentskit/os-core'

export const ANOMALY_PRESET_IDS = [
  'cost.spike',
  'cost.budget_breach',
  'tool.calls.rate_spike',
  'error.rate.high',
] as const
export type AnomalyPresetId = (typeof ANOMALY_PRESET_IDS)[number]

const COST_SPIKE: AnomalyRule = {
  id: 'cost.spike',
  description: 'Cost-per-run is 3x the rolling baseline.',
  metric: 'cost_per_run',
  op: 'spike_x',
  threshold: 3,
  windowSeconds: 300,
  baselineSeconds: 3_600,
  severity: 'warning',
  tags: ['cost'],
}

const COST_BUDGET_BREACH: AnomalyRule = {
  id: 'cost.budget_breach',
  description: 'Cumulative cost in the last hour exceeds $10.',
  metric: 'cost_total',
  op: 'gt',
  threshold: 10,
  windowSeconds: 3_600,
  severity: 'critical',
  tags: ['cost'],
}

const TOOL_CALL_RATE_SPIKE: AnomalyRule = {
  id: 'tool.calls.rate_spike',
  description: 'Tool calls per minute exceed 120 — possible runaway loop.',
  metric: 'tool_calls_per_minute',
  op: 'gt',
  threshold: 120,
  windowSeconds: 60,
  severity: 'warning',
  tags: ['tools', 'rate-limit'],
}

const ERROR_RATE_HIGH: AnomalyRule = {
  id: 'error.rate.high',
  description: 'Error rate above 10% over the last 5 minutes.',
  metric: 'error_rate',
  op: 'gte',
  threshold: 0.1,
  windowSeconds: 300,
  severity: 'critical',
  tags: ['errors'],
}

const BY_ID: Readonly<Record<AnomalyPresetId, AnomalyRule>> = {
  'cost.spike': COST_SPIKE,
  'cost.budget_breach': COST_BUDGET_BREACH,
  'tool.calls.rate_spike': TOOL_CALL_RATE_SPIKE,
  'error.rate.high': ERROR_RATE_HIGH,
}

export const BUILTIN_ANOMALY_RULES: ReadonlyArray<AnomalyRule> = [
  COST_SPIKE,
  COST_BUDGET_BREACH,
  TOOL_CALL_RATE_SPIKE,
  ERROR_RATE_HIGH,
]

export const getAnomalyPreset = (id: AnomalyPresetId): AnomalyRule => BY_ID[id]

/**
 * Convenience: build the default preset rule set the dogfood pipeline mounts
 * out of the box (#108). Callers compose extra rules via `[...BUILTIN_ANOMALY_RULES, ...custom]`.
 */
export const defaultAnomalyRuleSet = (): { readonly rules: readonly AnomalyRule[] } => ({
  rules: [...BUILTIN_ANOMALY_RULES],
})
