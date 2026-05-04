// Per ROADMAP M3 (#68). Pure cost-throttling decision.
// Three granularities: per-tool-call, per-node, per-flow.
// Three actions: reject, downgrade (to next adapter in fallback chain),
// queue (caller schedules a retry).

import { z } from 'zod'

export const ThrottleScope = z.enum(['tool', 'node', 'flow'])
export type ThrottleScope = z.infer<typeof ThrottleScope>

export const ThrottleAction = z.enum(['allow', 'reject', 'downgrade', 'queue'])
export type ThrottleAction = z.infer<typeof ThrottleAction>

export const CostBudget = z.object({
  /** Maximum USD allowed before throttling. */
  usdMax: z.number().nonnegative().max(1_000_000),
  /** Maximum input+output tokens. */
  tokensMax: z.number().int().nonnegative().max(10_000_000_000).optional(),
})
export type CostBudget = z.infer<typeof CostBudget>

export const CostThrottleConfig = z.object({
  /** Per-tool-call ceiling. */
  perTool: CostBudget.optional(),
  /** Per-node ceiling. */
  perNode: CostBudget.optional(),
  /** Per-flow ceiling. Hard cap; once exceeded the flow is rejected. */
  perFlow: CostBudget,
  /**
   * On exceedance, prefer to downgrade if the caller declares a fallback
   * is available; otherwise reject.
   */
  preferDowngrade: z.boolean().default(true),
  /** Queue when downgrade is unavailable; requires durable scheduler. */
  preferQueue: z.boolean().default(false),
  /**
   * Per-workspace agent allowlist that bypasses throttling. Auditable —
   * each opt-in is logged via the audit batch.
   */
  bypassAgentIds: z.array(z.string().min(1).max(128)).max(256).default([]),
  /**
   * Capability-token allowlist. A request carrying one of these tokens
   * bypasses throttling for one call (single-use enforced upstream).
   */
  bypassCapabilityTokens: z.array(z.string().min(1).max(256)).max(64).default([]),
})
export type CostThrottleConfig = z.infer<typeof CostThrottleConfig>

export const CostMeasurement = z.object({
  scope: ThrottleScope,
  estimatedUsd: z.number().nonnegative(),
  estimatedTokens: z.number().int().nonnegative().optional(),
  /** USD already spent in the same flow run. */
  flowSpentUsd: z.number().nonnegative().default(0),
  /** USD already spent in the same node. */
  nodeSpentUsd: z.number().nonnegative().default(0),
  agentId: z.string().min(1).max(128).optional(),
  /** Capability token presented by the caller, if any. */
  capabilityToken: z.string().min(1).max(256).optional(),
  /** Caller declares whether a fallback adapter is available. */
  fallbackAvailable: z.boolean().default(false),
  /** Caller declares whether a durable scheduler is available. */
  schedulerAvailable: z.boolean().default(false),
  /** Force bypass via --force flag at the CLI. Audited by caller. */
  force: z.boolean().default(false),
})
export type CostMeasurement = z.infer<typeof CostMeasurement>

export const ThrottleDecision = z.object({
  action: ThrottleAction,
  reason: z.string().max(512),
  /** Which budget was breached, if any. */
  breachedBudget: ThrottleScope.optional(),
  bypass: z.enum(['none', 'force', 'agent_allowlist', 'capability_token']).default('none'),
})
export type ThrottleDecision = z.infer<typeof ThrottleDecision>

const exceeds = (used: number, max: number, addition: number): boolean =>
  used + addition > max

const tokensExceed = (
  used: number | undefined,
  max: number | undefined,
  addition: number | undefined,
): boolean => {
  if (max === undefined || addition === undefined) return false
  return (used ?? 0) + addition > max
}

/**
 * Decide whether to allow a cost event, downgrade to a cheaper path,
 * queue for later, or reject outright.
 *
 * Order:
 *   1. force flag (audited bypass)
 *   2. agent allowlist
 *   3. capability token
 *   4. evaluate per-tool / per-node / per-flow ceilings in that order
 *      — narrowest scope first so we report the closest budget breach.
 */
export const decideThrottle = (
  config: CostThrottleConfig,
  measurement: CostMeasurement,
): ThrottleDecision => {
  if (measurement.force) {
    return { action: 'allow', reason: 'force flag', bypass: 'force' }
  }
  if (measurement.agentId && config.bypassAgentIds.includes(measurement.agentId)) {
    return { action: 'allow', reason: 'agent on workspace allowlist', bypass: 'agent_allowlist' }
  }
  if (
    measurement.capabilityToken &&
    config.bypassCapabilityTokens.includes(measurement.capabilityToken)
  ) {
    return { action: 'allow', reason: 'capability token bypass', bypass: 'capability_token' }
  }

  // Per-flow ceiling first — hard cap; cannot downgrade past flow budget.
  if (
    exceeds(measurement.flowSpentUsd, config.perFlow.usdMax, measurement.estimatedUsd) ||
    tokensExceed(undefined, config.perFlow.tokensMax, measurement.estimatedTokens)
  ) {
    return {
      action: 'reject',
      reason: 'per-flow budget exceeded',
      breachedBudget: 'flow',
      bypass: 'none',
    }
  }

  // Per-tool ceiling
  if (
    measurement.scope === 'tool' &&
    config.perTool &&
    (exceeds(0, config.perTool.usdMax, measurement.estimatedUsd) ||
      tokensExceed(0, config.perTool.tokensMax, measurement.estimatedTokens))
  ) {
    return resolveBreach(config, measurement, 'tool')
  }

  // Per-node ceiling
  if (
    config.perNode &&
    (exceeds(measurement.nodeSpentUsd, config.perNode.usdMax, measurement.estimatedUsd) ||
      tokensExceed(undefined, config.perNode.tokensMax, measurement.estimatedTokens))
  ) {
    return resolveBreach(config, measurement, 'node')
  }

  return { action: 'allow', reason: 'within all ceilings', bypass: 'none' }
}

const resolveBreach = (
  config: CostThrottleConfig,
  measurement: CostMeasurement,
  scope: ThrottleScope,
): ThrottleDecision => {
  if (config.preferDowngrade && measurement.fallbackAvailable) {
    return { action: 'downgrade', reason: `${scope} budget exceeded; fallback available`, breachedBudget: scope, bypass: 'none' }
  }
  if (config.preferQueue && measurement.schedulerAvailable) {
    return { action: 'queue', reason: `${scope} budget exceeded; queueing`, breachedBudget: scope, bypass: 'none' }
  }
  return { action: 'reject', reason: `${scope} budget exceeded; no fallback`, breachedBudget: scope, bypass: 'none' }
}

export const parseThrottleConfig = (input: unknown): CostThrottleConfig =>
  CostThrottleConfig.parse(input)
export const safeParseThrottleConfig = (input: unknown) =>
  CostThrottleConfig.safeParse(input)
export const parseCostMeasurement = (input: unknown): CostMeasurement =>
  CostMeasurement.parse(input)
export const safeParseCostMeasurement = (input: unknown) =>
  CostMeasurement.safeParse(input)
