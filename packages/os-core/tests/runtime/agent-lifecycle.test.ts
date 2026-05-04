import { describe, expect, it } from 'vitest'
import {
  evaluateTransition,
  isTransitionAllowed,
  requirementsFor,
  parseAgentLifecycleEvent,
} from '../../src/runtime/agent-lifecycle.js'

describe('isTransitionAllowed', () => {
  it('permits forward path draft → review → approved → staged → production', () => {
    expect(isTransitionAllowed('draft', 'review')).toBe(true)
    expect(isTransitionAllowed('review', 'approved')).toBe(true)
    expect(isTransitionAllowed('approved', 'staged')).toBe(true)
    expect(isTransitionAllowed('staged', 'production')).toBe(true)
    expect(isTransitionAllowed('production', 'deprecated')).toBe(true)
    expect(isTransitionAllowed('deprecated', 'retired')).toBe(true)
  })

  it('rejects skipping review (draft → production)', () => {
    expect(isTransitionAllowed('draft', 'production')).toBe(false)
  })

  it('permits demotion production → staged for rollback', () => {
    expect(isTransitionAllowed('production', 'staged')).toBe(true)
  })

  it('forbids retired → anywhere (terminal)', () => {
    expect(isTransitionAllowed('retired', 'production')).toBe(false)
    expect(isTransitionAllowed('retired', 'draft')).toBe(false)
  })
})

describe('requirementsFor', () => {
  it('review → approved requires reviewer signoff + eval', () => {
    expect(requirementsFor('review', 'approved').checks).toEqual([
      'reviewer_signoff',
      'eval_passing',
    ])
  })

  it('low-risk staged → production needs only eval_passing', () => {
    expect(requirementsFor('staged', 'production', 'low').checks).toEqual(['eval_passing'])
  })

  it('medium-risk staged → production adds security_audit', () => {
    expect(requirementsFor('staged', 'production', 'medium').checks).toContain('security_audit')
  })

  it('critical-risk staged → production adds risk_committee_signoff', () => {
    const checks = requirementsFor('staged', 'production', 'critical').checks
    expect(checks).toContain('security_audit')
    expect(checks).toContain('risk_committee_signoff')
  })

  it('non-production edges are not risk-escalated', () => {
    expect(requirementsFor('draft', 'review', 'critical').checks).toEqual([])
  })
})

describe('evaluateTransition', () => {
  it('returns ok when all required checks satisfied', () => {
    const result = evaluateTransition({
      from: 'review',
      to: 'approved',
      satisfied: ['reviewer_signoff', 'eval_passing'],
    })
    expect(result.ok).toBe(true)
  })

  it('reports missing checks', () => {
    const result = evaluateTransition({
      from: 'review',
      to: 'approved',
      satisfied: ['reviewer_signoff'],
    })
    expect(result).toEqual({
      ok: false,
      reason: 'missing_checks',
      missing: ['eval_passing'],
    })
  })

  it('reports not_allowed for forbidden edges', () => {
    const result = evaluateTransition({
      from: 'draft',
      to: 'production',
      satisfied: [],
    })
    expect(result).toEqual({ ok: false, reason: 'not_allowed' })
  })

  it('blocks critical promotion missing risk-committee signoff', () => {
    const result = evaluateTransition({
      from: 'staged',
      to: 'production',
      riskTier: 'critical',
      satisfied: ['eval_passing', 'security_audit'],
    })
    expect(result.ok).toBe(false)
    if (!result.ok && result.reason === 'missing_checks') {
      expect(result.missing).toContain('risk_committee_signoff')
    }
  })
})

describe('AgentLifecycleEvent', () => {
  it('parses valid event', () => {
    const ev = parseAgentLifecycleEvent({
      type: 'agent.lifecycle.transition',
      agentId: 'sales-bot',
      from: 'staged',
      to: 'production',
      riskTier: 'medium',
      actor: 'alice@example.com',
      satisfiedChecks: ['eval_passing', 'security_audit'],
      at: '2026-05-04T12:00:00.000Z',
    })
    expect(ev.from).toBe('staged')
    expect(ev.to).toBe('production')
  })

  it('rejects invalid type literal', () => {
    expect(() =>
      parseAgentLifecycleEvent({
        type: 'wrong.type',
        agentId: 'x',
        from: 'draft',
        to: 'review',
        actor: 'a',
        at: '2026-05-04T12:00:00.000Z',
      }),
    ).toThrow()
  })
})
