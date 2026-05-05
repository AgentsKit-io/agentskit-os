// Plugin extension catalog per ADR-0012. Pure registry types + hot-reload
// taxonomy + stability tiers. Implementations live in higher packages.

import { z } from 'zod'
import { Slug } from '../schema/_primitives.js'

export const EXTENSION_API_VERSION = '1.0' as const

export const EXTENSION_POINTS = [
  'trigger',
  'tool',
  'skill',
  'agent-template',
  'flow-node-kind',
  'memory-backend',
  'vault-backend',
  'sandbox-runtime',
  'egress-enforcer',
  'obs-exporter',
  'firewall-rule',
  'output-guard',
  'pii-category',
  'run-mode',
  'audit-signer',
  'cost-meter',
  'ui-panel',
  'ui-widget',
  'command-palette-action',
  'mcp-bridge-adapter',
  'migration-importer',
  'template-pack',
  'consent-policy',
  'brand-kit-validator',
] as const

export type ExtensionPoint = (typeof EXTENSION_POINTS)[number]
export const ExtensionPoint = z.enum(EXTENSION_POINTS)

export const StabilityTier = z.enum(['stable', 'experimental', 'internal'])
export type StabilityTier = z.infer<typeof StabilityTier>

const EXPERIMENTAL: ReadonlySet<ExtensionPoint> = new Set([
  'flow-node-kind',
  'consent-policy',
  'brand-kit-validator',
  'cost-meter',
])

export const stabilityOf = (point: ExtensionPoint): StabilityTier =>
  {
    if (EXPERIMENTAL.has(point)) return 'experimental'
    return 'stable'
  }

const HOT_RELOADABLE: ReadonlySet<ExtensionPoint> = new Set([
  'tool',
  'skill',
  'agent-template',
  'template-pack',
  'ui-panel',
  'ui-widget',
  'command-palette-action',
])

export const isHotReloadable = (point: ExtensionPoint): boolean => HOT_RELOADABLE.has(point)

export const ExtensionRegistration = z.object({
  point: ExtensionPoint,
  id: Slug,
  pluginId: Slug,
  description: z.string().max(512).optional(),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+){0,1}(\+[0-9A-Za-z.-]+){0,1}$/),
})
export type ExtensionRegistration = z.infer<typeof ExtensionRegistration>

const SemverRange = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[\^~>=<* 0-9.\-x|]+$/, { message: 'must be a semver range' })

export const PluginEntrypoint = z.object({
  id: Slug,
  extensionApi: SemverRange.default('^1.0.0'),
  registers: z.array(ExtensionRegistration).min(1).max(256),
})
export type PluginEntrypoint = z.infer<typeof PluginEntrypoint>

export const parsePluginEntrypoint = (input: unknown): PluginEntrypoint =>
  PluginEntrypoint.parse(input)
export const safeParsePluginEntrypoint = (input: unknown) => PluginEntrypoint.safeParse(input)

export type RegistryConflict = {
  readonly point: ExtensionPoint
  readonly id: string
  readonly existingPluginId: string
  readonly attemptedPluginId: string
}

export class PluginRegistry {
  private byKey = new Map<string, ExtensionRegistration>()

  register(reg: ExtensionRegistration): { kind: 'ok' } | { kind: 'conflict'; conflict: RegistryConflict } {
    const key = `${reg.point}:${reg.id}`
    const existing = this.byKey.get(key)
    if (existing && existing.pluginId !== reg.pluginId) {
      return {
        kind: 'conflict',
        conflict: {
          point: reg.point,
          id: reg.id,
          existingPluginId: existing.pluginId,
          attemptedPluginId: reg.pluginId,
        },
      }
    }
    this.byKey.set(key, reg)
    return { kind: 'ok' }
  }

  unregisterPlugin(pluginId: string): number {
    let count = 0
    for (const [key, reg] of this.byKey) {
      if (reg.pluginId === pluginId) {
        this.byKey.delete(key)
        count++
      }
    }
    return count
  }

  list(point?: ExtensionPoint): readonly ExtensionRegistration[] {
    const all = [...this.byKey.values()]
    return point ? all.filter((r) => r.point === point) : all
  }

  get(point: ExtensionPoint, id: string): ExtensionRegistration | undefined {
    return this.byKey.get(`${point}:${id}`)
  }

  get size(): number {
    return this.byKey.size
  }
}

export const isApiCompatible = (host: string, plugin: string): boolean => {
  const hostMajor = host.split('.')[0]
  const pluginMajor = plugin.split('.')[0]
  return hostMajor !== undefined && hostMajor === pluginMajor
}
