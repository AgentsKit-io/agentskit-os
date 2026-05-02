// Workspace lockfile per RFC-0002. Pure schema + canonicalization for hashing.

import { z } from 'zod'
import { Slug, TagList } from '../schema/_primitives.js'

export const LOCKFILE_VERSION = 1 as const

const Sha256 = z
  .string()
  .regex(/^sha256:[0-9a-f]{64}$/, { message: 'must be sha256:<64-hex>' })
const Sha512 = z
  .string()
  .regex(/^sha512:[0-9a-f]{128}$/, { message: 'must be sha512:<128-hex>' })
const SemverPlain = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/, {
    message: 'must be a SemVer string',
  })

export const LockSignature = z.object({
  algorithm: z.literal('ed25519'),
  publicKey: z.string().min(64).max(8192),
  signature: z.string().min(64).max(8192),
})

export const PluginLock = z.object({
  id: Slug,
  version: SemverPlain,
  source: z.string().min(1).max(512),
  integrity: Sha512,
  signature: LockSignature.optional(),
  resolvedAt: z.string().datetime({ offset: true }),
  contributes: z.array(z.string().min(1).max(64)).min(1).max(16),
  permissions: z.array(z.string().min(3).max(512)).max(64).default([]),
})
export type PluginLock = z.infer<typeof PluginLock>

export const ModelLock = z.object({
  provider: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  pinnedVersion: z.string().min(1).max(128),
  params: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().positive().max(1_000_000).optional(),
      topP: z.number().min(0).max(1).optional(),
    })
    .optional(),
})
export type ModelLock = z.infer<typeof ModelLock>

export const AgentLock = z.object({
  id: Slug,
  version: SemverPlain,
  contentHash: Sha256,
  model: ModelLock,
  promptHash: Sha256.optional(),
})
export type AgentLock = z.infer<typeof AgentLock>

export const FlowNodeLock = z.object({
  id: Slug,
  kind: z.string().min(1).max(64),
  toolRef: z.string().min(1).max(128).optional(),
  toolVersion: SemverPlain.optional(),
  agentRef: z.string().min(1).max(192).optional(),
})
export type FlowNodeLock = z.infer<typeof FlowNodeLock>

export const FlowLock = z.object({
  id: Slug,
  version: SemverPlain,
  contentHash: Sha256,
  nodes: z.array(FlowNodeLock).min(1).max(2048),
})
export type FlowLock = z.infer<typeof FlowLock>

export const ProviderLock = z.object({
  id: z.string().min(1).max(64),
  apiVersion: z.string().min(1).max(64),
})
export type ProviderLock = z.infer<typeof ProviderLock>

export const ToolLock = z.object({
  id: z.string().min(1).max(128),
  pluginId: Slug,
  version: SemverPlain,
  contentHash: Sha256,
  sideEffects: z.array(z.enum(['none', 'read', 'write', 'destructive', 'external'])).min(1).max(5),
})
export type ToolLock = z.infer<typeof ToolLock>

export const TemplateLock = z.object({
  id: z.string().min(1).max(192),
  version: SemverPlain,
  contentHash: Sha256,
})
export type TemplateLock = z.infer<typeof TemplateLock>

export const SchemaVersionsLock = z.object({
  osCore: SemverPlain,
  workspaceConfig: z.number().int().positive(),
})
export type SchemaVersionsLock = z.infer<typeof SchemaVersionsLock>

export const Lockfile = z.object({
  lockfileVersion: z.literal(LOCKFILE_VERSION),
  generatedAt: z.string().datetime({ offset: true }),
  generatedBy: z.string().min(1).max(128),
  workspace: z.object({
    id: Slug,
    configHash: Sha256,
    configPath: z.string().min(1).max(512),
  }),
  plugins: z.array(PluginLock).max(512).default([]),
  agents: z.array(AgentLock).max(1024).default([]),
  flows: z.array(FlowLock).max(2048).default([]),
  providers: z.array(ProviderLock).max(64).default([]),
  tools: z.array(ToolLock).max(2048).default([]),
  templates: z.array(TemplateLock).max(2048).default([]),
  schemas: SchemaVersionsLock,
  tags: TagList.default([]),
})
export type Lockfile = z.infer<typeof Lockfile>

export const parseLockfile = (input: unknown): Lockfile => Lockfile.parse(input)
export const safeParseLockfile = (input: unknown) => Lockfile.safeParse(input)

// Canonicalize: stable key order + normalized whitespace for hashing.
const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = canonicalize((value as Record<string, unknown>)[key])
    }
    return out
  }
  return value
}

export const canonicalJson = (value: unknown): string =>
  JSON.stringify(canonicalize(value))

const toHex = (bytes: Uint8Array): string => {
  let out = ''
  for (let i = 0; i < bytes.length; i++) out += bytes[i]!.toString(16).padStart(2, '0')
  return out
}

export const sha256OfCanonical = async (value: unknown): Promise<string> => {
  const data = new TextEncoder().encode(canonicalJson(value))
  const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  const buf = await crypto.subtle.digest('SHA-256', ab as ArrayBuffer)
  return `sha256:${toHex(new Uint8Array(buf))}`
}

export type LockDriftIssue =
  | { code: 'plugin_version_mismatch'; id: string; lock: string; current: string }
  | { code: 'plugin_missing_in_lock'; id: string }
  | { code: 'plugin_missing_in_workspace'; id: string }
  | { code: 'config_hash_mismatch'; lock: string; current: string }
  | { code: 'agent_content_drift'; id: string }
  | { code: 'flow_content_drift'; id: string }

export type DriftCheckInput = {
  readonly lock: Lockfile
  readonly currentConfigHash: string
  readonly installedPlugins: ReadonlyArray<{ id: string; version: string }>
  readonly currentAgentHashes?: ReadonlyMap<string, string>
  readonly currentFlowHashes?: ReadonlyMap<string, string>
}

export const detectLockDrift = (input: DriftCheckInput): readonly LockDriftIssue[] => {
  const issues: LockDriftIssue[] = []

  if (input.lock.workspace.configHash !== input.currentConfigHash) {
    issues.push({
      code: 'config_hash_mismatch',
      lock: input.lock.workspace.configHash,
      current: input.currentConfigHash,
    })
  }

  const lockedPlugins = new Map(input.lock.plugins.map((p) => [p.id, p]))
  const installed = new Map(input.installedPlugins.map((p) => [p.id, p]))

  for (const [id, lp] of lockedPlugins) {
    const inst = installed.get(id)
    if (!inst) {
      issues.push({ code: 'plugin_missing_in_workspace', id })
      continue
    }
    if (inst.version !== lp.version) {
      issues.push({
        code: 'plugin_version_mismatch',
        id,
        lock: lp.version,
        current: inst.version,
      })
    }
  }

  for (const id of installed.keys()) {
    if (!lockedPlugins.has(id)) {
      issues.push({ code: 'plugin_missing_in_lock', id })
    }
  }

  if (input.currentAgentHashes) {
    for (const a of input.lock.agents) {
      const cur = input.currentAgentHashes.get(a.id)
      if (cur !== undefined && cur !== a.contentHash) {
        issues.push({ code: 'agent_content_drift', id: a.id })
      }
    }
  }

  if (input.currentFlowHashes) {
    for (const f of input.lock.flows) {
      const cur = input.currentFlowHashes.get(f.id)
      if (cur !== undefined && cur !== f.contentHash) {
        issues.push({ code: 'flow_content_drift', id: f.id })
      }
    }
  }

  return issues
}
