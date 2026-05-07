// Phase A-2 — build an `AdapterRegistry` from a flat secrets map.
// Inspects well-known env keys (ANTHROPIC_API_KEY, OPENAI_API_KEY,
// OPENROUTER_API_KEY, GROQ_API_KEY) and registers an HTTP LLM adapter per
// provider. Returns a routed `LlmAdapter` that picks the matching backend
// from the `system` field on every `LlmCall`.

import type { RunContext } from '@agentskit/os-core'
import type { AdapterRegistry, LlmAdapter, LlmCall } from '../adapters.js'
import { createHttpLlmAdapter, type HttpFetch } from './http-llm.js'

export type CredsRegistryOpts = {
  readonly secrets: Readonly<Record<string, string>>
  readonly fetchImpl: HttpFetch
  /** Override base URLs (defaults below). */
  readonly baseUrls?: Readonly<Record<string, string>>
}

type ProviderId = 'anthropic' | 'openai' | 'openrouter' | 'groq'

const DEFAULT_BASE_URLS: Readonly<Record<ProviderId, string>> = {
  anthropic: 'https://api.anthropic.com/v1',
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
}

const SECRET_KEYS: Readonly<Record<ProviderId, string>> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  groq: 'GROQ_API_KEY',
}

const buildAdaptersFromSecrets = (
  opts: CredsRegistryOpts,
): ReadonlyMap<ProviderId, LlmAdapter> => {
  const out = new Map<ProviderId, LlmAdapter>()
  for (const id of Object.keys(SECRET_KEYS) as ProviderId[]) {
    const apiKey = opts.secrets[SECRET_KEYS[id]]
    if (apiKey === undefined || apiKey.length === 0) continue
    const baseUrl = opts.baseUrls?.[id] ?? DEFAULT_BASE_URLS[id]
    out.set(
      id,
      createHttpLlmAdapter({
        id,
        baseUrl,
        apiKey,
        fetchImpl: opts.fetchImpl,
        ...(id === 'anthropic'
          ? {
              authHeader: { name: 'x-api-key', scheme: 'raw' },
              extraHeaders: { 'anthropic-version': '2023-06-01' },
            }
          : {}),
      }),
    )
  }
  return out
}

const matchesProvider = (system: string, id: ProviderId): boolean =>
  system === id || system.startsWith(`${id}:`)

const pickAdapter = (
  system: string,
  adapters: ReadonlyMap<ProviderId, LlmAdapter>,
): LlmAdapter | undefined => {
  for (const id of adapters.keys()) {
    if (matchesProvider(system, id)) return adapters.get(id)
  }
  return undefined
}

const errorResult = (system: string, registered: readonly string[]): never => {
  throw new Error(
    `no LLM adapter registered for system="${system}"; available: ${registered.join(', ') || 'none'}`,
  )
}

/**
 * Compose an AdapterRegistry from a flat secrets map (Phase A-2). The
 * resulting `llm` adapter routes `LlmCall.system` to the matching HTTP
 * adapter (anthropic / openai / openrouter / groq). Throws on unknown
 * `system` so missing creds surface as a hard error during a real run.
 */
export const buildAdapterRegistryFromCreds = (
  opts: CredsRegistryOpts,
): AdapterRegistry => {
  const adapters = buildAdaptersFromSecrets(opts)
  const ids = [...adapters.keys()]
  const llm: LlmAdapter = {
    id: 'creds-router',
    invoke: async (call: LlmCall, ctx: RunContext) => {
      const picked = pickAdapter(call.system, adapters)
      if (picked === undefined) errorResult(call.system, ids)
      return picked!.invoke(call, ctx)
    },
  }
  return { llm }
}

export const knownProviderIds = (): readonly string[] =>
  Object.keys(SECRET_KEYS)
