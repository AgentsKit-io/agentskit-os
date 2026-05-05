import { z } from 'zod'
import { RUN_MODES, RunMode } from '../runtime/run-mode.js'
import { EgressPolicy } from '../security/egress.js'
import type { PluginRegistry } from '../plugins/catalog.js'

export const DEFAULT_PII_CATEGORIES = [
  'email',
  'phone',
  'ssn',
  'credit-card',
  'ip-address',
  'name',
  'address',
  'dob',
  'api-key',
] as const

export const PiiCategory = z.string().min(1).max(64)
export type PiiCategory = string

export const PromptFirewallConfig = z.object({
  enabled: z.boolean().default(true),
  blocklist: z.array(z.string().min(1).max(256)).max(1024).default([]),
  allowlistOverride: z.array(z.string().min(1).max(256)).max(256).default([]),
  rejectOnMatch: z.boolean().default(true),
})
export type PromptFirewallConfig = z.infer<typeof PromptFirewallConfig>

export const PiiRedactionConfig = z.object({
  enabled: z.boolean().default(true),
  categories: z.array(PiiCategory).min(1).default(['email', 'phone', 'credit-card', 'ssn', 'api-key']),
  mode: z.enum(['mask', 'remove', 'hash']).default('mask'),
  maskToken: z.string().min(1).max(32).default('[REDACTED]'),
})
export type PiiRedactionConfig = z.infer<typeof PiiRedactionConfig>

export const SandboxConfig = z.object({
  enabled: z.boolean().default(true),
  backend: z.enum(['e2b', 'webcontainer', 'docker']).default('e2b'),
  timeoutMs: z.number().int().positive().max(600_000).default(30_000),
  network: z.enum(['none', 'restricted', 'full']).default('none'),
  memoryLimitMb: z.number().int().positive().max(16_384).default(512),
})
export type SandboxConfig = z.infer<typeof SandboxConfig>

export const AuditLogConfig = z.object({
  enabled: z.boolean().default(true),
  signing: z.enum(['none', 'ed25519', 'hmac-sha256']).default('ed25519'),
  retentionDays: z.number().int().min(1).max(3650).default(365),
  destination: z.enum(['file', 'syslog', 'remote']).default('file'),
  path: z.string().min(1).max(1024).optional(),
})
export type AuditLogConfig = z.infer<typeof AuditLogConfig>

/** Declarative org rules (#336): models, tools, run modes, residency, domain packs, HITL gates. */
export const WorkspacePolicyConfig = z.object({
  version: z.literal(1).default(1),
  /** When non-empty, model ref must match at least one pattern (`provider:model`, `*` globs). */
  modelsAllow: z.array(z.string().min(1).max(128)).max(128).default([]),
  modelsDeny: z.array(z.string().min(1).max(128)).max(128).default([]),
  toolsDeny: z.array(z.string().min(1).max(128)).max(256).default([]),
  runModesAllowed: z
    .array(RunMode)
    .max(RUN_MODES.length)
    .default(() => [...RUN_MODES]),
  /** If non-empty, `residencyRegion` at evaluation must be one of these codes. */
  dataResidencyRequired: z.array(z.string().min(2).max(32)).max(16).default([]),
  /** Domain pack / preset ids that must be active on the workspace. */
  domainPresetsRequired: z.array(z.string().min(1).max(64)).max(32).default([]),
  /** Tool tags that require human approval before execution when matched. */
  irreversibleToolTags: z.array(z.string().min(1).max(64)).max(32).default(['destructive', 'payment', 'deploy']),
})
export type WorkspacePolicyConfig = z.infer<typeof WorkspacePolicyConfig>

export const SecurityConfig = z.object({
  firewall: PromptFirewallConfig.default(() => PromptFirewallConfig.parse({})),
  piiRedaction: PiiRedactionConfig.default(() => PiiRedactionConfig.parse({})),
  sandbox: SandboxConfig.default(() => SandboxConfig.parse({})),
  auditLog: AuditLogConfig.default(() => AuditLogConfig.parse({})),
  egress: EgressPolicy.default(() => EgressPolicy.parse({})),
  requireSignedPlugins: z.boolean().default(false),
  workspacePolicy: WorkspacePolicyConfig.default(() => WorkspacePolicyConfig.parse({})),
})
export type SecurityConfig = z.infer<typeof SecurityConfig>

export const getSecurityConfigSchema = (registry?: PluginRegistry) => {
  return SecurityConfig.superRefine((data, ctx) => {
    for (let i = 0; i < data.piiRedaction.categories.length; i++) {
      const cat = data.piiRedaction.categories[i]
      if (DEFAULT_PII_CATEGORIES.includes(cat as any)) continue
      if (cat && registry && registry.get('pii-category', cat)) continue

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid PII category: ${cat}`,
        path: ['piiRedaction', 'categories', i],
      })
    }
  })
}

export const parseSecurityConfig = (input: unknown, registry?: PluginRegistry): SecurityConfig => getSecurityConfigSchema(registry).parse(input)
export const safeParseSecurityConfig = (input: unknown, registry?: PluginRegistry) => getSecurityConfigSchema(registry).safeParse(input)
