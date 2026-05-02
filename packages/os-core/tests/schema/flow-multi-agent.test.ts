import { describe, expect, it } from 'vitest'
import { parseFlowConfig, safeParseFlowConfig } from '../../src/schema/flow.js'

const wrap = (node: unknown) => ({
  id: 'f',
  name: 'F',
  entry: 'n',
  nodes: [{ id: 'n', ...(node as object) }],
  edges: [],
})

describe('CompareNode', () => {
  it('parses with judge selection', () => {
    const f = parseFlowConfig(
      wrap({
        kind: 'compare',
        agents: ['a', 'b', 'c'],
        selection: { mode: 'judge', judgeAgent: 'judge', criteria: 'best brand voice' },
      }),
    )
    expect(f.nodes[0]?.kind).toBe('compare')
  })

  it('parses with manual + side-by-side default', () => {
    const f = parseFlowConfig(
      wrap({ kind: 'compare', agents: ['a', 'b'], selection: { mode: 'manual' } }),
    )
    const n = f.nodes[0]
    expect(n?.kind === 'compare' && n.selection.mode === 'manual' && n.selection.presenter).toBe(
      'side-by-side',
    )
  })

  it('rejects fewer than 2 agents', () => {
    const r = safeParseFlowConfig(
      wrap({ kind: 'compare', agents: ['a'], selection: { mode: 'manual' } }),
    )
    expect(r.success).toBe(false)
  })

  it('rejects more than 8 agents', () => {
    const agents = Array.from({ length: 9 }, (_, i) => `a${i}`)
    const r = safeParseFlowConfig(
      wrap({ kind: 'compare', agents, selection: { mode: 'manual' } }),
    )
    expect(r.success).toBe(false)
  })

  it('rejects unknown selection mode', () => {
    const r = safeParseFlowConfig(
      wrap({ kind: 'compare', agents: ['a', 'b'], selection: { mode: 'cosmic' } }),
    )
    expect(r.success).toBe(false)
  })
})

describe('VoteNode', () => {
  it('parses majority vote with 3 agents', () => {
    const f = parseFlowConfig(
      wrap({
        kind: 'vote',
        agents: ['a', 'b', 'c'],
        ballot: { mode: 'majority' },
        outputType: 'classification',
      }),
    )
    expect(f.nodes[0]?.kind).toBe('vote')
  })

  it('rejects even number of agents', () => {
    const r = safeParseFlowConfig(
      wrap({
        kind: 'vote',
        agents: ['a', 'b'],
        ballot: { mode: 'majority' },
        outputType: 'classification',
      }),
    )
    expect(r.success).toBe(false)
  })

  it('parses weighted ballot', () => {
    const f = parseFlowConfig(
      wrap({
        kind: 'vote',
        agents: ['a', 'b', 'c'],
        ballot: { mode: 'weighted', weights: { a: 2, b: 1, c: 1 } },
        outputType: 'classification',
      }),
    )
    expect(f.nodes[0]?.kind).toBe('vote')
  })

  it('parses quorum threshold', () => {
    const f = parseFlowConfig(
      wrap({
        kind: 'vote',
        agents: ['a', 'b', 'c'],
        ballot: { mode: 'quorum', threshold: 0.66 },
        outputType: 'classification',
      }),
    )
    expect(f.nodes[0]?.kind).toBe('vote')
  })

  it('rejects threshold > 1', () => {
    const r = safeParseFlowConfig(
      wrap({
        kind: 'vote',
        agents: ['a', 'b', 'c'],
        ballot: { mode: 'quorum', threshold: 1.5 },
        outputType: 'classification',
      }),
    )
    expect(r.success).toBe(false)
  })

  it('rejects onTie=judge without judgeAgent', () => {
    const r = safeParseFlowConfig(
      wrap({
        kind: 'vote',
        agents: ['a', 'b', 'c'],
        ballot: { mode: 'majority' },
        outputType: 'classification',
        onTie: 'judge',
      }),
    )
    expect(r.success).toBe(false)
  })

  it('accepts onTie=judge with judgeAgent', () => {
    const f = parseFlowConfig(
      wrap({
        kind: 'vote',
        agents: ['a', 'b', 'c'],
        ballot: { mode: 'majority' },
        outputType: 'classification',
        onTie: 'judge',
        judgeAgent: 'j',
      }),
    )
    expect(f.nodes[0]?.kind).toBe('vote')
  })
})

describe('DebateNode', () => {
  it('parses minimal debate', () => {
    const f = parseFlowConfig(
      wrap({
        kind: 'debate',
        proponent: 'pro',
        opponent: 'con',
        judge: 'judge',
        topic: 'Should we ship?',
      }),
    )
    const n = f.nodes[0]
    expect(n?.kind === 'debate' && n.rounds).toBe(2)
  })

  it('rejects rounds > 6', () => {
    const r = safeParseFlowConfig(
      wrap({
        kind: 'debate',
        proponent: 'pro',
        opponent: 'con',
        judge: 'judge',
        topic: 'x',
        rounds: 7,
      }),
    )
    expect(r.success).toBe(false)
  })

  it('rejects rounds < 1', () => {
    const r = safeParseFlowConfig(
      wrap({
        kind: 'debate',
        proponent: 'pro',
        opponent: 'con',
        judge: 'judge',
        topic: 'x',
        rounds: 0,
      }),
    )
    expect(r.success).toBe(false)
  })
})

