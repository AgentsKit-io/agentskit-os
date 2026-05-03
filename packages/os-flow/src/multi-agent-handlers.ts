/**
 * Default in-memory handlers for the five multi-agent flow node kinds
 * defined in RFC-0003. Pure orchestration — no I/O, no fetch, no fs.
 * All side-effectful operations are injected by the host via `runAgent`.
 */

import type {
  AuctionNode,
  BlackboardNode,
  CompareNode,
  DebateNode,
  RunContext,
  VoteNode,
} from '@agentskit/os-core'

import type { NodeOutcome } from './handlers.js'

// ---------------------------------------------------------------------------
// Shared agent runner contract
// ---------------------------------------------------------------------------

export type AgentRunResult = {
  output: unknown
  tokens?: number
  usd?: number
  latencyMs?: number
}

export type RunAgentFn = (
  agentId: string,
  input: unknown,
  ctx: RunContext,
) => Promise<AgentRunResult>

// ---------------------------------------------------------------------------
// Blackboard scratchpad store contract + default in-memory implementation
// ---------------------------------------------------------------------------

export type ScratchpadStore = {
  get(key: string): unknown
  set(key: string, value: unknown): void
  entries(): ReadonlyArray<[string, unknown]>
}

export class InMemoryScratchpadStore implements ScratchpadStore {
  private readonly _data = new Map<string, unknown>()

  get(key: string): unknown {
    return this._data.get(key)
  }

  set(key: string, value: unknown): void {
    this._data.set(key, value)
  }

  entries(): ReadonlyArray<[string, unknown]> {
    return [...this._data.entries()]
  }
}

// ---------------------------------------------------------------------------
// 1. compare handler
// ---------------------------------------------------------------------------

/** Function called when selection.mode === 'eval'. Returns the index of the winning result. */
export type CompareEvalFn = (
  results: AgentRunResult[],
  evalRef: string,
  ctx: RunContext,
) => Promise<number>

/** Function called when selection.mode === 'judge'. Returns the index of the winning result. */
export type CompareJudgeFn = (
  results: AgentRunResult[],
  agentIds: string[],
  criteria: string,
  judgeAgent: string,
  ctx: RunContext,
) => Promise<number>

export type CompareHandlerOptions = {
  runAgent: RunAgentFn
  /** Optional external evaluator invoked when selection.mode === 'eval'. */
  evaluator?: CompareEvalFn
  /** Optional judge function invoked when selection.mode === 'judge'. */
  judger?: CompareJudgeFn
}

type IndexedResult = { idx: number; agentId: string; result: AgentRunResult }

