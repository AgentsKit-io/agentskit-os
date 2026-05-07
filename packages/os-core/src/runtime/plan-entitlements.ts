// Per #123 — free + Pro plan entitlements.
// Pure: per-plan entitlement table + verdict that callers query before
// gating a feature behind a plan tier.

import type { CloudPlan } from '../schema/cloud.js'

export type PlanEntitlement = {
  readonly maxAgents: number
  readonly maxFlowsPerWorkspace: number
  readonly maxSeats: number
  readonly maxRunsPerMonth: number
  readonly cloudSync: boolean
  readonly hostedTriggers: boolean
  readonly enterpriseSso: boolean
  readonly airGapDeployment: boolean
  readonly auditExport: 'none' | 'self-serve' | 'compliance-bundle'
  readonly prioritySupport: boolean
}

const FREE: PlanEntitlement = {
  maxAgents: 5,
  maxFlowsPerWorkspace: 3,
  maxSeats: 1,
  maxRunsPerMonth: 200,
  cloudSync: false,
  hostedTriggers: false,
  enterpriseSso: false,
  airGapDeployment: false,
  auditExport: 'none',
  prioritySupport: false,
}

const PRO: PlanEntitlement = {
  ...FREE,
  maxAgents: 50,
  maxFlowsPerWorkspace: 25,
  maxRunsPerMonth: 10_000,
  cloudSync: true,
  hostedTriggers: true,
  auditExport: 'self-serve',
}

const TEAM: PlanEntitlement = {
  ...PRO,
  maxAgents: 250,
  maxFlowsPerWorkspace: 100,
  maxSeats: 25,
  maxRunsPerMonth: 100_000,
  prioritySupport: true,
}

const ENTERPRISE: PlanEntitlement = {
  maxAgents: Number.POSITIVE_INFINITY,
  maxFlowsPerWorkspace: Number.POSITIVE_INFINITY,
  maxSeats: Number.POSITIVE_INFINITY,
  maxRunsPerMonth: Number.POSITIVE_INFINITY,
  cloudSync: true,
  hostedTriggers: true,
  enterpriseSso: true,
  airGapDeployment: false,
  auditExport: 'compliance-bundle',
  prioritySupport: true,
}

const SELF_HOSTED: PlanEntitlement = {
  ...ENTERPRISE,
  airGapDeployment: true,
}

const ENTITLEMENTS: Readonly<Record<CloudPlan, PlanEntitlement>> = {
  free: FREE,
  pro: PRO,
  team: TEAM,
  enterprise: ENTERPRISE,
  'self-hosted': SELF_HOSTED,
}

export const entitlementsFor = (plan: CloudPlan): PlanEntitlement => ENTITLEMENTS[plan]

export type PlanUsage = {
  readonly agentCount: number
  readonly flowCount: number
  readonly seatCount: number
  readonly runsThisMonth: number
}

export type PlanVerdict =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly reasons: readonly { readonly key: 'maxAgents' | 'maxFlowsPerWorkspace' | 'maxSeats' | 'maxRunsPerMonth'; readonly cap: number; readonly observed: number }[]
    }

/** Compare current usage against the plan entitlement table (#123). */
export const evaluatePlanUsage = (plan: CloudPlan, usage: PlanUsage): PlanVerdict => {
  const limits = ENTITLEMENTS[plan]
  const reasons: { key: 'maxAgents' | 'maxFlowsPerWorkspace' | 'maxSeats' | 'maxRunsPerMonth'; cap: number; observed: number }[] = []
  if (usage.agentCount > limits.maxAgents) reasons.push({ key: 'maxAgents', cap: limits.maxAgents, observed: usage.agentCount })
  if (usage.flowCount > limits.maxFlowsPerWorkspace) reasons.push({ key: 'maxFlowsPerWorkspace', cap: limits.maxFlowsPerWorkspace, observed: usage.flowCount })
  if (usage.seatCount > limits.maxSeats) reasons.push({ key: 'maxSeats', cap: limits.maxSeats, observed: usage.seatCount })
  if (usage.runsThisMonth > limits.maxRunsPerMonth) reasons.push({ key: 'maxRunsPerMonth', cap: limits.maxRunsPerMonth, observed: usage.runsThisMonth })
  return reasons.length === 0 ? { ok: true } : { ok: false, reasons }
}
