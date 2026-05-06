import { z } from 'zod'
import { Slug, TagList } from './_primitives.js'
import {
  Action,
  CapabilityConstraints,
  ResourceRef,
} from '../auth/capability.js'

export const PluginContribution = z.enum([
  'tool',
  'trigger',
  'skill',
  'memory',
  'ui-panel',
  'ui-widget',
  'observability',
])
export type PluginContribution = z.infer<typeof PluginContribution>

/** Named UI slot a `ui-panel` / `ui-widget` plugin may target (#83). */
export const PluginUiSlot = z.enum([
  'sidebar',
  'main-tab',
  'status-bar',
  'command-palette',
  'dashboard',
  'settings',
])
export type PluginUiSlot = z.infer<typeof PluginUiSlot>

/** Sandbox isolation backend a plugin runs in (#83). */
export const PluginIsolation = z.enum(['iframe', 'webview', 'subprocess', 'none'])
export type PluginIsolation = z.infer<typeof PluginIsolation>

/** Per-contribution entry-point map (#83). Module paths are resolved against the plugin source. */
export const PluginEntryPoints = z.record(PluginContribution, z.string().min(1).max(1024).optional())
export type PluginEntryPoints = z.infer<typeof PluginEntryPoints>

export const PluginSignature = z.object({
  algorithm: z.enum(['ed25519', 'rsa-sha256']),
  publicKey: z.string().min(64).max(8192),
  signature: z.string().min(64).max(8192),
})
export type PluginSignature = z.infer<typeof PluginSignature>

export const PluginPermission = z.object({
  resource: ResourceRef,
  actions: z.array(Action).min(1).max(16),
  reason: z.string().min(1).max(280),
  constraints: CapabilityConstraints.optional(),
  required: z.boolean().default(true),
})
export type PluginPermission = z.infer<typeof PluginPermission>

const SemverRange = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[\^~>=<* 0-9.\-x|]+$/, { message: 'must be a semver range' })

export const PluginConfig = z.object({
  id: Slug,
  name: z.string().min(1).max(128),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+){0,1}(\+[0-9A-Za-z.-]+){0,1}$/, {
      message: 'must be a SemVer string',
    }),
  source: z.union([
    z.string().regex(/^npm:[@a-z0-9/_.-]+$/, { message: 'must be npm:<package>' }),
    z.string().regex(/^github:[\w.-]+\/[\w.-]+(#[\w./-]+){0,1}$/, {
      message: 'must be github:owner/repo[#ref]',
    }),
    z.string().regex(/^marketplace:[a-z0-9-]+$/, { message: 'must be marketplace:<id>' }),
    z.string().regex(/^file:.+$/, { message: 'must be file:<path>' }),
  ]),
  contributes: z.array(PluginContribution).min(1).max(16),
  permissions: z.array(PluginPermission).max(64).default([]),
  enginesOs: SemverRange.optional(),
  signature: PluginSignature.optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().default(true),
  tags: TagList.default([]),
  /** Maps each contribution kind to its entry-point module (#83). */
  entryPoints: PluginEntryPoints.optional(),
  /** Named UI slot the plugin targets when `contributes` includes a UI surface (#83). */
  uiSlot: PluginUiSlot.optional(),
  /** Sandbox isolation backend; defaults are inferred per contribution kind (#83). */
  isolation: PluginIsolation.optional(),
  /** Minimum AgentsKitOS host version required (semver range; #83). */
  minHostVersion: SemverRange.optional(),
})
export type PluginConfig = z.infer<typeof PluginConfig>

export const parsePluginConfig = (input: unknown): PluginConfig => PluginConfig.parse(input)
export const safeParsePluginConfig = (input: unknown) => PluginConfig.safeParse(input)

const ISOLATION_DEFAULT: Readonly<Record<PluginContribution, PluginIsolation>> = {
  tool: 'subprocess',
  trigger: 'subprocess',
  skill: 'subprocess',
  memory: 'none',
  'ui-panel': 'iframe',
  'ui-widget': 'iframe',
  observability: 'none',
}

export type ResolvedPluginEntry = {
  readonly contribution: PluginContribution
  readonly entryPoint: string | undefined
  readonly isolation: PluginIsolation
  readonly uiSlot: PluginUiSlot | undefined
}

/**
 * Resolve the runtime entry-point map for a plugin (#83). Returns one record
 * per declared contribution, with an `isolation` default per contribution
 * kind when the plugin does not pin one. UI slot only surfaces for `ui-*`.
 */
export const resolvePluginEntries = (config: PluginConfig): readonly ResolvedPluginEntry[] => {
  return config.contributes.map((c) => ({
    contribution: c,
    entryPoint: config.entryPoints?.[c],
    isolation: config.isolation ?? ISOLATION_DEFAULT[c],
    uiSlot: c === 'ui-panel' || c === 'ui-widget' ? config.uiSlot : undefined,
  }))
}
