// Per ROADMAP M2 (#48). Git-like agent versioning.
// agents.json lives at .agentskitos/workspaces/<id>/agents.json.
// SemVer for display, content hash pinned in the lockfile.

import { z } from 'zod'
import { Slug } from './_primitives.js'
import { AgentLifecycleState, AgentRiskTier } from './agent-registry.js'

const SemVerString = z
  .string()
  .min(1)
  .max(64)
  .regex(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+){0,1}(\+[0-9A-Za-z.-]+){0,1}$/, {
    message: 'must be a SemVer 2.0 string',
  })

const ContentHashString = z
  .string()
  .regex(/^sha256:[0-9a-f]{64}$/, { message: 'must be sha256:<64-hex>' })

export const AgentVersionSnapshot = z.object({
  prompt: z.string().min(0).max(64_000),
  model: z.object({
    provider: z.string().min(1).max(64),
    name: z.string().min(1).max(128),
  }),
  tools: z.array(z.string().min(1).max(128)).default([]),
  dependencies: z.array(z.string().min(1).max(128)).default([]),
  lifecycleState: AgentLifecycleState,
  riskTier: AgentRiskTier,
  capabilities: z.array(z.string().min(1).max(128)).default([]),
})
export type AgentVersionSnapshot = z.infer<typeof AgentVersionSnapshot>

export const AgentVersion = z.object({
  agentId: Slug,
  semver: SemVerString,
  contentHash: ContentHashString,
  snapshot: AgentVersionSnapshot,
  at: z.string().datetime(),
  note: z.string().max(2048).optional(),
})
export type AgentVersion = z.infer<typeof AgentVersion>

export const AgentsManifestVersion = z.literal(1)

export const AgentsManifest = z.object({
  schemaVersion: AgentsManifestVersion,
  agents: z.record(Slug, z.array(AgentVersion).max(1024)).default({}),
})
export type AgentsManifest = z.infer<typeof AgentsManifest>

export const parseAgentVersion = (input: unknown): AgentVersion =>
  AgentVersion.parse(input)
export const safeParseAgentVersion = (input: unknown) =>
  AgentVersion.safeParse(input)
export const parseAgentsManifest = (input: unknown): AgentsManifest =>
  AgentsManifest.parse(input)
export const safeParseAgentsManifest = (input: unknown) =>
  AgentsManifest.safeParse(input)

const canonicalize = (s: AgentVersionSnapshot): string => {
  const ordered = {
    capabilities: [...s.capabilities].sort(),
    dependencies: [...s.dependencies].sort(),
    lifecycleState: s.lifecycleState,
    model: { name: s.model.name, provider: s.model.provider },
    prompt: s.prompt,
    riskTier: s.riskTier,
    tools: [...s.tools].sort(),
  }
  return JSON.stringify(ordered)
}

export type Hasher = (input: string) => string

export const hashSnapshot = (snapshot: AgentVersionSnapshot, hasher: Hasher): string =>
  `sha256:${hasher(canonicalize(snapshot))}`

export type BumpKind = 'major' | 'minor' | 'patch' | 'none'

export const suggestBump = (
  prev: AgentVersionSnapshot,
  next: AgentVersionSnapshot,
  hasher: Hasher,
): BumpKind => {
  if (hashSnapshot(prev, hasher) === hashSnapshot(next, hasher)) return 'none'

  const riskOrder: Record<AgentRiskTier, number> = { low: 0, medium: 1, high: 2, critical: 3 }
  if (riskOrder[next.riskTier] > riskOrder[prev.riskTier]) return 'major'

  const removed = (a: readonly string[], b: readonly string[]): boolean =>
    a.some((x) => !b.includes(x))
  if (removed(prev.capabilities, next.capabilities)) return 'major'
  if (prev.model.provider !== next.model.provider) return 'major'

  const added = (a: readonly string[], b: readonly string[]): boolean =>
    b.some((x) => !a.includes(x))
  if (
    added(prev.tools, next.tools) ||
    added(prev.dependencies, next.dependencies) ||
    added(prev.capabilities, next.capabilities) ||
    prev.model.name !== next.model.name
  ) {
    return 'minor'
  }

  if (prev.prompt !== next.prompt) return 'patch'
  return 'patch'
}

const SEMVER_HEAD_RE = /^(\d+)\.(\d+)\.(\d+)/

export const applyBump = (current: string, kind: BumpKind): string => {
  if (kind === 'none') return current
  const m = current.match(SEMVER_HEAD_RE)
  if (!m) throw new Error(`os.version.invalid_semver: ${current}`)
  let major = Number.parseInt(m[1] ?? '0', 10)
  let minor = Number.parseInt(m[2] ?? '0', 10)
  let patch = Number.parseInt(m[3] ?? '0', 10)
  if (kind === 'major') { major += 1; minor = 0; patch = 0 }
  else if (kind === 'minor') { minor += 1; patch = 0 }
  else patch += 1
  return `${major}.${minor}.${patch}`
}

export type SnapshotDiff = {
  readonly prompt: 'changed' | 'same'
  readonly model: 'changed' | 'same'
  readonly tools: { readonly added: readonly string[]; readonly removed: readonly string[] }
  readonly dependencies: { readonly added: readonly string[]; readonly removed: readonly string[] }
  readonly capabilities: { readonly added: readonly string[]; readonly removed: readonly string[] }
  readonly lifecycleState: 'changed' | 'same'
  readonly riskTier: 'changed' | 'same'
}

const setDiff = (prev: readonly string[], next: readonly string[]) => ({
  added: next.filter((x) => !prev.includes(x)),
  removed: prev.filter((x) => !next.includes(x)),
})

export const diffSnapshots = (prev: AgentVersionSnapshot, next: AgentVersionSnapshot): SnapshotDiff => ({
  prompt: prev.prompt === next.prompt ? 'same' : 'changed',
  model:
    prev.model.provider === next.model.provider && prev.model.name === next.model.name
      ? 'same'
      : 'changed',
  tools: setDiff(prev.tools, next.tools),
  dependencies: setDiff(prev.dependencies, next.dependencies),
  capabilities: setDiff(prev.capabilities, next.capabilities),
  lifecycleState: prev.lifecycleState === next.lifecycleState ? 'same' : 'changed',
  riskTier: prev.riskTier === next.riskTier ? 'same' : 'changed',
})
