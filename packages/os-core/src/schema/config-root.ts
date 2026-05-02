import { z } from 'zod'
import { WorkspaceConfig, SCHEMA_VERSION } from './workspace.js'
import { AgentConfig } from './agent.js'
import { TriggerConfig } from './trigger.js'
import { FlowConfig } from './flow.js'
import { PluginConfig } from './plugin.js'
import { VaultConfig } from './vault.js'
import { MemoryConfig } from './memory.js'
import { ObservabilityConfig } from './observability.js'
import { SecurityConfig } from './security.js'
import { CloudSyncConfig } from './cloud.js'
import { RagConfig } from './rag.js'

export const CONFIG_ROOT_VERSION = SCHEMA_VERSION

const checkUnique = (
  ids: readonly string[],
  ctx: z.RefinementCtx,
  path: (string | number)[],
  what: string,
): boolean => {
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) {
      ctx.addIssue({ code: 'custom', path, message: `duplicate ${what} id "${id}"` })
      return false
    }
    seen.add(id)
  }
  return true
}

export const ConfigRoot = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    workspace: WorkspaceConfig,
    vault: VaultConfig,
    security: SecurityConfig,
    observability: ObservabilityConfig,
    cloud: CloudSyncConfig.optional(),
    plugins: z.array(PluginConfig).max(512).default([]),
    agents: z.array(AgentConfig).max(1024).default([]),
    flows: z.array(FlowConfig).max(2048).default([]),
    triggers: z.array(TriggerConfig).max(2048).default([]),
    memory: z.record(z.string().min(1).max(64), MemoryConfig).default({}),
    rag: RagConfig.optional(),
  })
  .superRefine((root, ctx) => {
    if (root.workspace.schemaVersion !== root.schemaVersion) {
      ctx.addIssue({
        code: 'custom',
        path: ['workspace', 'schemaVersion'],
        message: 'workspace.schemaVersion must equal root schemaVersion',
      })
      return
    }

    const pluginIds = root.plugins.map((p) => p.id)
    const agentIds = root.agents.map((a) => a.id)
    const flowIds = root.flows.map((f) => f.id)
    const triggerIds = root.triggers.map((t) => t.id)
    const memoryRefs = new Set(Object.keys(root.memory))

    if (!checkUnique(pluginIds, ctx, ['plugins'], 'plugin')) return
    if (!checkUnique(agentIds, ctx, ['agents'], 'agent')) return
    if (!checkUnique(flowIds, ctx, ['flows'], 'flow')) return
    if (!checkUnique(triggerIds, ctx, ['triggers'], 'trigger')) return

    const flowSet = new Set(flowIds)
    const agentSet = new Set(agentIds)

    root.triggers.forEach((t, i) => {
      if (!flowSet.has(t.flow)) {
        ctx.addIssue({
          code: 'custom',
          path: ['triggers', i, 'flow'],
          message: `trigger references unknown flow "${t.flow}"`,
        })
      }
    })

    root.flows.forEach((f, fi) => {
      f.nodes.forEach((n, ni) => {
        if (n.kind === 'agent' && !agentSet.has(n.agent)) {
          ctx.addIssue({
            code: 'custom',
            path: ['flows', fi, 'nodes', ni, 'agent'],
            message: `flow node references unknown agent "${n.agent}"`,
          })
        }
      })
    })

    const ragIds = new Set((root.rag?.pipelines ?? []).map((p) => p.id))
    if (root.rag) {
      const ids = root.rag.pipelines.map((p) => p.id)
      if (!checkUnique(ids, ctx, ['rag', 'pipelines'], 'rag pipeline')) return
    }

    root.agents.forEach((a, i) => {
      if (a.memory && !memoryRefs.has(a.memory.ref)) {
        ctx.addIssue({
          code: 'custom',
          path: ['agents', i, 'memory', 'ref'],
          message: `agent references unknown memory ref "${a.memory.ref}"`,
        })
      }
      a.ragRefs.forEach((ref, ri) => {
        if (!ragIds.has(ref)) {
          ctx.addIssue({
            code: 'custom',
            path: ['agents', i, 'ragRefs', ri],
            message: `agent references unknown rag pipeline "${ref}"`,
          })
        }
      })
    })

    if (root.security.requireSignedPlugins) {
      root.plugins.forEach((p, i) => {
        if (!p.signature) {
          ctx.addIssue({
            code: 'custom',
            path: ['plugins', i, 'signature'],
            message: `security.requireSignedPlugins is true; plugin "${p.id}" must have signature`,
          })
        }
      })
    }
  })

export type ConfigRoot = z.infer<typeof ConfigRoot>

export const parseConfigRoot = (input: unknown): ConfigRoot => ConfigRoot.parse(input)
export const safeParseConfigRoot = (input: unknown) => ConfigRoot.safeParse(input)
