import { describe, expect, it } from 'vitest'
import { parseFlowConfig } from '@agentskit/os-core'
import type { AgentConfig, ModelPricing } from '@agentskit/os-core'
import {
  estimateFlowCost,
  priceKey,
  type AgentMap,
  type PriceMap,
} from '../src/cost-estimator.js'

// ---------------------------------------------------------------------------
// Helpers / fixtures
// ---------------------------------------------------------------------------

const makePricing = (
  provider: string,
  model: string,
  inputPerM: number,
  outputPerM: number,
): ModelPricing => ({
  provider,
  model,
  inputPerMillion: inputPerM,
  outputPerMillion: outputPerM,
  currency: 'USD',
})

const makeAgent = (
  id: string,
  provider: string,
  model: string,
  maxTokens?: number,
): AgentConfig => ({
  id,
  name: id,
  model: {
    provider,
    model,
    ...(maxTokens !== undefined ? { maxTokens } : {}),
  },
  tools: [],
  skills: [],
  ragRefs: [],
  tags: [],
})

const gptPricing = makePricing('openai', 'gpt-4o', 5, 15)
const claudePricing = makePricing('anthropic', 'claude-3-5-sonnet', 3, 15)

const gptKey = priceKey('openai', 'gpt-4o')
const claudeKey = priceKey('anthropic', 'claude-3-5-sonnet')

const defaultPrices: PriceMap = new Map<string, ModelPricing>([
  [gptKey, gptPricing],
  [claudeKey, claudePricing],
])

const agentA = makeAgent('agent-a', 'openai', 'gpt-4o', 4000)
const agentB = makeAgent('agent-b', 'anthropic', 'claude-3-5-sonnet', 2000)
const agentC = makeAgent('agent-c', 'openai', 'gpt-4o') // no maxTokens → default

