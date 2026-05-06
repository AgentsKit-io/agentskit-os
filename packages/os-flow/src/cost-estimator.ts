// Pre-flight cost estimator for a FlowConfig.
// Pure logic — no I/O. Prices and agent specs are injected by the caller.

import type {
  AgentConfig,
  FlowConfig,
  FlowNode,
  ModelPricing,
} from '@agentskit/os-core'
import { computeCost } from '@agentskit/os-core'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Per-node cost projection. */
export type NodeCostEstimate = {
  readonly nodeId: string
  /** Sum of input + output tokens assumed for this node. */
  readonly tokens: number
  /** Estimated cost in USD. */
  readonly usd: number
  /** Slugs of agents resolved for this node (1 for single-agent, N for fan-out). */
  readonly agentIds: readonly string[]
}

/** Result of estimateFlowCost. */
export type FlowCostEstimate = {
  readonly totalTokens: number
  readonly totalUsd: number
  readonly perNode: readonly NodeCostEstimate[]
}

/** Map from agent id to AgentConfig. Built by the caller from ConfigRoot.agents. */
export type AgentMap = ReadonlyMap<string, AgentConfig>

/** Map from "<provider>|<model>" to ModelPricing. Caller constructs from price table. */
export type PriceMap = ReadonlyMap<string, ModelPricing>

export type EstimateOptions = {
  readonly flow: FlowConfig
  /** All agents referenced by the flow. Missing entries produce zero-cost estimates. */
  readonly agents: AgentMap
  /** Price table keyed by "<provider>|<model>". Missing entries produce zero-cost estimates. */
  readonly prices: PriceMap
  /**
   * Default total token assumption per agent call when the agent config has no
   * explicit `maxTokens`.  Caller may override (e.g. 4096 for GPT-4o-mini).
   * Defaults to 2000.
   */
  readonly defaultModelTokens?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRICE_KEY_SEP = '|' as const

/** Build the map key used by PriceMap. */
export const priceKey = (provider: string, model: string): string =>
  `${provider}${PRICE_KEY_SEP}${model}`

/** Resolve the agents referenced by a single FlowNode. Returns agent slugs. */
const agentSlugsOf = (node: FlowNode): readonly string[] => {
  switch (node.kind) {
    case 'agent':
      return [node.agent]
    case 'compare':
    case 'vote':
    case 'blackboard':
      return node.agents
    case 'auction':
      return node.bidders
    case 'debate':
      // proponent + opponent + judge all need LLM calls in each round.
      return [node.proponent, node.opponent, node.judge]
    case 'llm-branch':
      // LLM router decides one branch per invocation.
      return [node.agent]
    // Non-LLM nodes:
    case 'tool':
    case 'human':
    case 'condition':
    case 'parallel':
      return []
  }
}

/** Estimate the token count for a single agent call. */
const tokenEstimate = (agent: AgentConfig | undefined, defaultModelTokens: number): number => {
  if (!agent) return 0
  // maxTokens is the output ceiling; assume half input / half output as a default.
  return agent.model.maxTokens ?? defaultModelTokens
}

/** Compute the USD cost for a single agent invocation. */
const usdEstimate = (
  agent: AgentConfig | undefined,
  tokens: number,
  prices: PriceMap,
): number => {
  if (!agent || tokens === 0) return 0
  const key = priceKey(agent.model.provider, agent.model.model)
  const pricing = prices.get(key)
  if (!pricing) return 0

  // Assume half of tokens are input, half are output (conservative symmetric split).
  const half = Math.ceil(tokens / 2)
  const breakdown = computeCost({ inputTokens: half, outputTokens: tokens - half }, pricing)
  return breakdown.total
}

// ---------------------------------------------------------------------------
// Core estimator
// ---------------------------------------------------------------------------

/**
 * Walk every node in `flow` in declaration order and project token + USD cost.
 * Multi-agent nodes (compare / vote / debate / auction / blackboard) fan out
 * across all agent slots. Debate nodes multiply by `rounds`.
 *
 * Missing agents or missing price entries produce zero-cost lines with a note
 * that they could not be resolved — callers should surface these to the user.
 */
export const estimateFlowCost = (opts: EstimateOptions): FlowCostEstimate => {
  const { flow, agents, prices, defaultModelTokens = 2_000 } = opts

  const perNode: NodeCostEstimate[] = []

  for (const node of flow.nodes) {
    const slugs = agentSlugsOf(node)

    if (slugs.length === 0) {
      // Non-LLM node — tool / human / condition / parallel: zero cost.
      perNode.push({ nodeId: node.id, tokens: 0, usd: 0, agentIds: [] })
      continue
    }

    // Fan-out multiplier (debate repeats over rounds).
    const fanMul = node.kind === 'debate' ? node.rounds : 1

    let nodeTokens = 0
    let nodeUsd = 0

    for (const slug of slugs) {
      const agent = agents.get(slug)
      const t = tokenEstimate(agent, defaultModelTokens) * fanMul
      const u = usdEstimate(agent, t, prices) * fanMul
      nodeTokens += t
      nodeUsd += u
    }

    perNode.push({ nodeId: node.id, tokens: nodeTokens, usd: nodeUsd, agentIds: slugs })
  }

  const totalTokens = perNode.reduce((s, n) => s + n.tokens, 0)
  const totalUsd = perNode.reduce((s, n) => s + n.usd, 0)

  return { totalTokens, totalUsd, perNode }
}
