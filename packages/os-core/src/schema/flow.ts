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

export const FlowNode = z.discriminatedUnion('kind', [
  AgentNode,
  ToolNode,
  HumanNode,
  ConditionNode,
  ParallelNode,
])
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
  const adj = new Map<string, string[]>()
  for (const id of ids) adj.set(id, [])
  for (const e of flow.edges) adj.get(e.from)!.push(e.to)

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

  for (const id of ids) {
    if (color.get(id) === WHITE && dfs(id)) {
      return { ok: false as const, message: 'flow contains a cycle' }
    }
  }
  return { ok: true as const }
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