const defaultAgents: AgentMap = new Map<string, AgentConfig>([
  ['agent-a', agentA],
  ['agent-b', agentB],
  ['agent-c', agentC],
])

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('estimateFlowCost', () => {
  describe('linear flow (single agent nodes)', () => {
    const flow = parseFlowConfig({
      id: 'linear',
      name: 'Linear',
      entry: 'n1',
      nodes: [
        { id: 'n1', kind: 'agent', agent: 'agent-a' },
        { id: 'n2', kind: 'agent', agent: 'agent-b' },
      ],
      edges: [{ from: 'n1', to: 'n2' }],
    })

    it('returns a perNode entry for each flow node', () => {
      const est = estimateFlowCost({ flow, agents: defaultAgents, prices: defaultPrices })
      expect(est.perNode).toHaveLength(2)
      expect(est.perNode[0]!.nodeId).toBe('n1')
      expect(est.perNode[1]!.nodeId).toBe('n2')
    })

    it('uses agent maxTokens when present', () => {
      const est = estimateFlowCost({ flow, agents: defaultAgents, prices: defaultPrices })
      // n1 → agent-a has maxTokens=4000
      expect(est.perNode[0]!.tokens).toBe(4000)
      // n2 → agent-b has maxTokens=2000
      expect(est.perNode[1]!.tokens).toBe(2000)
    })

    it('computes non-zero USD for known prices', () => {
      const est = estimateFlowCost({ flow, agents: defaultAgents, prices: defaultPrices })
      expect(est.perNode[0]!.usd).toBeGreaterThan(0)
      expect(est.perNode[1]!.usd).toBeGreaterThan(0)
    })

    it('sums totalTokens and totalUsd correctly', () => {
      const est = estimateFlowCost({ flow, agents: defaultAgents, prices: defaultPrices })
      const sumTokens = est.perNode.reduce((s, n) => s + n.tokens, 0)
      const sumUsd = est.perNode.reduce((s, n) => s + n.usd, 0)
      expect(est.totalTokens).toBe(sumTokens)
      expect(est.totalUsd).toBeCloseTo(sumUsd, 10)
    })

    it('records agent ids in perNode', () => {
      const est = estimateFlowCost({ flow, agents: defaultAgents, prices: defaultPrices })
      expect(est.perNode[0]!.agentIds).toEqual(['agent-a'])
      expect(est.perNode[1]!.agentIds).toEqual(['agent-b'])
    })
  })

  describe('non-LLM nodes produce zero cost', () => {
    const flow = parseFlowConfig({
      id: 'mixed',
      name: 'Mixed',
      entry: 'tool1',
      nodes: [
        { id: 'tool1', kind: 'tool', tool: 'gh.read' },
        { id: 'cond1', kind: 'condition', expression: 'x > 0' },
        { id: 'agent1', kind: 'agent', agent: 'agent-a' },
      ],
      edges: [
        { from: 'tool1', to: 'cond1' },
        { from: 'cond1', to: 'agent1', on: 'true' },
      ],
    })

    it('tool and condition nodes have zero cost', () => {
      const est = estimateFlowCost({ flow, agents: defaultAgents, prices: defaultPrices })
      const tool1 = est.perNode.find((n) => n.nodeId === 'tool1')!
      const cond1 = est.perNode.find((n) => n.nodeId === 'cond1')!
      expect(tool1.tokens).toBe(0)
      expect(tool1.usd).toBe(0)
      expect(cond1.tokens).toBe(0)
      expect(cond1.usd).toBe(0)
    })
  })

  describe('multi-agent fan-out: compare node', () => {
    const flow = parseFlowConfig({
      id: 'compare-flow',
      name: 'Compare',
      entry: 'cmp',
      nodes: [
        {
          id: 'cmp',
          kind: 'compare',
          agents: ['agent-a', 'agent-b'],
          selection: { mode: 'first', metric: 'fastest' },
        },
      ],
      edges: [],
    })

    it('sums tokens across all agents in the compare node', () => {
      const est = estimateFlowCost({ flow, agents: defaultAgents, prices: defaultPrices })
      const node = est.perNode[0]!
      // agent-a maxTokens=4000, agent-b maxTokens=2000
      expect(node.tokens).toBe(6000)
      expect(node.agentIds).toEqual(['agent-a', 'agent-b'])
    })

    it('sums USD across all agents', () => {
      const est = estimateFlowCost({ flow, agents: defaultAgents, prices: defaultPrices })
      expect(est.totalUsd).toBeGreaterThan(0)
    })
  })

  describe('multi-agent fan-out: vote node', () => {
    const flow = parseFlowConfig({
      id: 'vote-flow',
      name: 'Vote',
      entry: 'vt',
      nodes: [
        {
          id: 'vt',
          kind: 'vote',
          agents: ['agent-a', 'agent-b', 'agent-a'],
          ballot: { mode: 'majority' },
          outputType: 'classification',
        },
      ],
      edges: [],
    })

    it('fans out across all 3 voter slots', () => {
      const est = estimateFlowCost({ flow, agents: defaultAgents, prices: defaultPrices })
      const node = est.perNode[0]!
      // agent-a(4000) + agent-b(2000) + agent-a(4000)
      expect(node.tokens).toBe(10_000)
    })
  })

  describe('multi-agent fan-out: debate node', () => {
    const flow = parseFlowConfig({
      id: 'debate-flow',
      name: 'Debate',
      entry: 'db',
      nodes: [
        {
          id: 'db',
          kind: 'debate',
          proponent: 'agent-a',
          opponent: 'agent-b',
          judge: 'agent-a',
          topic: 'AI safety',
          rounds: 3,
        },
      ],
      edges: [],
    })

    it('multiplies each agent slot by rounds', () => {
      const est = estimateFlowCost({ flow, agents: defaultAgents, prices: defaultPrices })
      const node = est.perNode[0]!
      // (4000 + 2000 + 4000) * 3 = 30_000
      expect(node.tokens).toBe(30_000)
    })
  })

  describe('missing agent produces zero cost', () => {
    const flow = parseFlowConfig({
      id: 'missing',
      name: 'Missing',
      entry: 'n1',
      nodes: [{ id: 'n1', kind: 'agent', agent: 'ghost-agent' }],
      edges: [],
    })

    it('returns zero tokens and zero USD for unknown agent', () => {
      const est = estimateFlowCost({ flow, agents: defaultAgents, prices: defaultPrices })
      const node = est.perNode[0]!
      expect(node.tokens).toBe(0)
      expect(node.usd).toBe(0)
    })
  })

  describe('missing price produces zero USD', () => {
    const flow = parseFlowConfig({
      id: 'no-price',
      name: 'No Price',
      entry: 'n1',
      nodes: [{ id: 'n1', kind: 'agent', agent: 'agent-a' }],
      edges: [],
    })

    it('returns non-zero tokens but zero USD when price is not in map', () => {
      const emptyPrices: PriceMap = new Map()
      const est = estimateFlowCost({ flow, agents: defaultAgents, prices: emptyPrices })
      const node = est.perNode[0]!
      expect(node.tokens).toBe(4000) // still knows token count
      expect(node.usd).toBe(0)
    })
  })

  describe('custom defaultModelTokens', () => {
    const flow = parseFlowConfig({
      id: 'default-tok',
      name: 'Default Tokens',
      entry: 'n1',
      nodes: [{ id: 'n1', kind: 'agent', agent: 'agent-c' }],
      edges: [],
    })

    it('uses 2000 by default when agent has no maxTokens', () => {
      const est = estimateFlowCost({ flow, agents: defaultAgents, prices: defaultPrices })
      expect(est.perNode[0]!.tokens).toBe(2_000)
    })

    it('respects caller-supplied defaultModelTokens', () => {
      const est = estimateFlowCost({
        flow,
        agents: defaultAgents,
        prices: defaultPrices,
        defaultModelTokens: 512,
      })
      expect(est.perNode[0]!.tokens).toBe(512)
    })
  })
})
