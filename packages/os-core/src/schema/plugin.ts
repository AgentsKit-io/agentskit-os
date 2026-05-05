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
})
export type PluginConfig = z.infer<typeof PluginConfig>

export const parsePluginConfig = (input: unknown): PluginConfig => PluginConfig.parse(input)
export const safeParsePluginConfig = (input: unknown) => PluginConfig.safeParse(input)
