// Per ROADMAP M2 (#375). Provider/integration credential catalog.
// Pure metadata + safe-check shapes — no I/O.
//
// A provider declares: which vault keys it requires, whether it is cloud
// or local, and a doctor check shape so the CLI/desktop can verify the
// credential without printing it.

import { z } from 'zod'

export const ProviderKind = z.enum(['llm', 'integration', 'marketplace', 'local'])
export type ProviderKind = z.infer<typeof ProviderKind>

export const ProviderRequirement = z.object({
  /** Stable id for the provider — `openai`, `anthropic`, `slack`, etc. */
  id: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  /** Display name. */
  name: z.string().min(1).max(128),
  kind: ProviderKind,
  /** Vault keys this provider needs. Each key is referenced as `${vault:KEY}` in config. */
  requiredKeys: z.array(z.string().min(1).max(128)).max(16),
  /** Optional vault keys this provider can use. */
  optionalKeys: z.array(z.string().min(1).max(128)).max(16).default([]),
  /** True for SaaS/cloud providers (skipped under air-gap). */
  cloud: z.boolean(),
  /** Documentation URL for credential setup. */
  docsUrl: z.string().url().max(2048).optional(),
})
export type ProviderRequirement = z.infer<typeof ProviderRequirement>

/**
 * Built-in catalog. Curated, additive only — adding a provider here is a
 * minor version bump, removing is a major.
 */
export const BUILTIN_PROVIDERS: readonly ProviderRequirement[] = [
  { id: 'openai',    name: 'OpenAI',    kind: 'llm',         requiredKeys: ['OPENAI_API_KEY'],    optionalKeys: ['OPENAI_ORG_ID'], cloud: true,  docsUrl: 'https://platform.openai.com/api-keys' },
  { id: 'anthropic', name: 'Anthropic', kind: 'llm',         requiredKeys: ['ANTHROPIC_API_KEY'], optionalKeys: [],                cloud: true,  docsUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'gemini',    name: 'Google Gemini', kind: 'llm',     requiredKeys: ['GEMINI_API_KEY'],    optionalKeys: [],                cloud: true,  docsUrl: 'https://aistudio.google.com/app/apikey' },
  { id: 'github',    name: 'GitHub',    kind: 'integration', requiredKeys: ['GITHUB_TOKEN'],      optionalKeys: [],                cloud: true,  docsUrl: 'https://github.com/settings/tokens' },
  { id: 'slack',     name: 'Slack',     kind: 'integration', requiredKeys: ['SLACK_BOT_TOKEN'],   optionalKeys: ['SLACK_SIGNING_SECRET'], cloud: true, docsUrl: 'https://api.slack.com/apps' },
  { id: 'linear',    name: 'Linear',    kind: 'integration', requiredKeys: ['LINEAR_API_KEY'],    optionalKeys: [],                cloud: true,  docsUrl: 'https://linear.app/settings/api' },
  { id: 'discord',   name: 'Discord',   kind: 'integration', requiredKeys: ['DISCORD_BOT_TOKEN'], optionalKeys: [],                cloud: true,  docsUrl: 'https://discord.com/developers/applications' },
  { id: 'teams',     name: 'Microsoft Teams', kind: 'integration', requiredKeys: ['TEAMS_APP_ID', 'TEAMS_APP_PASSWORD'], optionalKeys: [], cloud: true, docsUrl: 'https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/prepare-your-o365-tenant' },
  { id: 'marketplace', name: 'AgentsKit Marketplace', kind: 'marketplace', requiredKeys: ['AGENTSKIT_MARKETPLACE_TOKEN'], optionalKeys: [], cloud: true },
  { id: 'ollama',    name: 'Ollama (local)', kind: 'local',  requiredKeys: [],                    optionalKeys: ['OLLAMA_BASE_URL'], cloud: false, docsUrl: 'https://ollama.com' },
  { id: 'lmstudio',  name: 'LM Studio (local)', kind: 'local', requiredKeys: [],                  optionalKeys: ['LMSTUDIO_BASE_URL'], cloud: false, docsUrl: 'https://lmstudio.ai' },
] as const

export type ProviderFilterOptions = {
  /** Skip cloud providers when true (air-gap mode). */
  readonly airGapped?: boolean
  /** Restrict to specific kinds. */
  readonly kinds?: readonly ProviderKind[]
}

export const filterProviders = (
  providers: readonly ProviderRequirement[],
  options: ProviderFilterOptions = {},
): readonly ProviderRequirement[] =>
  providers.filter((p) => {
    if (options.airGapped && p.cloud) return false
    if (options.kinds && !options.kinds.includes(p.kind)) return false
    return true
  })

export type ProviderCheckStatus = 'ok' | 'missing' | 'invalid' | 'skipped'

export const ProviderCheckResult = z.object({
  providerId: z.string().min(1).max(64),
  status: z.enum(['ok', 'missing', 'invalid', 'skipped']),
  missingKeys: z.array(z.string()).default([]),
  /** Remediation hint, e.g. "set OPENAI_API_KEY via `agentskit-os creds set`". */
  remediation: z.string().max(1024).optional(),
})
export type ProviderCheckResult = z.infer<typeof ProviderCheckResult>

/**
 * Compute which keys are missing for a provider, given a snapshot of which
 * vault keys are present (no values — just presence).
 */
export const checkProviderKeys = (
  provider: ProviderRequirement,
  presentKeys: ReadonlySet<string>,
  options: { readonly airGapped?: boolean } = {},
): ProviderCheckResult => {
  if (options.airGapped && provider.cloud) {
    return {
      providerId: provider.id,
      status: 'skipped',
      missingKeys: [],
      remediation: 'air-gap mode — cloud provider skipped',
    }
  }
  const missing = provider.requiredKeys.filter((k) => !presentKeys.has(k))
  if (missing.length === 0) {
    return { providerId: provider.id, status: 'ok', missingKeys: [] }
  }
  return {
    providerId: provider.id,
    status: 'missing',
    missingKeys: missing,
    remediation: `set ${missing.join(', ')} via \`agentskit-os creds set KEY --stdin\` (see \`agentskit-os creds guide\`) or your vault backend; use \`--secrets-file\` with creds check / doctor`,
  }
}

export const parseProviderRequirement = (input: unknown): ProviderRequirement =>
  ProviderRequirement.parse(input)
export const safeParseProviderRequirement = (input: unknown) =>
  ProviderRequirement.safeParse(input)
