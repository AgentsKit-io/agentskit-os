import { z } from 'zod'
import { EgressPolicy } from '../security/egress.js'

export const PiiCategory = z.enum([
  'email',
  'phone',
  'ssn',
  'credit-card',
  'ip-address',
  'name',
  'address',
  'dob',
  'api-key',
])
export type PiiCategory = z.infer<typeof PiiCategory>

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

export const SecurityConfig = z.object({
  firewall: PromptFirewallConfig.default(() => PromptFirewallConfig.parse({})),
  piiRedaction: PiiRedactionConfig.default(() => PiiRedactionConfig.parse({})),
  sandbox: SandboxConfig.default(() => SandboxConfig.parse({})),
  auditLog: AuditLogConfig.default(() => AuditLogConfig.parse({})),
  egress: EgressPolicy.default(() => EgressPolicy.parse({})),
  requireSignedPlugins: z.boolean().default(false),
})
export type SecurityConfig = z.infer<typeof SecurityConfig>

export const parseSecurityConfig = (input: unknown): SecurityConfig => SecurityConfig.parse(input)
export const safeParseSecurityConfig = (input: unknown) => SecurityConfig.safeParse(input)
