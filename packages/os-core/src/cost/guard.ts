// Per #107 — cost guard + workspace quota evaluator.
// Pure: caller passes cumulative spend + quota; evaluator returns a verdict
// the runtime acts on (allow / warn / deny + budget context).

import type { CostQuota } from '../schema/observability.js'

export type CostUsage = {
  /** Cumulative spend today, USD. */
  readonly dailyUsd: number
  /** Cumulative spend this month, USD. */
  readonly monthlyUsd: number
  /** Per-agent cumulative spend, USD. */
  readonly perAgentUsd?: Readonly<Record<string, number>>
}

export type CostGuardVerdict =
  | { readonly kind: 'allow'; readonly nearestUtilization: number }
  | { readonly kind: 'warn'; readonly reason: string; readonly utilization: number }
  | { readonly kind: 'deny'; readonly reason: string; readonly utilization: number }

export type CostGuardOpts = {
  /** Utilization threshold above which the verdict downgrades to warn (0..1). */
  readonly warnAt?: number
}

const DEFAULT_WARN_AT = 0.8

const utilOf = (used: number, cap: number | undefined): number =>
  cap === undefined || cap === 0 ? 0 : used / cap

/**
 * Evaluate cost usage vs. quota (#107). Returns:
 * - `deny` when any utilization is >= 1
 * - `warn` when any utilization is >= warnAt (default 0.8)
 * - `allow` otherwise, with the nearest-cap utilization for telemetry.
 *
 * Per-agent quota in `quota.perAgent` is checked when the matching
 * `usage.perAgentUsd[id]` is present.
 */
export const evaluateCostGuard = (
  usage: CostUsage,
  quota: CostQuota,
  opts: CostGuardOpts = {},
): CostGuardVerdict => {
  const warnAt = opts.warnAt ?? DEFAULT_WARN_AT
  const checks: { name: string; util: number }[] = []

  const dailyUtil = utilOf(usage.dailyUsd, quota.daily)
  if (quota.daily !== undefined) checks.push({ name: 'daily', util: dailyUtil })

  const monthlyUtil = utilOf(usage.monthlyUsd, quota.monthly)
  if (quota.monthly !== undefined) checks.push({ name: 'monthly', util: monthlyUtil })

  if (quota.perAgent !== undefined && usage.perAgentUsd !== undefined) {
    for (const [agentId, cap] of Object.entries(quota.perAgent)) {
      const used = usage.perAgentUsd[agentId] ?? 0
      checks.push({ name: `agent:${agentId}`, util: utilOf(used, cap) })
    }
  }

  let nearest = 0
  let nearestName = ''
  for (const c of checks) {
    if (c.util > nearest) {
      nearest = c.util
      nearestName = c.name
    }
  }

  if (nearest >= 1) {
    return {
      kind: 'deny',
      reason: `${nearestName} cost cap exhausted (utilization=${nearest.toFixed(3)})`,
      utilization: nearest,
    }
  }
  if (nearest >= warnAt) {
    return {
      kind: 'warn',
      reason: `${nearestName} approaching cap (utilization=${nearest.toFixed(3)})`,
      utilization: nearest,
    }
  }
  return { kind: 'allow', nearestUtilization: nearest }
}
