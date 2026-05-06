// Per #217 — declarative SLI/SLO contract on flows + agents.
// Schema + pure evaluator. Caller supplies measurements; evaluator returns
// per-SLO compliance verdicts the runtime can attach to a run report.

import { z } from 'zod'

export const SliKind = z.enum([
  'latency_ms',
  'error_rate',
  'success_rate',
  'cost_usd',
  'throughput_per_minute',
])
export type SliKind = z.infer<typeof SliKind>

export const SliComparison = z.enum(['lte', 'lt', 'gte', 'gt'])
export type SliComparison = z.infer<typeof SliComparison>

export const SliWindow = z.object({
  /** ISO-8601 duration-ish label; runtime decides bucket boundaries. */
  durationLabel: z.string().min(1).max(32),
  /** Number of samples that must accumulate before the SLO can fire. */
  minSamples: z.number().int().min(1).max(1_000_000).default(1),
})
export type SliWindow = z.infer<typeof SliWindow>

export const SliSlo = z.object({
  id: z.string().min(1).max(128),
  description: z.string().max(512).default(''),
  kind: SliKind,
  comparison: SliComparison,
  /** Target for the comparison; e.g. p95 latency_ms <= 250. */
  target: z.number().finite(),
  /** Optional percentile selector for latency-style SLOs (0-100). */
  percentile: z.number().min(0).max(100).optional(),
  window: SliWindow,
})
export type SliSlo = z.infer<typeof SliSlo>

export const SliSloContract = z.object({
  /** Owner — e.g. `agent:foo`, `flow:bar`, `tool:baz`. */
  owner: z.string().min(1).max(128),
  slos: z.array(SliSlo).max(64),
})
export type SliSloContract = z.infer<typeof SliSloContract>

export type SliSample = {
  readonly kind: SliKind
  readonly value: number
}

export type SliSloVerdict = {
  readonly id: string
  readonly status: 'pass' | 'fail' | 'insufficient_data'
  readonly observed: number | undefined
  readonly target: number
  readonly samples: number
}

const compare = (cmp: SliComparison, observed: number, target: number): boolean => {
  if (cmp === 'lte') return observed <= target
  if (cmp === 'lt') return observed < target
  if (cmp === 'gte') return observed >= target
  return observed > target
}

const percentileOf = (values: readonly number[], percentile: number): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const rank = (percentile / 100) * (sorted.length - 1)
  const low = Math.floor(rank)
  const high = Math.ceil(rank)
  if (low === high) return sorted[low]!
  const weight = rank - low
  return sorted[low]! * (1 - weight) + sorted[high]! * weight
}

const aggregate = (slo: SliSlo, samples: readonly number[]): number | undefined => {
  if (samples.length === 0) return undefined
  if (slo.kind === 'latency_ms' && slo.percentile !== undefined) {
    return percentileOf(samples, slo.percentile)
  }
  if (slo.kind === 'error_rate' || slo.kind === 'success_rate') {
    const sum = samples.reduce((n, s) => n + s, 0)
    return sum / samples.length
  }
  if (slo.kind === 'throughput_per_minute' || slo.kind === 'cost_usd') {
    return samples.reduce((n, s) => n + s, 0)
  }
  return percentileOf(samples, slo.percentile ?? 50)
}

/**
 * Evaluate every SLO in a contract against a stream of measurements (#217).
 * Returns one verdict per SLO; insufficient_data when the window has fewer
 * than `minSamples` matching observations.
 */
export const evaluateSliSloContract = (
  contract: SliSloContract,
  samples: readonly SliSample[],
): readonly SliSloVerdict[] =>
  contract.slos.map((slo) => {
    const matching = samples.filter((s) => s.kind === slo.kind).map((s) => s.value)
    if (matching.length < slo.window.minSamples) {
      return {
        id: slo.id,
        status: 'insufficient_data',
        observed: undefined,
        target: slo.target,
        samples: matching.length,
      }
    }
    const observed = aggregate(slo, matching)
    if (observed === undefined) {
      return {
        id: slo.id,
        status: 'insufficient_data',
        observed: undefined,
        target: slo.target,
        samples: matching.length,
      }
    }
    return {
      id: slo.id,
      status: compare(slo.comparison, observed, slo.target) ? 'pass' : 'fail',
      observed,
      target: slo.target,
      samples: matching.length,
    }
  })

export const parseSliSloContract = (input: unknown): SliSloContract => SliSloContract.parse(input)
export const safeParseSliSloContract = (input: unknown) => SliSloContract.safeParse(input)
