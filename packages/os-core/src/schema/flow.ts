import { z } from 'zod'
import { Slug, TagList } from './_primitives.js'

export const RetryPolicy = z.object({
  maxAttempts: z.number().int().min(1).max(20).default(3),
  backoff: z.enum(['fixed', 'exponential']).default('exponential'),
  initialDelayMs: z.number().int().min(0).max(60_000).default(1_000),
})
export type RetryPolicy = z.infer<typeof RetryPolicy>

const NodeCommon = {
  id: Slug,
  label: z.string().min(1).max(128).optional(),
  retry: RetryPolicy.optional(),
  timeoutMs: z.number().int().positive().max(86_400_000).optional(),
}

export const AgentNode = z.object({
  ...NodeCommon,
  kind: z.literal('agent'),
  agent: Slug,
  input: z.record(z.string(), z.unknown()).optional(),
})
export type AgentNode = z.infer<typeof AgentNode>

export const ToolNode = z.object({
  ...NodeCommon,
  kind: z.literal('tool'),
  tool: z.string().min(1).max(128),
  input: z.record(z.string(), z.unknown()).optional(),
})
export type ToolNode = z.infer<typeof ToolNode>

export const HumanNode = z.object({
  ...NodeCommon,
  kind: z.literal('human'),
  prompt: z.string().min(1).max(2048),
  approvers: z.array(z.string().min(1).max(128)).max(32).default([]),
  /**
   * Minimum number of distinct approvers required before the node is
   * considered approved. Defaults to 1 (single-person approval).
   * Two-person HITL: set to 2.
   */
  quorum: z.number().int().min(1).max(32).default(1),
})
export type HumanNode = z.infer<typeof HumanNode>

export const ConditionNode = z.object({
  ...NodeCommon,
  kind: z.literal('condition'),
  expression: z.string().min(1).max(1024),
})
export type ConditionNode = z.infer<typeof ConditionNode>

export const ParallelNode = z.object({
  ...NodeCommon,
  kind: z.literal('parallel'),
  branches: z.array(Slug).min(2).max(64),
})
export type ParallelNode = z.infer<typeof ParallelNode>

// --- Multi-agent pattern nodes (RFC-0003) ---

const AgentRefArray = z.array(Slug).min(2).max(8)

export const CompareNode = z.object({
  ...NodeCommon,
  kind: z.literal('compare'),
  agents: AgentRefArray,
  input: z.record(z.string(), z.unknown()).optional(),
  selection: z.discriminatedUnion('mode', [
    z.object({
      mode: z.literal('manual'),
      presenter: z.enum(['side-by-side', 'tabs', 'overlay']).default('side-by-side'),
    }),
    z.object({ mode: z.literal('eval'), evalRef: Slug }),
    z.object({
      mode: z.literal('judge'),
      judgeAgent: Slug,
      criteria: z.string().min(1).max(2048),
    }),
    z.object({
      mode: z.literal('first'),
      metric: z.enum(['fastest', 'cheapest']),
    }),
    z.object({ mode: z.literal('all'), combine: z.enum(['concat', 'merge']) }),
  ]),
  isolation: z.enum(['isolated', 'shared-scratchpad']).default('isolated'),
})
export type CompareNode = z.infer<typeof CompareNode>

export const VoteNode = z
  .object({
    ...NodeCommon,
    kind: z.literal('vote'),
    agents: AgentRefArray,
    input: z.record(z.string(), z.unknown()).optional(),
    ballot: z.discriminatedUnion('mode', [
      z.object({ mode: z.literal('majority') }),
      z.object({
        mode: z.literal('weighted'),
        weights: z.record(Slug, z.number().nonnegative()),
      }),
      z.object({ mode: z.literal('unanimous') }),
      z.object({ mode: z.literal('quorum'), threshold: z.number().min(0).max(1) }),
    ]),
    outputType: z.enum(['classification', 'numeric', 'structured']),
    onTie: z.enum(['human', 'first', 'judge']).default('human'),
    judgeAgent: Slug.optional(),
  })
  .superRefine((node, ctx) => {
    if (node.agents.length % 2 === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['agents'],
        message: 'vote node requires an odd number of agents',
      })
    }
    if (node.onTie === 'judge' && !node.judgeAgent) {
      ctx.addIssue({
        code: 'custom',
        path: ['judgeAgent'],
        message: 'judgeAgent required when onTie="judge"',
      })
    }
  })
export type VoteNode = z.infer<typeof VoteNode>

export const DebateNode = z.object({
  ...NodeCommon,
  kind: z.literal('debate'),
  proponent: Slug,
  opponent: Slug,
  judge: Slug,
  topic: z.union([z.string().min(1).max(2048), z.record(z.string(), z.unknown())]),
  rounds: z.number().int().min(1).max(6).default(2),
  format: z.enum(['open', 'point-counterpoint', 'cross-examination']).default('open'),
  earlyExit: z.enum(['judge-decides', 'on-agreement']).default('judge-decides'),
})
export type DebateNode = z.infer<typeof DebateNode>

export const AuctionNode = z.object({
  ...NodeCommon,
  kind: z.literal('auction'),
  bidders: AgentRefArray,
  task: z.record(z.string(), z.unknown()).or(z.string().min(1).max(2048)),
  bidCriteria: z.enum(['lowest-cost', 'highest-confidence', 'fastest', 'custom']),
  customScorer: Slug.optional(),
  reservePrice: z
    .object({
      usd: z.number().nonnegative().optional(),
      tokens: z.number().int().nonnegative().optional(),
    })
    .optional(),
  fallback: Slug.optional(),
  timeout: z.object({ ms: z.number().int().positive().max(600_000) }).optional(),
})
export type AuctionNode = z.infer<typeof AuctionNode>