describe('AuctionNode', () => {
  it('parses lowest-cost auction', () => {
    const f = parseFlowConfig(
      wrap({
        kind: 'auction',
        bidders: ['a', 'b', 'c'],
        task: { instruction: 'classify' },
        bidCriteria: 'lowest-cost',
      }),
    )
    expect(f.nodes[0]?.kind).toBe('auction')
  })

  it('parses with reserve price + fallback + timeout', () => {
    const f = parseFlowConfig(
      wrap({
        kind: 'auction',
        bidders: ['a', 'b'],
        task: 'classify this',
        bidCriteria: 'highest-confidence',
        reservePrice: { usd: 0.05, tokens: 1000 },
        fallback: 'default-agent',
        timeout: { ms: 30_000 },
      }),
    )
    expect(f.nodes[0]?.kind).toBe('auction')
  })

  it('rejects unknown bidCriteria', () => {
    const r = safeParseFlowConfig(
      wrap({
        kind: 'auction',
        bidders: ['a', 'b'],
        task: 'x',
        bidCriteria: 'cosmic',
      }),
    )
    expect(r.success).toBe(false)
  })
})

describe('BlackboardNode', () => {
  it('parses round-robin in-memory rounds=5', () => {
    const f = parseFlowConfig(
      wrap({
        kind: 'blackboard',
        agents: ['a', 'b', 'c'],
        scratchpad: { kind: 'in-memory' },
        schedule: { mode: 'round-robin' },
        termination: { mode: 'rounds', n: 5 },
      }),
    )
    expect(f.nodes[0]?.kind).toBe('blackboard')
  })

  it('parses sqlite scratchpad + priority schedule + budget termination', () => {
    const f = parseFlowConfig(
      wrap({
        kind: 'blackboard',
        agents: ['planner', 'writer', 'reviewer'],
        scratchpad: { kind: 'sqlite', path: './pad.db' },
        schedule: { mode: 'priority', priorities: { planner: 3, writer: 2, reviewer: 1 } },
        termination: { mode: 'budget', limits: { usdPerRun: 1, maxStepsPerRun: 50 } },
      }),
    )
    expect(f.nodes[0]?.kind).toBe('blackboard')
  })

  it('rejects fewer than 2 agents', () => {
    const r = safeParseFlowConfig(
      wrap({
        kind: 'blackboard',
        agents: ['a'],
        scratchpad: { kind: 'in-memory' },
        schedule: { mode: 'round-robin' },
        termination: { mode: 'consensus' },
      }),
    )
    expect(r.success).toBe(false)
  })

  it('rejects unknown scratchpad kind', () => {
    const r = safeParseFlowConfig(
      wrap({
        kind: 'blackboard',
        agents: ['a', 'b'],
        scratchpad: { kind: 'cosmic' },
        schedule: { mode: 'round-robin' },
        termination: { mode: 'consensus' },
      }),
    )
    expect(r.success).toBe(false)
  })

  it('rejects rounds > 1000', () => {
    const r = safeParseFlowConfig(
      wrap({
        kind: 'blackboard',
        agents: ['a', 'b'],
        scratchpad: { kind: 'in-memory' },
        schedule: { mode: 'round-robin' },
        termination: { mode: 'rounds', n: 1001 },
      }),
    )
    expect(r.success).toBe(false)
  })
})

describe('multi-agent nodes integrate with FlowConfig', () => {
  it('parses flow with all 5 new node kinds', () => {
    const f = parseFlowConfig({
      id: 'multi',
      name: 'Multi',
      entry: 'cmp',
      nodes: [
        { id: 'cmp', kind: 'compare', agents: ['a', 'b'], selection: { mode: 'manual' } },
        {
          id: 'vt',
          kind: 'vote',
          agents: ['a', 'b', 'c'],
          ballot: { mode: 'majority' },
          outputType: 'classification',
        },
        {
          id: 'db',
          kind: 'debate',
          proponent: 'a',
          opponent: 'b',
          judge: 'c',
          topic: 't',
        },
        {
          id: 'au',
          kind: 'auction',
          bidders: ['a', 'b'],
          task: 't',
          bidCriteria: 'fastest',
        },
        {
          id: 'bb',
          kind: 'blackboard',
          agents: ['a', 'b'],
          scratchpad: { kind: 'in-memory' },
          schedule: { mode: 'round-robin' },
          termination: { mode: 'consensus' },
        },
      ],
      edges: [
        { from: 'cmp', to: 'vt' },
        { from: 'vt', to: 'db' },
        { from: 'db', to: 'au' },
        { from: 'au', to: 'bb' },
      ],
    })
    expect(f.nodes).toHaveLength(5)
  })
})
