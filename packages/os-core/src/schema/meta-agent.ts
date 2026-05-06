// Per #97 — meta-agent mode schema (agent orchestrates agents).
// Pure schema; runtime wiring lives in the orchestrator package.

import { z } from 'zod'
import { Slug } from './_primitives.js'

export const MetaAgentDelegationStrategy = z.enum([
  'auto',
  'broadcast',
  'pick-one',
  'race',
])
export type MetaAgentDelegationStrategy = z.infer<typeof MetaAgentDelegationStrategy>

export const MetaAgentChild = z.object({
  agent: Slug,
  /** Caller-defined role, e.g. 'planner', 'coder', 'reviewer'. */
  role: z.string().min(1).max(64),
  /** Optional natural-language brief the meta-agent prepends to the call. */
  brief: z.string().max(2_048).optional(),
})
export type MetaAgentChild = z.infer<typeof MetaAgentChild>

export const MetaAgentSpec = z.object({
  schemaVersion: z.literal(1).default(1),
  /** Slug of the meta-agent itself. */
  id: Slug,
  /** Coordinator agent that decides which child to run. */
  coordinator: Slug,
  children: z.array(MetaAgentChild).min(1).max(32),
  strategy: MetaAgentDelegationStrategy.default('auto'),
  /** Hard cap on coordinator iterations before the runtime aborts. */
  maxIterations: z.number().int().min(1).max(64).default(8),
  /** When true, child outputs are visible to subsequent children. */
  shareScratchpad: z.boolean().default(true),
})
export type MetaAgentSpec = z.infer<typeof MetaAgentSpec>

export const parseMetaAgentSpec = (input: unknown): MetaAgentSpec =>
  MetaAgentSpec.parse(input)
export const safeParseMetaAgentSpec = (input: unknown) => MetaAgentSpec.safeParse(input)

/** Lookup helper used by orchestrator runtimes (#97). */
export const childRoleMap = (spec: MetaAgentSpec): ReadonlyMap<string, MetaAgentChild> =>
  new Map(spec.children.map((c) => [c.role, c]))
