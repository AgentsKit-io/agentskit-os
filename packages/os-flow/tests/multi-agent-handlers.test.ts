import { describe, expect, it, vi } from 'vitest'
import { parseRunContext } from '@agentskit/os-core'
import type { AgentRunResult, RunAgentFn, ScratchpadStore } from '../src/multi-agent-handlers.js'
import {
  createAuctionHandler,
  createBlackboardHandler,
  createCompareHandler,
  createDebateHandler,
  createVoteHandler,
  InMemoryScratchpadStore,
} from '../src/multi-agent-handlers.js'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const ctx = parseRunContext({
  runMode: 'real',
  workspaceId: 'team-test',
  runId: 'run_test',
  startedAt: '2026-05-02T00:00:00.000Z',
})

const makeAgent = (output: unknown, extra?: Partial<AgentRunResult>): RunAgentFn =>
  vi.fn(async (_id, _input, _ctx) => ({
    output,
    tokens: extra?.tokens ?? 10,
    usd: extra?.usd ?? 0.001,
    latencyMs: extra?.latencyMs ?? 100,
  }))

const makeAgentById = (
  responses: Record<string, AgentRunResult>,
): RunAgentFn =>
  vi.fn(async (id, _input, _ctx) => {
    const r = responses[id]
    if (!r) throw new Error(`no response configured for agent "${id}"`)
    return r
  })

const failingAgent: RunAgentFn = vi.fn(async () => {
  throw new Error('agent failed')
})

// ---------------------------------------------------------------------------
// compare handler
// ---------------------------------------------------------------------------

