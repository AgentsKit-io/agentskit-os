import { describe, expect, it } from 'vitest'
import {
  parseAgentRegistryEntry,
  safeParseAgentRegistryEntry,
} from '../../src/schema/agent-registry.js'

describe('AgentRegistryEntry', () => {
  const minimal = {
    agentId: 'researcher',
    owner: 'team-platform',
    purpose: 'Answer research questions with citations.',
  }

  describe('accept', () => {
    it('parses minimal entry with defaults', () => {
      const e = parseAgentRegistryEntry(minimal)
      expect(e.agentId).toBe('researcher')
      expect(e.lifecycleState).toBe('draft')
      expect(e.riskTier).toBe('low')
      expect(e.environments).toEqual(['local'])
      expect(e.capabilities).toEqual([])
    })

    it('parses full entry', () => {
      const e = parseAgentRegistryEntry({
        ...minimal,
        lifecycleState: 'production',
        riskTier: 'high',
        environments: ['local', 'staging', 'production'],
        productionStatus: 'live',
        support: { email: 'support@example.com', url: 'https://example.com/support' },
        slo: [{ name: 'p95_latency_lt_2s', url: 'https://example.com/slo' }],
        sla: [{ name: '99.9_uptime', url: 'https://example.com/sla' }],
      })
      expect(e.productionStatus).toBe('live')
      expect(e.support?.email).toBe('support@example.com')
      expect(e.slo).toHaveLength(1)
    })
  })

  describe('reject', () => {
    it('rejects invalid agentId slug', () => {
      expect(
        safeParseAgentRegistryEntry({ ...minimal, agentId: 'Bad ID' }).success,
      ).toBe(false)
    })

    it('rejects missing owner', () => {
      const rest = { agentId: minimal.agentId, purpose: minimal.purpose }
      expect(safeParseAgentRegistryEntry(rest).success).toBe(false)
    })

    it('rejects empty purpose', () => {
      expect(safeParseAgentRegistryEntry({ ...minimal, purpose: '' }).success).toBe(false)
    })
  })
})

