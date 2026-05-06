// Per #215 — declarative anomaly detection rules grammar.
// Schema + pure evaluator. Caller feeds windowed samples; evaluator emits
// per-rule alerts the runtime can route to inbox / pager / log.

import { z } from 'zod'

export const AnomalyMetric = z.enum([
  'cost_per_run',
  'tokens_per_run',
  'latency_ms',
  'error_rate',
  'tool_calls_per_minute',
  'cost_total',
])
export type AnomalyMetric = z.infer<typeof AnomalyMetric>

export const AnomalyOp = z.enum([
  'gt',
  'gte',
  'lt',
  'lte',
  'spike_x',
  'drop_x',
  'absent',
])
export type AnomalyOp = z.infer<typeof AnomalyOp>

export const AnomalySeverity = z.enum(['info', 'warning', 'critical'])
export type AnomalySeverity = z.infer<typeof AnomalySeverity>

export const AnomalyRule = z.object({
  id: z.string().min(1).max(128),
  description: z.string().max(512).default(''),
  metric: AnomalyMetric,
  op: AnomalyOp,
  /** Threshold for `gt`/`gte`/`lt`/`lte`; multiplier for `spike_x`/`drop_x`; ignored for `absent`. */
  threshold: z.number().finite(),
  /** Window the rule observes, in seconds. */
  windowSeconds: z.number().int().positive().max(86_400),
  /** Optional baseline window in seconds (for spike_x / drop_x). */
  baselineSeconds: z.number().int().positive().max(86_400 * 14).optional(),
  severity: AnomalySeverity.default('warning'),
  tags: z.array(z.string().min(1).max(64)).max(32).default([]),
})
export type AnomalyRule = z.infer<typeof AnomalyRule>

export const AnomalyRuleSet = z.object({
  rules: z.array(AnomalyRule).max(256),
})
export type AnomalyRuleSet = z.infer<typeof AnomalyRuleSet>

export type AnomalySample = {
  readonly metric: AnomalyMetric
  readonly value: number
  /** Unix epoch milliseconds. */
  readonly at: number
}

export type AnomalyAlert = {
  readonly ruleId: string
  readonly metric: AnomalyMetric
  readonly severity: AnomalySeverity
  readonly observed: number
  readonly threshold: number
  readonly windowSamples: number
  readonly reason: string
}

const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((n, v) => n + v, 0) / values.length

const compare = (op: AnomalyOp, observed: number, threshold: number): boolean => {
  if (op === 'gt') return observed > threshold
  if (op === 'gte') return observed >= threshold
  if (op === 'lt') return observed < threshold
  if (op === 'lte') return observed <= threshold
  return false
}

const within = (sample: AnomalySample, now: number, seconds: number): boolean =>
  now - sample.at <= seconds * 1000

const evaluateOne = (
  rule: AnomalyRule,
  samples: readonly AnomalySample[],
  now: number,
): AnomalyAlert | null => {
  const inWindow = samples.filter(
    (s) => s.metric === rule.metric && within(s, now, rule.windowSeconds),
  )
  if (rule.op === 'absent') {
    if (inWindow.length === 0) {
      return {
        ruleId: rule.id,
        metric: rule.metric,
        severity: rule.severity,
        observed: 0,
        threshold: rule.threshold,
        windowSamples: 0,
        reason: `no ${rule.metric} samples in last ${rule.windowSeconds}s`,
      }
    }
    return null
  }
  if (inWindow.length === 0) return null
  const observed = mean(inWindow.map((s) => s.value))
  if (rule.op === 'spike_x' || rule.op === 'drop_x') {
    const baselineWindow = rule.baselineSeconds ?? rule.windowSeconds * 4
    const baselineSamples = samples.filter(
      (s) =>
        s.metric === rule.metric
        && !within(s, now, rule.windowSeconds)
        && within(s, now, baselineWindow),
    )
    if (baselineSamples.length === 0) return null
    const baseline = mean(baselineSamples.map((s) => s.value))
    if (baseline === 0) return null
    const ratio = observed / baseline
    const tripped =
      rule.op === 'spike_x' ? ratio >= rule.threshold : ratio <= 1 / rule.threshold
    if (!tripped) return null
    return {
      ruleId: rule.id,
      metric: rule.metric,
      severity: rule.severity,
      observed,
      threshold: rule.threshold,
      windowSamples: inWindow.length,
      reason: `${rule.op} ratio=${ratio.toFixed(2)}× baseline=${baseline.toFixed(3)}`,
    }
  }
  if (!compare(rule.op, observed, rule.threshold)) return null
  return {
    ruleId: rule.id,
    metric: rule.metric,
    severity: rule.severity,
    observed,
    threshold: rule.threshold,
    windowSamples: inWindow.length,
    reason: `${rule.metric} ${rule.op} ${rule.threshold}; observed=${observed.toFixed(3)}`,
  }
}

export type AnomalyEvalOpts = {
  readonly clock?: () => number
}

/**
 * Evaluate every anomaly rule against the supplied window of samples (#215).
 * Returns one alert per tripped rule.
 */
export const evaluateAnomalyRules = (
  ruleSet: AnomalyRuleSet,
  samples: readonly AnomalySample[],
  opts?: AnomalyEvalOpts,
): readonly AnomalyAlert[] => {
  const now = (opts?.clock ?? Date.now)()
  const alerts: AnomalyAlert[] = []
  for (const rule of ruleSet.rules) {
    const alert = evaluateOne(rule, samples, now)
    if (alert !== null) alerts.push(alert)
  }
  return alerts
}

export const parseAnomalyRuleSet = (input: unknown): AnomalyRuleSet =>
  AnomalyRuleSet.parse(input)
export const safeParseAnomalyRuleSet = (input: unknown) => AnomalyRuleSet.safeParse(input)
