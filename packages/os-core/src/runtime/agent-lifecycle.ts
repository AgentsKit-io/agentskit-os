// Per ROADMAP M1/M2 (#335). Pure transition machine for AgentLifecycleState.
// No I/O. Allowed edges, required checks per edge, promotion event shape.
// SDLC for agents: draft → review → approved → staged → production → deprecated → retired.

import { z } from 'zod'
import {
  AgentLifecycleState,
  AgentRiskTier,
} from '../schema/agent-registry.js'

/**
 * Forward and reverse transitions allowed between lifecycle states.
 * Reverse edges enable demotion (e.g., production → staged for hotfix rollback).
 */
const FORWARD: ReadonlyArray<readonly [AgentLifecycleState, AgentLifecycleState]> = [
  ['draft', 'review'],
  ['review', 'approved'],
  ['review', 'draft'],
  ['approved', 'staged'],
  ['approved', 'review'],
  ['staged', 'production'],
  ['staged', 'approved'],
  ['production', 'deprecated'],
  ['production', 'staged'],
  ['deprecated', 'retired'],
  ['deprecated', 'production'],
]

const ALLOWED: ReadonlySet<string> = new Set(FORWARD.map(([f, t]) => `${f}>${t}`))

/**
 * Checks required to authorize a transition.
 * Higher-risk agents require stricter signoff before reaching production.
 */
export const TransitionCheck = z.enum([
  'reviewer_signoff',
  'eval_passing',
  'security_audit',
  'risk_committee_signoff',
  'rollback_plan',
  'owner_acknowledged_deprecation',
])
export type TransitionCheck = z.infer<typeof TransitionCheck>

export type TransitionRequirements = {
  readonly checks: readonly TransitionCheck[]
}

const REQ_BY_EDGE: Record<string, readonly TransitionCheck[]> = {
  'draft>review': [],
  'review>approved': ['reviewer_signoff', 'eval_passing'],
  'review>draft': [],
  'approved>staged': ['rollback_plan'],
  'approved>review': [],
  'staged>production': ['eval_passing'],
  'staged>approved': [],
  'production>deprecated': ['owner_acknowledged_deprecation'],
  'production>staged': [],
  'deprecated>retired': [],
  'deprecated>production': ['eval_passing'],
}

/**
 * Risk-tier escalations. Edges into production for medium+ tiers require
 * security audit; critical also requires risk-committee signoff.
 */
const RISK_ESCALATION: Record<AgentRiskTier, readonly TransitionCheck[]> = {
  low: [],
  medium: ['security_audit'],
  high: ['security_audit'],
  critical: ['security_audit', 'risk_committee_signoff'],
}

const TERMINAL_RISK_EDGES = new Set(['staged>production', 'deprecated>production'])

export const requirementsFor = (
  from: AgentLifecycleState,
  to: AgentLifecycleState,
  riskTier: AgentRiskTier = 'low',
): TransitionRequirements => {
  const edge = `${from}>${to}`
  const base = REQ_BY_EDGE[edge] ?? []
  if (!TERMINAL_RISK_EDGES.has(edge)) return { checks: base }
  const extra = RISK_ESCALATION[riskTier]
  return { checks: dedupe([...base, ...extra]) }
}

const dedupe = <T>(items: readonly T[]): readonly T[] => Array.from(new Set(items))

export const isTransitionAllowed = (
  from: AgentLifecycleState,
  to: AgentLifecycleState,
): boolean => ALLOWED.has(`${from}>${to}`)

export type TransitionDecision =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'not_allowed' | 'missing_checks'; readonly missing?: readonly TransitionCheck[] }

export const evaluateTransition = (params: {
  readonly from: AgentLifecycleState
  readonly to: AgentLifecycleState
  readonly riskTier?: AgentRiskTier
  readonly satisfied: readonly TransitionCheck[]
}): TransitionDecision => {
  if (!isTransitionAllowed(params.from, params.to)) {
    return { ok: false, reason: 'not_allowed' }
  }
  const required = requirementsFor(params.from, params.to, params.riskTier).checks
  const set = new Set(params.satisfied)
  const missing = required.filter((c) => !set.has(c))
  if (missing.length > 0) return { ok: false, reason: 'missing_checks', missing }
  return { ok: true }
}

/**
 * Audit event emitted when a transition is performed.
 * Consumers (audit log, event bus) accept this exact shape.
 */
export const AgentLifecycleEvent = z.object({
  type: z.literal('agent.lifecycle.transition'),
  agentId: z.string().min(1).max(128),
  from: AgentLifecycleState,
  to: AgentLifecycleState,
  riskTier: AgentRiskTier.default('low'),
  actor: z.string().min(1).max(256),
  reason: z.string().max(1024).optional(),
  satisfiedChecks: z.array(TransitionCheck).default([]),
  at: z.string().datetime(),
})
export type AgentLifecycleEvent = z.infer<typeof AgentLifecycleEvent>

export const parseAgentLifecycleEvent = (input: unknown): AgentLifecycleEvent =>
  AgentLifecycleEvent.parse(input)
export const safeParseAgentLifecycleEvent = (input: unknown) =>
  AgentLifecycleEvent.safeParse(input)
