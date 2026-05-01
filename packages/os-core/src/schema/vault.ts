import { z } from 'zod'

export const VaultBackend = z.enum(['file', 'os-keychain', 'env', 'external'])
export type VaultBackend = z.infer<typeof VaultBackend>

const Common = {
  biometricUnlock: z.boolean().default(false),
  autoLockSeconds: z.number().int().min(0).max(86_400).default(900),
}

export const FileVault = z.object({
  ...Common,
  backend: z.literal('file'),
  path: z.string().min(1).max(1024),
  encryption: z.enum(['aes-256-gcm', 'chacha20-poly1305']).default('aes-256-gcm'),
})
export type FileVault = z.infer<typeof FileVault>

export const OsKeychainVault = z.object({
  ...Common,
  backend: z.literal('os-keychain'),
  service: z.string().min(1).max(128).default('agentskit-os'),
})
export type OsKeychainVault = z.infer<typeof OsKeychainVault>

export const EnvVault = z.object({
  ...Common,
  backend: z.literal('env'),
  prefix: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Z][A-Z0-9_]*$/, { message: 'must be uppercase env-var-style prefix' })
    .default('AGENTSKITOS_'),
})
export type EnvVault = z.infer<typeof EnvVault>

export const ExternalVault = z.object({
  ...Common,
  backend: z.literal('external'),
  provider: z.enum(['1password', 'aws-secrets', 'gcp-secret-manager', 'vault-hashicorp', 'doppler']),
  config: z.record(z.string(), z.unknown()).optional(),
})
export type ExternalVault = z.infer<typeof ExternalVault>

export const VaultConfig = z.discriminatedUnion('backend', [
  FileVault,
  OsKeychainVault,
  EnvVault,
  ExternalVault,
])
export type VaultConfig = z.infer<typeof VaultConfig>

export const parseVaultConfig = (input: unknown): VaultConfig => VaultConfig.parse(input)
export const safeParseVaultConfig = (input: unknown) => VaultConfig.safeParse(input)