export const BlackboardScratchpad = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('in-memory') }),
  z.object({ kind: z.literal('sqlite'), path: z.string().min(1).max(1024) }),
  z.object({ kind: z.literal('memory-store'), ref: z.string().min(1).max(128) }),
])

export const BlackboardSchedule = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('round-robin') }),
  z.object({ mode: z.literal('volunteer') }),
  z.object({
    mode: z.literal('priority'),
    priorities: z.record(Slug, z.number()),
  }),
])

export const BlackboardTermination = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('rounds'), n: z.number().int().min(1).max(1000) }),
  z.object({ mode: z.literal('consensus') }),
  z.object({ mode: z.literal('agent-signal') }),
  z.object({
    mode: z.literal('budget'),
    limits: z.object({
      tokensPerRun: z.number().int().positive().optional(),
      usdPerRun: z.number().nonnegative().optional(),
      maxStepsPerRun: z.number().int().positive().optional(),
    }),
  }),
])

export const BlackboardNode = z.object({
  ...NodeCommon,
  kind: z.literal('blackboard'),
  agents: z.array(Slug).min(2).max(16),
  scratchpad: BlackboardScratchpad,
  schedule: BlackboardSchedule,
  termination: BlackboardTermination,
})
export type BlackboardNode = z.infer<typeof BlackboardNode>

/**
 * LLM-decision branching node (#67). The model is asked to choose one of
 * `branches` based on the prompt + run context; flow runtime emits one of
 * `branches[].outcome` strings (`true` / `false` / `success` / custom) so
 * standard FlowEdge `on` matching keeps working.
 */
export const LlmBranchNode = z.object({
  ...NodeCommon,
  kind: z.literal('llm-branch'),
  agent: Slug,
  prompt: z.string().min(1).max(8_192),
  branches: z
    .array(
      z.object({
        outcome: z.string().min(1).max(64),
        description: z.string().max(512).default(''),
      }),
    )
    .min(2)
    .max(16),
  /** Optional fallback outcome when the model's choice is not a known branch. */
  fallbackOutcome: z.string().min(1).max(64).optional(),
})
export type LlmBranchNode = z.infer<typeof LlmBranchNode>

export const FlowNode = z.discriminatedUnion('kind', [AgentNode, ToolNode, HumanNode, ConditionNode, ParallelNode, CompareNode, VoteNode, DebateNode, AuctionNode, BlackboardNode, LlmBranchNode])
export type FlowNode = z.infer<typeof FlowNode>

export const FlowEdge = z.object({
  from: Slug,
  to: Slug,
  on: z.enum(['success', 'failure', 'always', 'true', 'false']).default('success'),
})
export type FlowEdge = z.infer<typeof FlowEdge>

const checkAcyclicAndReachable = (flow: { nodes: FlowNode[]; edges: FlowEdge[]; entry: string }) => {
  const ids = new Set(flow.nodes.map((n) => n.id))
  if (!ids.has(flow.entry)) return { ok: false as const, message: `entry "${flow.entry}" not found in nodes` }
  for (const e of flow.edges) {
    if (!ids.has(e.from)) return { ok: false as const, message: `edge from "${e.from}" missing` }
    if (!ids.has(e.to)) return { ok: false as const, message: `edge to "${e.to}" missing` }
  }
  const adj = buildAdjacency(ids, flow.edges)

  const WHITE = 0,
    GRAY = 1,
    BLACK = 2
  const color = new Map<string, number>()
  for (const id of ids) color.set(id, WHITE)

  const dfs = (u: string): boolean => {
    color.set(u, GRAY)
    for (const v of adj.get(u) ?? []) {
      const c = color.get(v)
      if (c === GRAY) return true
      if (c === WHITE && dfs(v)) return true
    }
    color.set(u, BLACK)
    return false
  }

  if (containsCycle(ids, color, dfs)) return { ok: false as const, message: 'flow contains a cycle' }
  return { ok: true as const }
}

const buildAdjacency = (ids: ReadonlySet<string>, edges: readonly FlowEdge[]): Map<string, string[]> => {
  const adj = new Map<string, string[]>()
  for (const id of ids) adj.set(id, [])
  for (const e of edges) adj.get(e.from)!.push(e.to)
  return adj
}

const containsCycle = (
  ids: ReadonlySet<string>,
  color: Map<string, number>,
  dfs: (u: string) => boolean,
): boolean => {
  const WHITE = 0
  for (const id of ids) {
    if (color.get(id) === WHITE && dfs(id)) return true
  }
  return false
}

export const FlowConfig = z
  .object({
    id: Slug,
    name: z.string().min(1).max(128),
    description: z.string().max(1024).optional(),
    entry: Slug,
    nodes: z.array(FlowNode).min(1).max(512),
    edges: z.array(FlowEdge).max(2048).default([]),
    tags: TagList.default([]),
  })
  .superRefine((flow, ctx) => {
    const seen = new Set<string>()
    for (const n of flow.nodes) {
      if (seen.has(n.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['nodes'],
          message: `duplicate node id "${n.id}"`,
        })
        return
      }
      seen.add(n.id)
    }
    const result = checkAcyclicAndReachable(flow)
    if (!result.ok) {
      ctx.addIssue({ code: 'custom', path: ['edges'], message: result.message })
    }
  })

export type FlowConfig = z.infer<typeof FlowConfig>

export const parseFlowConfig = (input: unknown): FlowConfig => FlowConfig.parse(input)
export const safeParseFlowConfig = (input: unknown) => FlowConfig.safeParse(input)