export const createCompareHandler = (opts: CompareHandlerOptions) => {
  return async (
    node: CompareNode,
    input: unknown,
    ctx: RunContext,
  ): Promise<NodeOutcome> => {
    const nodeInput = node.input ?? (input as Record<string, unknown> | undefined)

    // Fan out to all agents concurrently
    const settled = await Promise.allSettled(
      node.agents.map((agentId) => opts.runAgent(agentId, nodeInput, ctx)),
    )

    const results: IndexedResult[] = []
    for (let i = 0; i < settled.length; i++) {
      const s = settled[i]!
      if (s.status === 'fulfilled') {
        results.push({ idx: i, agentId: node.agents[i]!, result: s.value })
      }
    }

    if (results.length === 0) {
      return {
        kind: 'failed',
        error: { code: 'compare.all_agents_failed', message: 'all agents returned errors' },
      }
    }

    const sel = node.selection

    switch (sel.mode) {
      case 'manual':
        // HITL — return all outputs for human selection
        return { kind: 'paused', reason: 'hitl' }

      case 'all': {
        const outputs = results.map((r) => r.result.output)
        const combined =
          sel.combine === 'concat'
            ? Array.isArray(outputs[0])
              ? (outputs as unknown[][]).flat()
              : outputs
            : Object.assign(
                {},
                ...outputs.map((o) => (typeof o === 'object' && o !== null ? o : {})),
              )
        return { kind: 'ok', value: combined }
      }

      case 'first': {
        if (sel.metric === 'fastest') {
          const winner = results.reduce((best, cur) => {
            const bLat = best.result.latencyMs ?? Infinity
            const cLat = cur.result.latencyMs ?? Infinity
            return cLat < bLat ? cur : best
          })
          return { kind: 'ok', value: winner.result.output }
        } else {
          // cheapest
          const winner = results.reduce((best, cur) => {
            const bCost = best.result.usd ?? Infinity
            const cCost = cur.result.usd ?? Infinity
            return cCost < bCost ? cur : best
          })
          return { kind: 'ok', value: winner.result.output }
        }
      }

      case 'eval': {
        if (!opts.evaluator) {
          return {
            kind: 'failed',
            error: {
              code: 'compare.evaluator_not_provided',
              message:
                'selection.mode=eval requires an evaluator function injected via createCompareHandler options',
            },
          }
        }
        const winnerIdx = await opts.evaluator(results.map((r) => r.result), sel.evalRef, ctx)
        const winner = results[winnerIdx]
        if (!winner) {
          return {
            kind: 'failed',
            error: {
              code: 'compare.eval_invalid_index',
              message: `evaluator returned index ${winnerIdx} out of range`,
            },
          }
        }
        return { kind: 'ok', value: winner.result.output }
      }

      case 'judge': {
        if (!opts.judger) {
          return {
            kind: 'failed',
            error: {
              code: 'compare.judger_not_provided',
              message:
                'selection.mode=judge requires a judger function injected via createCompareHandler options',
            },
          }
        }
        const winnerIdx = await opts.judger(
          results.map((r) => r.result),
          results.map((r) => r.agentId),
          sel.criteria,
          sel.judgeAgent,
          ctx,
        )
        const winner = results[winnerIdx]
        if (!winner) {
          return {
            kind: 'failed',
            error: {
              code: 'compare.judge_invalid_index',
              message: `judger returned index ${winnerIdx} out of range`,
            },
          }
        }
        return { kind: 'ok', value: winner.result.output }
      }

      default: {
        const _exhaustive: never = sel
        return {
          kind: 'failed',
          error: { code: 'compare.unknown_mode', message: `unknown selection mode: ${(_exhaustive as { mode: string }).mode}` },
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 2. vote handler
// ---------------------------------------------------------------------------

/** Function called when onTie='judge'. Receives outputs and returns winning value. */
export type VoteJudgeFn = (
  outputs: unknown[],
  agentIds: string[],
  judgeAgent: string,
  ctx: RunContext,
) => Promise<unknown>

export type VoteHandlerOptions = {
  runAgent: RunAgentFn
  /** Optional judge function for onTie='judge'. */
  judger?: VoteJudgeFn
}

const tally = (
  outputs: unknown[],
  agentIds: string[],
  weights: Record<string, number> | undefined,
): Map<string, number> => {
  const scores = new Map<string, number>()
  for (let i = 0; i < outputs.length; i++) {
    const key = JSON.stringify(outputs[i])
    const w = weights ? (weights[agentIds[i]!] ?? 1) : 1
    scores.set(key, (scores.get(key) ?? 0) + w)
  }
  return scores
}

const plurality = (
  scores: Map<string, number>,
): { winner: string; topScore: number; isTie: boolean } => {
  let topScore = -Infinity
  let winner = ''
  for (const [k, s] of scores) {
    if (s > topScore) {
      topScore = s
      winner = k
    }
  }
  const tiers = [...scores.values()].filter((s) => s === topScore)
  return { winner, topScore, isTie: tiers.length > 1 }
}

export const createVoteHandler = (opts: VoteHandlerOptions) => {
  return async (
    node: VoteNode,
    input: unknown,
    ctx: RunContext,
  ): Promise<NodeOutcome> => {
    const nodeInput = node.input ?? (input as Record<string, unknown> | undefined)

    const settled = await Promise.allSettled(
      node.agents.map((agentId) => opts.runAgent(agentId, nodeInput, ctx)),
    )

    const votes: { agentId: string; output: unknown }[] = []
    for (let i = 0; i < settled.length; i++) {
      const s = settled[i]!
      if (s.status === 'fulfilled') {
        votes.push({ agentId: node.agents[i]!, output: s.value.output })
      }
    }

    if (votes.length === 0) {
      return {
        kind: 'failed',
        error: { code: 'vote.all_agents_failed', message: 'all agents failed' },
      }
    }

    const outputs = votes.map((v) => v.output)
    const agentIds = votes.map((v) => v.agentId)
    const ballot = node.ballot

    const resolveWinner = (rawKey: string): NodeOutcome => {
      return { kind: 'ok', value: JSON.parse(rawKey) }
    }

    const handleTie = async (): Promise<NodeOutcome> => {
      switch (node.onTie) {
        case 'human':
          return { kind: 'paused', reason: 'hitl' }
        case 'first':
          return { kind: 'ok', value: outputs[0] }
        case 'judge': {
          if (!opts.judger || !node.judgeAgent) {
            return { kind: 'paused', reason: 'hitl' }
          }
          const judged = await opts.judger(outputs, agentIds, node.judgeAgent, ctx)
          return { kind: 'ok', value: judged }
        }
        default: {
          const _exhaustive: never = node.onTie
          return { kind: 'paused', reason: 'hitl' }
        }
      }
    }

    switch (ballot.mode) {
      case 'majority': {
        const scores = tally(outputs, agentIds, undefined)
        const total = votes.length
        const { winner, topScore, isTie } = plurality(scores)
        if (isTie || topScore <= total / 2) {
          return handleTie()
        }
        return resolveWinner(winner)
      }

      case 'weighted': {
        const scores = tally(outputs, agentIds, ballot.weights)
        const { winner, isTie } = plurality(scores)
        if (isTie) return handleTie()
        return resolveWinner(winner)
      }

      case 'unanimous': {
        const first = JSON.stringify(outputs[0])
        const allSame = outputs.every((o) => JSON.stringify(o) === first)
        if (!allSame) return handleTie()
        return { kind: 'ok', value: outputs[0] }
      }

      case 'quorum': {
        const scores = tally(outputs, agentIds, undefined)
        const total = votes.length
        const { winner, topScore, isTie } = plurality(scores)
        if (isTie || topScore / total < ballot.threshold) {
          return handleTie()
        }
        return resolveWinner(winner)
      }

      default: {
        const _exhaustive: never = ballot
        return {
          kind: 'failed',
          error: { code: 'vote.unknown_ballot_mode', message: `unknown ballot mode` },
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 3. debate handler
// ---------------------------------------------------------------------------

export type DebateHandlerOptions = {
  runAgent: RunAgentFn
}

type DebateMessage = { role: 'proponent' | 'opponent'; content: unknown }

export const createDebateHandler = (opts: DebateHandlerOptions) => {
  return async (
    node: DebateNode,
    input: unknown,
    ctx: RunContext,
  ): Promise<NodeOutcome> => {
    const topic = node.topic
    const transcript: DebateMessage[] = []

    for (let round = 0; round < node.rounds; round++) {
      // Proponent turn
      const proResult = await opts.runAgent(
        node.proponent,
        { topic, format: node.format, round, transcript: [...transcript], role: 'proponent', input },
        ctx,
      )
      transcript.push({ role: 'proponent', content: proResult.output })

      // Opponent turn
      const oppResult = await opts.runAgent(
        node.opponent,
        { topic, format: node.format, round, transcript: [...transcript], role: 'opponent', input },
        ctx,
      )
      transcript.push({ role: 'opponent', content: oppResult.output })

      // Early exit check
      if (node.earlyExit === 'on-agreement') {
        const proOutputs = transcript.filter((m) => m.role === 'proponent')
        const oppOutputs = transcript.filter((m) => m.role === 'opponent')
        const lastPro = proOutputs[proOutputs.length - 1]
        const lastOpp = oppOutputs[oppOutputs.length - 1]
        if (
          lastPro !== undefined &&
          lastOpp !== undefined &&
          JSON.stringify(lastPro.content) === JSON.stringify(lastOpp.content)
        ) {
          break
        }
      }
      // 'judge-decides' earlyExit: judge runs at end, no early exit from debate
    }

    // Judge resolves
    const judgeResult = await opts.runAgent(
      node.judge,
      { topic, format: node.format, transcript: [...transcript], role: 'judge', input },
      ctx,
    )

    return {
      kind: 'ok',
      value: {
        verdict: judgeResult.output,
        transcript,
      },
    }
  }
}

// ---------------------------------------------------------------------------
// 4. auction handler
// ---------------------------------------------------------------------------

/** Custom scorer function for bidCriteria='custom'. Returns a numeric score (higher wins). */
export type AuctionScorerFn = (bid: AgentRunResult, agentId: string) => number

export type AuctionHandlerOptions = {
  runAgent: RunAgentFn
  /** Custom scorer when node.bidCriteria === 'custom'. */
  customScorer?: AuctionScorerFn
}

type Bid = { agentId: string; result: AgentRunResult; score: number }

const scoreBid = (
  result: AgentRunResult,
  agentId: string,
  criteria: AuctionNode['bidCriteria'],
  customScorer?: AuctionScorerFn,
): number => {
  switch (criteria) {
    case 'lowest-cost':
      return -(result.usd ?? Infinity)
    case 'highest-confidence': {
      const conf = typeof result.output === 'number' ? result.output : Number(result.output)
      return isNaN(conf) ? -Infinity : conf
    }
    case 'fastest':
      return -(result.latencyMs ?? Infinity)
    case 'custom':
      return customScorer ? customScorer(result, agentId) : -Infinity
    default: {
      const _exhaustive: never = criteria
      return -Infinity
    }
  }
}

const passesReservePrice = (
  result: AgentRunResult,
  reservePrice: AuctionNode['reservePrice'],
): boolean => {
  if (!reservePrice) return true
  if (reservePrice.usd !== undefined && (result.usd ?? 0) > reservePrice.usd) return false
  if (reservePrice.tokens !== undefined && (result.tokens ?? 0) > reservePrice.tokens) return false
  return true
}

export const createAuctionHandler = (opts: AuctionHandlerOptions) => {
  return async (
    node: AuctionNode,
    input: unknown,
    ctx: RunContext,
  ): Promise<NodeOutcome> => {
    const task = node.task ?? input

    const runWithTimeout = (agentId: string): Promise<AgentRunResult> => {
      const p = opts.runAgent(agentId, task, ctx)
      if (!node.timeout) return p
      return Promise.race([
        p,
        new Promise<AgentRunResult>((_, reject) =>
          setTimeout(
            () => reject(new Error(`auction.timeout:${agentId}`)),
            node.timeout!.ms,
          ),
        ),
      ])
    }

    const settled = await Promise.allSettled(
      node.bidders.map((id) => runWithTimeout(id)),
    )

    const bids: Bid[] = []
    for (let i = 0; i < settled.length; i++) {
      const s = settled[i]!
      if (s.status === 'fulfilled') {
        const agentId = node.bidders[i]!
        const result = s.value
        if (!passesReservePrice(result, node.reservePrice)) continue
        const score = scoreBid(result, agentId, node.bidCriteria, opts.customScorer)
        bids.push({ agentId, result, score })
      }
    }

    if (bids.length === 0) {
      if (node.fallback) {
        const fallbackResult = await opts.runAgent(node.fallback, task, ctx)
        return {
          kind: 'ok',
          value: { winner: node.fallback, output: fallbackResult.output, usedFallback: true },
        }
      }
      return {
        kind: 'failed',
        error: {
          code: 'auction.no_winner',
          message: 'no bidder met reserve price and no fallback configured',
        },
      }
    }

    const winner = bids.reduce((best, cur) => (cur.score > best.score ? cur : best))

    return {
      kind: 'ok',
      value: {
        winner: winner.agentId,
        output: winner.result.output,
        score: winner.score,
        usedFallback: false,
      },
    }
  }
}

// ---------------------------------------------------------------------------
// 5. blackboard handler
// ---------------------------------------------------------------------------

export type BlackboardHandlerOptions = {
  runAgent: RunAgentFn
  /**
   * Override the scratchpad store. If omitted, a fresh InMemoryScratchpadStore
   * is created per run (suitable for tests and in-memory execution).
   */
  scratchpadStore?: ScratchpadStore
}

type BlackboardAgentInput = {
  scratchpad: ReadonlyArray<[string, unknown]>
  agentId: string
  round: number
  stepInRound: number
  input: unknown
}

/**
 * Agents must return an object with optional `writes` and `done` fields.
 * - `writes`: key-value pairs to write to the shared scratchpad
 * - `done`: when `true`, signals termination (for `agent-signal` mode)
 */
type BlackboardAgentOutput = {
  writes?: Record<string, unknown>
  done?: boolean
}

const parseBbOutput = (raw: unknown): BlackboardAgentOutput => {
  if (typeof raw === 'object' && raw !== null) {
    return raw as BlackboardAgentOutput
  }
  return {}
}

const orderedAgents = (
  agents: string[],
  sched: BlackboardNode['schedule'],
): string[] => {
  switch (sched.mode) {
    case 'round-robin':
    case 'volunteer':
      return [...agents]
    case 'priority':
      return [...agents].sort((a, b) => {
        const pa = sched.priorities[a] ?? 0
        const pb = sched.priorities[b] ?? 0
        return pb - pa // descending
      })
    default: {
      const _exhaustive: never = sched
      return [...agents]
    }
  }
}

export const createBlackboardHandler = (opts: BlackboardHandlerOptions) => {
  return async (
    node: BlackboardNode,
    input: unknown,
    ctx: RunContext,
  ): Promise<NodeOutcome> => {
    const store = opts.scratchpadStore ?? new InMemoryScratchpadStore()
    const term = node.termination

    let totalTokens = 0
    let totalUsd = 0
    let totalSteps = 0
    let done = false

    const maxRounds = term.mode === 'rounds' ? term.n : 1000

    for (let round = 0; round < maxRounds && !done; round++) {
      const agents = orderedAgents([...node.agents], node.schedule)
      let allDone = true // track if all agents signal done (volunteer mode consensus)
      let consensusValue: string | undefined

      for (let stepIdx = 0; stepIdx < agents.length && !done; stepIdx++) {
        const agentId = agents[stepIdx]!
        const bbInput: BlackboardAgentInput = {
          scratchpad: store.entries(),
          agentId,
          round,
          stepInRound: stepIdx,
          input,
        }

        const result = await opts.runAgent(agentId, bbInput, ctx)
        totalSteps++
        totalTokens += result.tokens ?? 0
        totalUsd += result.usd ?? 0

        const parsed = parseBbOutput(result.output)

        if (parsed.writes) {
          for (const [k, v] of Object.entries(parsed.writes)) {
            store.set(k, v)
          }
        }

        if (!parsed.done) allDone = false

        switch (term.mode) {
          case 'agent-signal':
            if (parsed.done) done = true
            break

          case 'consensus': {
            const c = store.get('consensus')
            if (c !== undefined) {
              const serialized = JSON.stringify(c)
              if (consensusValue === undefined) {
                consensusValue = serialized
              } else if (consensusValue !== serialized) {
                consensusValue = undefined // agents disagree
              }
            }
            break
          }

          case 'budget': {
            const limits = term.limits
            if (limits.tokensPerRun !== undefined && totalTokens >= limits.tokensPerRun) done = true
            if (limits.usdPerRun !== undefined && totalUsd >= limits.usdPerRun) done = true
            if (limits.maxStepsPerRun !== undefined && totalSteps >= limits.maxStepsPerRun) done = true
            break
          }

          case 'rounds':
            // Handled by outer loop bound
            break

          default: {
            const _exhaustive: never = term
            break
          }
        }
      }

      // After all agents in round have run, check consensus
      if (term.mode === 'consensus' && consensusValue !== undefined) {
        done = true
      }

      // Volunteer mode: if all agents signaled done, stop
      if (node.schedule.mode === 'volunteer' && allDone) {
        done = true
      }
    }

    return {
      kind: 'ok',
      value: {
        scratchpad: Object.fromEntries(store.entries()),
        totalTokens,
        totalUsd,
        totalSteps,
      },
    }
  }
}