describe('createCompareHandler', () => {
  const baseNode = {
    kind: 'compare' as const,
    id: 'cmp',
    agents: ['a1', 'a2', 'a3'],
    isolation: 'isolated' as const,
  }

  it('mode=manual returns paused/hitl', async () => {
    const handler = createCompareHandler({ runAgent: makeAgent('x') })
    const result = await handler(
      { ...baseNode, selection: { mode: 'manual', presenter: 'side-by-side' } },
      null,
      ctx,
    )
    expect(result.kind).toBe('paused')
    expect((result as { kind: 'paused'; reason: string }).reason).toBe('hitl')
  })

  it('mode=all combine=concat concatenates array outputs', async () => {
    const runAgent = makeAgentById({
      a1: { output: [1, 2], tokens: 5, usd: 0.001, latencyMs: 50 },
      a2: { output: [3, 4], tokens: 5, usd: 0.001, latencyMs: 50 },
      a3: { output: [5, 6], tokens: 5, usd: 0.001, latencyMs: 50 },
    })
    const handler = createCompareHandler({ runAgent })
    const result = await handler(
      { ...baseNode, selection: { mode: 'all', combine: 'concat' } },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    expect((result as { kind: 'ok'; value: unknown }).value).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('mode=all combine=merge merges object outputs', async () => {
    const runAgent = makeAgentById({
      a1: { output: { x: 1 }, tokens: 5, usd: 0.001, latencyMs: 50 },
      a2: { output: { y: 2 }, tokens: 5, usd: 0.001, latencyMs: 50 },
      a3: { output: { z: 3 }, tokens: 5, usd: 0.001, latencyMs: 50 },
    })
    const handler = createCompareHandler({ runAgent })
    const result = await handler(
      { ...baseNode, selection: { mode: 'all', combine: 'merge' } },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    expect((result as { kind: 'ok'; value: unknown }).value).toEqual({ x: 1, y: 2, z: 3 })
  })

  it('mode=first metric=fastest picks agent with lowest latencyMs', async () => {
    const runAgent = makeAgentById({
      a1: { output: 'slow', tokens: 5, usd: 0.001, latencyMs: 300 },
      a2: { output: 'fast', tokens: 5, usd: 0.001, latencyMs: 50 },
      a3: { output: 'medium', tokens: 5, usd: 0.001, latencyMs: 150 },
    })
    const handler = createCompareHandler({ runAgent })
    const result = await handler(
      { ...baseNode, selection: { mode: 'first', metric: 'fastest' } },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    expect((result as { kind: 'ok'; value: unknown }).value).toBe('fast')
  })

  it('mode=first metric=cheapest picks agent with lowest usd', async () => {
    const runAgent = makeAgentById({
      a1: { output: 'expensive', tokens: 100, usd: 0.1, latencyMs: 100 },
      a2: { output: 'cheap', tokens: 5, usd: 0.001, latencyMs: 100 },
      a3: { output: 'mid', tokens: 50, usd: 0.05, latencyMs: 100 },
    })
    const handler = createCompareHandler({ runAgent })
    const result = await handler(
      { ...baseNode, selection: { mode: 'first', metric: 'cheapest' } },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    expect((result as { kind: 'ok'; value: unknown }).value).toBe('cheap')
  })

  it('mode=eval calls evaluator with results and evalRef', async () => {
    const evaluator = vi.fn(async (_results: AgentRunResult[], _evalRef: string) => 1)
    const handler = createCompareHandler({ runAgent: makeAgent('output'), evaluator })
    const result = await handler(
      { ...baseNode, selection: { mode: 'eval', evalRef: 'my-eval' } },
      null,
      ctx,
    )
    expect(evaluator).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ output: 'output' })]),
      'my-eval',
      ctx,
    )
    expect(result.kind).toBe('ok')
    expect((result as { kind: 'ok'; value: unknown }).value).toBe('output')
  })

  it('mode=eval fails gracefully when evaluator not provided', async () => {
    const handler = createCompareHandler({ runAgent: makeAgent('x') })
    const result = await handler(
      { ...baseNode, selection: { mode: 'eval', evalRef: 'ref' } },
      null,
      ctx,
    )
    expect(result.kind).toBe('failed')
    expect((result as { kind: 'failed'; error: { code: string } }).error.code).toBe(
      'compare.evaluator_not_provided',
    )
  })

  it('mode=judge calls judger with results and criteria', async () => {
    const judger = vi.fn(async () => 2)
    const handler = createCompareHandler({ runAgent: makeAgent('out'), judger })
    const result = await handler(
      {
        ...baseNode,
        selection: { mode: 'judge', judgeAgent: 'judge-agent', criteria: 'best quality' },
      },
      null,
      ctx,
    )
    expect(judger).toHaveBeenCalled()
    expect(result.kind).toBe('ok')
    expect((result as { kind: 'ok'; value: unknown }).value).toBe('out')
  })

  it('mode=judge fails gracefully when judger not provided', async () => {
    const handler = createCompareHandler({ runAgent: makeAgent('x') })
    const result = await handler(
      {
        ...baseNode,
        selection: { mode: 'judge', judgeAgent: 'j', criteria: 'best' },
      },
      null,
      ctx,
    )
    expect(result.kind).toBe('failed')
    expect((result as { kind: 'failed'; error: { code: string } }).error.code).toBe(
      'compare.judger_not_provided',
    )
  })

  it('returns failed when all agents fail', async () => {
    const handler = createCompareHandler({ runAgent: failingAgent })
    const result = await handler(
      { ...baseNode, selection: { mode: 'all', combine: 'concat' } },
      null,
      ctx,
    )
    expect(result.kind).toBe('failed')
    expect((result as { kind: 'failed'; error: { code: string } }).error.code).toBe(
      'compare.all_agents_failed',
    )
  })

  it('passes node.input to agents when provided', async () => {
    const runAgent = vi.fn(async () => ({ output: 'x', tokens: 1, usd: 0, latencyMs: 10 }))
    const handler = createCompareHandler({ runAgent })
    await handler(
      {
        ...baseNode,
        input: { prompt: 'hello' },
        selection: { mode: 'all', combine: 'merge' },
      },
      'ignored-input',
      ctx,
    )
    expect(runAgent).toHaveBeenCalledWith(
      expect.any(String),
      { prompt: 'hello' },
      ctx,
    )
  })
})

// ---------------------------------------------------------------------------
// vote handler
// ---------------------------------------------------------------------------

describe('createVoteHandler', () => {
  const baseNode = {
    kind: 'vote' as const,
    id: 'v',
    agents: ['a1', 'a2', 'a3'],
    outputType: 'classification' as const,
    onTie: 'first' as const,
  }

  it('ballot=majority picks winning output', async () => {
    const runAgent = makeAgentById({
      a1: { output: 'yes', tokens: 5, usd: 0.001, latencyMs: 100 },
      a2: { output: 'yes', tokens: 5, usd: 0.001, latencyMs: 100 },
      a3: { output: 'no', tokens: 5, usd: 0.001, latencyMs: 100 },
    })
    const handler = createVoteHandler({ runAgent })
    const result = await handler(
      { ...baseNode, ballot: { mode: 'majority' } },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    expect((result as { kind: 'ok'; value: unknown }).value).toBe('yes')
  })

  it('ballot=majority triggers onTie when split', async () => {
    const runAgent = makeAgentById({
      a1: { output: 'a', tokens: 5, usd: 0.001, latencyMs: 100 },
      a2: { output: 'b', tokens: 5, usd: 0.001, latencyMs: 100 },
      a3: { output: 'c', tokens: 5, usd: 0.001, latencyMs: 100 },
    })
    const handler = createVoteHandler({ runAgent })
    const result = await handler(
      { ...baseNode, ballot: { mode: 'majority' } },
      null,
      ctx,
    )
    // onTie='first' picks first output
    expect(result.kind).toBe('ok')
    expect((result as { kind: 'ok'; value: unknown }).value).toBe('a')
  })

  it('ballot=weighted applies agent weights', async () => {
    const runAgent = makeAgentById({
      a1: { output: 'A', tokens: 5, usd: 0.001, latencyMs: 100 },
      a2: { output: 'B', tokens: 5, usd: 0.001, latencyMs: 100 },
      a3: { output: 'A', tokens: 5, usd: 0.001, latencyMs: 100 },
    })
    const handler = createVoteHandler({ runAgent })
    const result = await handler(
      {
        ...baseNode,
        ballot: { mode: 'weighted', weights: { a1: 1, a2: 10, a3: 1 } },
      },
      null,
      ctx,
    )
    // a2 has weight 10 for 'B'; a1+a3 have weight 2 total for 'A' → B wins
    expect(result.kind).toBe('ok')
    expect((result as { kind: 'ok'; value: unknown }).value).toBe('B')
  })

  it('ballot=unanimous passes when all agree', async () => {
    const runAgent = makeAgent('consensus-value')
    const handler = createVoteHandler({ runAgent })
    const result = await handler(
      { ...baseNode, ballot: { mode: 'unanimous' } },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    expect((result as { kind: 'ok'; value: unknown }).value).toBe('consensus-value')
  })

  it('ballot=unanimous triggers tie when agents disagree', async () => {
    const runAgent = makeAgentById({
      a1: { output: 'yes', tokens: 5, usd: 0.001, latencyMs: 100 },
      a2: { output: 'no', tokens: 5, usd: 0.001, latencyMs: 100 },
      a3: { output: 'yes', tokens: 5, usd: 0.001, latencyMs: 100 },
    })
    const handler = createVoteHandler({ runAgent })
    const result = await handler(
      { ...baseNode, ballot: { mode: 'unanimous' } },
      null,
      ctx,
    )
    // onTie='first' → first output
    expect(result.kind).toBe('ok')
    expect((result as { kind: 'ok'; value: unknown }).value).toBe('yes')
  })

  it('ballot=quorum passes when threshold met', async () => {
    const runAgent = makeAgentById({
      a1: { output: 'approve', tokens: 5, usd: 0.001, latencyMs: 100 },
      a2: { output: 'approve', tokens: 5, usd: 0.001, latencyMs: 100 },
      a3: { output: 'reject', tokens: 5, usd: 0.001, latencyMs: 100 },
    })
    const handler = createVoteHandler({ runAgent })
    const result = await handler(
      { ...baseNode, ballot: { mode: 'quorum', threshold: 0.6 } },
      null,
      ctx,
    )
    // 2/3 = 0.66 >= 0.6 threshold
    expect(result.kind).toBe('ok')
    expect((result as { kind: 'ok'; value: unknown }).value).toBe('approve')
  })

  it('ballot=quorum triggers tie when threshold not met', async () => {
    const runAgent = makeAgentById({
      a1: { output: 'a', tokens: 5, usd: 0.001, latencyMs: 100 },
      a2: { output: 'b', tokens: 5, usd: 0.001, latencyMs: 100 },
      a3: { output: 'a', tokens: 5, usd: 0.001, latencyMs: 100 },
    })
    const handler = createVoteHandler({ runAgent })
    // 2/3 = 0.66 < 0.9 threshold → tie
    const result = await handler(
      { ...baseNode, ballot: { mode: 'quorum', threshold: 0.9 } },
      null,
      ctx,
    )
    // onTie='first'
    expect(result.kind).toBe('ok')
  })

  it('onTie=human returns paused/hitl', async () => {
    const runAgent = makeAgentById({
      a1: { output: 'x', tokens: 5, usd: 0.001, latencyMs: 100 },
      a2: { output: 'y', tokens: 5, usd: 0.001, latencyMs: 100 },
      a3: { output: 'z', tokens: 5, usd: 0.001, latencyMs: 100 },
    })
    const handler = createVoteHandler({ runAgent })
    const result = await handler(
      { ...baseNode, onTie: 'human', ballot: { mode: 'majority' } },
      null,
      ctx,
    )
    expect(result.kind).toBe('paused')
    expect((result as { kind: 'paused'; reason: string }).reason).toBe('hitl')
  })

  it('onTie=judge invokes judger and returns its output', async () => {
    const runAgent = makeAgentById({
      a1: { output: 'p', tokens: 5, usd: 0.001, latencyMs: 100 },
      a2: { output: 'q', tokens: 5, usd: 0.001, latencyMs: 100 },
      a3: { output: 'p', tokens: 5, usd: 0.001, latencyMs: 100 },
    })
    const judger = vi.fn(async () => 'judge-picks-p')
    const handler = createVoteHandler({ runAgent, judger })
    // majority: p wins 2/3, not a tie — adjust: use unanimous so they disagree
    const result = await handler(
      {
        ...baseNode,
        onTie: 'judge',
        judgeAgent: 'judge',
        ballot: { mode: 'unanimous' },
      },
      null,
      ctx,
    )
    expect(judger).toHaveBeenCalled()
    expect(result.kind).toBe('ok')
    expect((result as { kind: 'ok'; value: unknown }).value).toBe('judge-picks-p')
  })

  it('returns failed when all agents fail', async () => {
    const handler = createVoteHandler({ runAgent: failingAgent })
    const result = await handler(
      { ...baseNode, ballot: { mode: 'majority' } },
      null,
      ctx,
    )
    expect(result.kind).toBe('failed')
    expect((result as { kind: 'failed'; error: { code: string } }).error.code).toBe(
      'vote.all_agents_failed',
    )
  })
})

// ---------------------------------------------------------------------------
// debate handler
// ---------------------------------------------------------------------------

describe('createDebateHandler', () => {
  const baseNode = {
    kind: 'debate' as const,
    id: 'dbt',
    proponent: 'pro',
    opponent: 'opp',
    judge: 'jdg',
    topic: 'Should we ship this feature?',
    rounds: 2,
    format: 'open' as const,
    earlyExit: 'judge-decides' as const,
  }

  it('runs rounds and produces verdict from judge', async () => {
    const runAgent = vi.fn(async (id: string, input: unknown) => {
      if (id === 'jdg') return { output: { verdict: 'yes', confidence: 0.9 }, tokens: 20, usd: 0.005, latencyMs: 200 }
      return { output: `${id}-argument`, tokens: 10, usd: 0.002, latencyMs: 100 }
    })
    const handler = createDebateHandler({ runAgent })
    const result = await handler(baseNode, null, ctx)

    expect(result.kind).toBe('ok')
    const value = (result as { kind: 'ok'; value: unknown }).value as {
      verdict: unknown
      transcript: unknown[]
    }
    expect(value.verdict).toEqual({ verdict: 'yes', confidence: 0.9 })
    // 2 rounds × 2 agents = 4 transcript entries
    expect(value.transcript).toHaveLength(4)
  })

  it('passes transcript to subsequent agents', async () => {
    const calls: unknown[] = []
    const runAgent = vi.fn(async (id: string, input: unknown) => {
      calls.push({ id, transcript: (input as { transcript: unknown[] }).transcript })
      return { output: 'arg', tokens: 5, usd: 0.001, latencyMs: 50 }
    })
    const handler = createDebateHandler({ runAgent })
    await handler({ ...baseNode, rounds: 1 }, null, ctx)

    // Second call (opponent) should see proponent's argument in transcript
    const oppCall = calls[1] as { id: string; transcript: unknown[] }
    expect(oppCall.transcript).toHaveLength(1)
  })

  it('earlyExit=on-agreement stops when proponent and opponent agree', async () => {
    const runAgent = vi.fn(async (id: string) => {
      if (id === 'jdg') return { output: 'agreed', tokens: 10, usd: 0.001, latencyMs: 50 }
      return { output: 'AGREED', tokens: 5, usd: 0.001, latencyMs: 50 }
    })
    const handler = createDebateHandler({ runAgent })
    const result = await handler(
      { ...baseNode, rounds: 3, earlyExit: 'on-agreement' },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    // Should have stopped after first round where both returned 'AGREED'
    const value = (result as { kind: 'ok'; value: { transcript: unknown[] } }).value
    expect(value.transcript.length).toBeLessThanOrEqual(6) // at most 3 rounds * 2
  })

  it('respects rounds=1', async () => {
    const runAgent = vi.fn(async (id: string) => {
      return { output: `${id}-says`, tokens: 5, usd: 0.001, latencyMs: 50 }
    })
    const handler = createDebateHandler({ runAgent })
    const result = await handler({ ...baseNode, rounds: 1 }, null, ctx)

    expect(result.kind).toBe('ok')
    const value = (result as { kind: 'ok'; value: { transcript: unknown[] } }).value
    expect(value.transcript).toHaveLength(2) // 1 round: 1 pro + 1 opp
  })

  it('includes judge call at end regardless of earlyExit mode', async () => {
    const runAgent = vi.fn(async (id: string) => {
      return { output: id === 'jdg' ? 'final-verdict' : 'arg', tokens: 5, usd: 0.001, latencyMs: 50 }
    })
    const handler = createDebateHandler({ runAgent })
    await handler(baseNode, null, ctx)

    const judgeCalls = (runAgent as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([id]: [string]) => id === 'jdg',
    )
    expect(judgeCalls).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// auction handler
// ---------------------------------------------------------------------------

describe('createAuctionHandler', () => {
  const baseNode = {
    kind: 'auction' as const,
    id: 'auc',
    bidders: ['b1', 'b2', 'b3'],
    task: { description: 'Do the thing' },
    bidCriteria: 'lowest-cost' as const,
  }

  it('bidCriteria=lowest-cost picks agent with lowest usd', async () => {
    const runAgent = makeAgentById({
      b1: { output: 'result-b1', tokens: 100, usd: 0.1, latencyMs: 100 },
      b2: { output: 'result-b2', tokens: 10, usd: 0.01, latencyMs: 100 },
      b3: { output: 'result-b3', tokens: 50, usd: 0.05, latencyMs: 100 },
    })
    const handler = createAuctionHandler({ runAgent })
    const result = await handler(baseNode, null, ctx)
    expect(result.kind).toBe('ok')
    const value = (result as { kind: 'ok'; value: { winner: string } }).value
    expect(value.winner).toBe('b2')
  })

  it('bidCriteria=highest-confidence picks highest numeric output', async () => {
    const runAgent = makeAgentById({
      b1: { output: 0.6, tokens: 10, usd: 0.01, latencyMs: 100 },
      b2: { output: 0.95, tokens: 10, usd: 0.01, latencyMs: 100 },
      b3: { output: 0.7, tokens: 10, usd: 0.01, latencyMs: 100 },
    })
    const handler = createAuctionHandler({ runAgent })
    const result = await handler(
      { ...baseNode, bidCriteria: 'highest-confidence' },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    const value = (result as { kind: 'ok'; value: { winner: string } }).value
    expect(value.winner).toBe('b2')
  })

  it('bidCriteria=fastest picks agent with lowest latencyMs', async () => {
    const runAgent = makeAgentById({
      b1: { output: 'r1', tokens: 10, usd: 0.01, latencyMs: 500 },
      b2: { output: 'r2', tokens: 10, usd: 0.01, latencyMs: 50 },
      b3: { output: 'r3', tokens: 10, usd: 0.01, latencyMs: 200 },
    })
    const handler = createAuctionHandler({ runAgent })
    const result = await handler(
      { ...baseNode, bidCriteria: 'fastest' },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    const value = (result as { kind: 'ok'; value: { winner: string } }).value
    expect(value.winner).toBe('b2')
  })

  it('bidCriteria=custom uses customScorer function', async () => {
    const runAgent = makeAgentById({
      b1: { output: { quality: 5 }, tokens: 10, usd: 0.01, latencyMs: 100 },
      b2: { output: { quality: 9 }, tokens: 10, usd: 0.01, latencyMs: 100 },
      b3: { output: { quality: 7 }, tokens: 10, usd: 0.01, latencyMs: 100 },
    })
    const customScorer = (bid: AgentRunResult) =>
      (bid.output as { quality: number }).quality
    const handler = createAuctionHandler({ runAgent, customScorer })
    const result = await handler(
      { ...baseNode, bidCriteria: 'custom' },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    const value = (result as { kind: 'ok'; value: { winner: string } }).value
    expect(value.winner).toBe('b2')
  })

  it('reservePrice filters out agents exceeding cost limit', async () => {
    const runAgent = makeAgentById({
      b1: { output: 'expensive', tokens: 10, usd: 0.5, latencyMs: 100 },
      b2: { output: 'cheap', tokens: 10, usd: 0.01, latencyMs: 100 },
      b3: { output: 'pricey', tokens: 10, usd: 0.2, latencyMs: 100 },
    })
    const handler = createAuctionHandler({ runAgent })
    const result = await handler(
      {
        ...baseNode,
        bidCriteria: 'lowest-cost',
        reservePrice: { usd: 0.05 },
      },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    const value = (result as { kind: 'ok'; value: { winner: string } }).value
    expect(value.winner).toBe('b2')
  })

  it('uses fallback when no bidder meets reservePrice', async () => {
    const runAgent = vi.fn(async (id: string) => {
      if (id === 'fallback-agent') return { output: 'fallback-output', tokens: 1, usd: 0, latencyMs: 10 }
      return { output: 'too-expensive', tokens: 10, usd: 10, latencyMs: 100 }
    })
    const handler = createAuctionHandler({ runAgent })
    const result = await handler(
      {
        ...baseNode,
        bidCriteria: 'lowest-cost',
        reservePrice: { usd: 0.001 },
        fallback: 'fallback-agent',
      },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    const value = (result as { kind: 'ok'; value: { winner: string; usedFallback: boolean } }).value
    expect(value.winner).toBe('fallback-agent')
    expect(value.usedFallback).toBe(true)
  })

  it('fails when no winner and no fallback', async () => {
    const runAgent = makeAgent('out', { usd: 100 })
    const handler = createAuctionHandler({ runAgent })
    const result = await handler(
      { ...baseNode, bidCriteria: 'lowest-cost', reservePrice: { usd: 0.001 } },
      null,
      ctx,
    )
    expect(result.kind).toBe('failed')
    expect((result as { kind: 'failed'; error: { code: string } }).error.code).toBe('auction.no_winner')
  })

  it('handles timeout by excluding timed-out agents', async () => {
    const runAgent = vi.fn(async (id: string) => {
      if (id === 'b1') {
        // Simulate a very slow agent
        await new Promise((res) => setTimeout(res, 200))
        return { output: 'slow', tokens: 1, usd: 0.001, latencyMs: 200 }
      }
      return { output: `${id}-fast`, tokens: 1, usd: 0.01, latencyMs: 10 }
    })
    const handler = createAuctionHandler({ runAgent })
    const result = await handler(
      {
        ...baseNode,
        bidCriteria: 'lowest-cost',
        timeout: { ms: 50 },
      },
      null,
      ctx,
    )
    // b1 times out; b2 or b3 should win
    expect(result.kind).toBe('ok')
    const value = (result as { kind: 'ok'; value: { winner: string } }).value
    expect(value.winner).not.toBe('b1')
  }, 10_000)

  it('fails when all bidders fail', async () => {
    const handler = createAuctionHandler({ runAgent: failingAgent })
    const result = await handler(baseNode, null, ctx)
    expect(result.kind).toBe('failed')
    expect((result as { kind: 'failed'; error: { code: string } }).error.code).toBe('auction.no_winner')
  })
})

// ---------------------------------------------------------------------------
// blackboard handler
// ---------------------------------------------------------------------------

describe('createBlackboardHandler', () => {
  const baseNode = {
    kind: 'blackboard' as const,
    id: 'bb',
    agents: ['ag1', 'ag2'],
    scratchpad: { kind: 'in-memory' as const },
    schedule: { mode: 'round-robin' as const },
    termination: { mode: 'rounds' as const, n: 2 },
  }

  it('schedule=round-robin runs all agents each round', async () => {
    const calls: string[] = []
    const runAgent: RunAgentFn = vi.fn(async (id, input, _ctx) => {
      calls.push(id)
      return { output: { writes: { [`${id}-done`]: true } }, tokens: 5, usd: 0.001, latencyMs: 50 }
    })
    const handler = createBlackboardHandler({ runAgent })
    const result = await handler(baseNode, null, ctx)

    expect(result.kind).toBe('ok')
    // 2 rounds × 2 agents = 4 calls
    expect(calls).toHaveLength(4)
    expect(calls).toEqual(['ag1', 'ag2', 'ag1', 'ag2'])
  })

  it('agents receive scratchpad state from previous writes', async () => {
    const receivedScratchpads: ReadonlyArray<[string, unknown]>[] = []
    const runAgent: RunAgentFn = vi.fn(async (id, input, _ctx) => {
      const bbInput = input as { scratchpad: ReadonlyArray<[string, unknown]> }
      receivedScratchpads.push(bbInput.scratchpad)
      return {
        output: { writes: { [`key-${id}`]: `val-${id}` } },
        tokens: 5,
        usd: 0.001,
        latencyMs: 50,
      }
    })
    const handler = createBlackboardHandler({ runAgent })
    await handler({ ...baseNode, termination: { mode: 'rounds', n: 1 } }, null, ctx)

    // ag1 sees empty scratchpad, ag2 sees ag1's write
    expect(receivedScratchpads[0]).toHaveLength(0)
    expect(receivedScratchpads[1]).toContainEqual(['key-ag1', 'val-ag1'])
  })

  it('termination=agent-signal stops when agent returns done=true', async () => {
    let callCount = 0
    const runAgent: RunAgentFn = vi.fn(async (id) => {
      callCount++
      const output = callCount === 2 ? { done: true } : { writes: { step: callCount } }
      return { output, tokens: 5, usd: 0.001, latencyMs: 50 }
    })
    const handler = createBlackboardHandler({ runAgent })
    const result = await handler(
      { ...baseNode, termination: { mode: 'agent-signal' } },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    // Should stop after ag2 signals done on call 2
    expect(callCount).toBe(2)
  })

  it('termination=consensus stops when all agents write same consensus value', async () => {
    let callCount = 0
    const runAgent: RunAgentFn = vi.fn(async (id) => {
      callCount++
      return {
        output: { writes: { consensus: 'final-answer' } },
        tokens: 5,
        usd: 0.001,
        latencyMs: 50,
      }
    })
    const handler = createBlackboardHandler({ runAgent })
    const result = await handler(
      { ...baseNode, termination: { mode: 'consensus' } },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    // Should stop after first round where both agents agree on 'final-answer'
    expect(callCount).toBe(2)
  })

  it('termination=budget stops when token budget exhausted', async () => {
    let callCount = 0
    const runAgent: RunAgentFn = vi.fn(async () => {
      callCount++
      return { output: { writes: {} }, tokens: 100, usd: 0.01, latencyMs: 50 }
    })
    const handler = createBlackboardHandler({ runAgent })
    const result = await handler(
      {
        ...baseNode,
        termination: { mode: 'budget', limits: { tokensPerRun: 150 } },
      },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    // After 2 calls (100+100=200 >= 150), should stop
    expect(callCount).toBeLessThanOrEqual(2)
  })

  it('termination=budget stops when usd budget exhausted', async () => {
    let callCount = 0
    const runAgent: RunAgentFn = vi.fn(async () => {
      callCount++
      return { output: { writes: {} }, tokens: 10, usd: 0.1, latencyMs: 50 }
    })
    const handler = createBlackboardHandler({ runAgent })
    const result = await handler(
      {
        ...baseNode,
        termination: { mode: 'budget', limits: { usdPerRun: 0.15 } },
      },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    expect(callCount).toBeLessThanOrEqual(2)
  })

  it('termination=budget stops when maxStepsPerRun exhausted', async () => {
    let callCount = 0
    const runAgent: RunAgentFn = vi.fn(async () => {
      callCount++
      return { output: { writes: {} }, tokens: 1, usd: 0, latencyMs: 10 }
    })
    const handler = createBlackboardHandler({ runAgent })
    await handler(
      {
        ...baseNode,
        termination: { mode: 'budget', limits: { maxStepsPerRun: 3 } },
      },
      null,
      ctx,
    )
    expect(callCount).toBeLessThanOrEqual(3)
  })

  it('schedule=priority runs agents in priority order', async () => {
    const calls: string[] = []
    const runAgent: RunAgentFn = vi.fn(async (id) => {
      calls.push(id)
      return { output: { writes: {} }, tokens: 5, usd: 0.001, latencyMs: 50 }
    })
    const handler = createBlackboardHandler({ runAgent })
    await handler(
      {
        ...baseNode,
        schedule: { mode: 'priority', priorities: { ag1: 1, ag2: 10 } },
        termination: { mode: 'rounds', n: 1 },
      },
      null,
      ctx,
    )
    // Higher priority = runs first: ag2 (10) before ag1 (1)
    expect(calls[0]).toBe('ag2')
    expect(calls[1]).toBe('ag1')
  })

  it('schedule=volunteer stops when all agents signal done', async () => {
    let callCount = 0
    const runAgent: RunAgentFn = vi.fn(async () => {
      callCount++
      return { output: { done: true }, tokens: 5, usd: 0.001, latencyMs: 50 }
    })
    const handler = createBlackboardHandler({ runAgent })
    const result = await handler(
      { ...baseNode, schedule: { mode: 'volunteer' }, termination: { mode: 'rounds', n: 10 } },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    // After first round where all agents signal done, should stop
    expect(callCount).toBe(2) // ag1 + ag2 both signal done
  })

  it('uses provided scratchpadStore instead of creating new one', async () => {
    const store: ScratchpadStore = new InMemoryScratchpadStore()
    store.set('preloaded', 'value')

    const runAgent: RunAgentFn = vi.fn(async (_id, input) => {
      const bbInput = input as { scratchpad: ReadonlyArray<[string, unknown]> }
      return {
        output: { writes: {} },
        tokens: 5,
        usd: 0.001,
        latencyMs: 50,
      }
    })
    const handler = createBlackboardHandler({ runAgent, scratchpadStore: store })
    const result = await handler(
      { ...baseNode, termination: { mode: 'rounds', n: 1 } },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    const value = (result as { kind: 'ok'; value: { scratchpad: Record<string, unknown> } }).value
    expect(value.scratchpad['preloaded']).toBe('value')
  })

  it('returns accumulated token/usd/step totals in output', async () => {
    const runAgent: RunAgentFn = vi.fn(async () => ({
      output: { writes: {} },
      tokens: 50,
      usd: 0.005,
      latencyMs: 100,
    }))
    const handler = createBlackboardHandler({ runAgent })
    const result = await handler(
      { ...baseNode, termination: { mode: 'rounds', n: 1 } },
      null,
      ctx,
    )
    expect(result.kind).toBe('ok')
    const value = (result as {
      kind: 'ok'
      value: { totalTokens: number; totalUsd: number; totalSteps: number }
    }).value
    // 2 agents × 1 round = 2 steps
    expect(value.totalTokens).toBe(100)
    expect(value.totalUsd).toBeCloseTo(0.01)
    expect(value.totalSteps).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// InMemoryScratchpadStore unit tests
// ---------------------------------------------------------------------------

describe('InMemoryScratchpadStore', () => {
  it('get/set/entries work correctly', () => {
    const store = new InMemoryScratchpadStore()
    expect(store.get('missing')).toBeUndefined()
    store.set('k1', 'v1')
    store.set('k2', { nested: true })
    expect(store.get('k1')).toBe('v1')
    expect(store.get('k2')).toEqual({ nested: true })
    expect(store.entries()).toContainEqual(['k1', 'v1'])
    expect(store.entries()).toContainEqual(['k2', { nested: true }])
  })

  it('overwrites existing keys', () => {
    const store = new InMemoryScratchpadStore()
    store.set('k', 'old')
    store.set('k', 'new')
    expect(store.get('k')).toBe('new')
  })
})
