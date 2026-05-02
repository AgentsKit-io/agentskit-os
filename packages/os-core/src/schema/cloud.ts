import { z } from 'zod'
import { VaultSecretRef } from './_primitives.js'

const SecretOrPlain = z.union([VaultSecretRef, z.string().min(1).max(2048)])

export const CloudPlan = z.enum(['free', 'pro', 'team', 'enterprise', 'self-hosted'])
export type CloudPlan = z.infer<typeof CloudPlan>

export const SyncStrategy = z.enum(['off', 'manual', 'auto', 'realtime'])
export type SyncStrategy = z.infer<typeof SyncStrategy>

export const SsoProvider = z.enum(['none', 'google', 'github', 'okta', 'azure-ad', 'saml'])
export type SsoProvider = z.infer<typeof SsoProvider>

export const RbacRole = z.enum(['owner', 'admin', 'editor', 'viewer'])
export type RbacRole = z.infer<typeof RbacRole>

export const TeamSeat = z.object({
  email: z.string().email(),
  role: RbacRole,
})
export type TeamSeat = z.infer<typeof TeamSeat>

export const CloudSyncConfig = z.object({
  enabled: z.boolean().default(false),
  plan: CloudPlan.default('free'),
  endpoint: z.string().url().default('https://cloud.agentskit.io'),
  apiKey: SecretOrPlain.optional(),
  workspaceCloudId: z.string().min(1).max(128).optional(),
  strategy: SyncStrategy.default('manual'),
  intervalSeconds: z.number().int().min(30).max(86_400).default(900),
  conflictResolution: z.enum(['local-wins', 'remote-wins', 'manual']).default('manual'),
  sso: z
    .object({
      provider: SsoProvider.default('none'),
      domain: z.string().min(1).max(256).optional(),
    })
    .default(() => ({ provider: 'none' as const })),
  airGapped: z.boolean().default(false),
  seats: z.array(TeamSeat).max(1024).default([]),
})
export type CloudSyncConfig = z.infer<typeof CloudSyncConfig>

export const parseCloudSyncConfig = (input: unknown): CloudSyncConfig =>
  CloudSyncConfig.parse(input)
export const safeParseCloudSyncConfig = (input: unknown) => CloudSyncConfig.safeParse(input)
