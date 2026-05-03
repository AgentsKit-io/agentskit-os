// Adapter fallback chain — prefer-local-model rule (issue #194). Pure logic — no I/O.

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

/**
 * A single entry in the fallback chain.  The `local` flag marks providers
 * whose inference runs on-device/on-prem, which are preferred when
 * `preferLocal` is set.
 */
export const FallbackEntry = z.object({
  provider: z.string().min(1).max(128),
  model: z.string().min(1).max(128),
  /** True when this provider runs locally (e.g. Ollama, llama.cpp). */
  local: z.boolean().default(false),
})
export type FallbackEntry = z.infer<typeof FallbackEntry>

export const parseFallbackEntry = (input: unknown): FallbackEntry => FallbackEntry.parse(input)
export const safeParseFallbackEntry = (input: unknown) => FallbackEntry.safeParse(input)

// ---------------------------------------------------------------------------
// pickAdapter options
// ---------------------------------------------------------------------------

export type PickAdapterOptions = {
  /**
   * The primary (preferred) adapter to use when available.
   */
  readonly primary: FallbackEntry
  /**
   * Ordered fallback chain consulted when the primary is not available.
   */
  readonly fallbacks: readonly FallbackEntry[]
  /**
   * Set of provider names that are currently reachable / registered.
   * Comparison is case-insensitive.
   */
  readonly available: ReadonlySet<string>
  /**
   * When true, any local provider beats a network provider with equal
   * position in the fallback chain.
   */
  readonly preferLocal?: boolean
}

// ---------------------------------------------------------------------------
// Decision types
// ---------------------------------------------------------------------------

export type PickAdapterSuccess = {
  readonly selected: FallbackEntry
  readonly usedFallback: boolean
}

// ---------------------------------------------------------------------------
// Structured error
// ---------------------------------------------------------------------------

export class NoAdapterAvailableError extends Error {
  readonly code = 'os.runtime.no_adapter_available' as const

  constructor(tried: readonly FallbackEntry[]) {
    const names = tried.map((e) => `${e.provider}/${e.model}`).join(', ')
    super(`No adapter available. Tried: [${names}]`)
    this.name = 'NoAdapterAvailableError'
  }
}

// ---------------------------------------------------------------------------
// Core helper
// ---------------------------------------------------------------------------

const isAvailable = (entry: FallbackEntry, available: ReadonlySet<string>): boolean =>
  available.has(entry.provider.toLowerCase()) || available.has(entry.provider)

/**
 * Pick the best adapter from the chain.
 *
 * Algorithm:
 * 1. Collect all candidates: `[primary, ...fallbacks]`.
 * 2. Filter to those whose `provider` is in `available` (case-insensitive).
 * 3. If `preferLocal` is set, prefer local entries first; within each
 *    locality group the original ordering is preserved.
 * 4. Return the first candidate, or throw `NoAdapterAvailableError` if none.
 */
export const pickAdapter = (options: PickAdapterOptions): PickAdapterSuccess => {
  const { primary, fallbacks, available, preferLocal = false } = options

  const chain: readonly FallbackEntry[] = [primary, ...fallbacks]
  const reachable = chain.filter((e) => isAvailable(e, available))

  if (reachable.length === 0) {
    throw new NoAdapterAvailableError(chain)
  }

  let candidates = reachable
  if (preferLocal) {
    const local = reachable.filter((e) => e.local)
    const remote = reachable.filter((e) => !e.local)
    candidates = local.length > 0 ? [...local, ...remote] : remote
  }

  const selected = candidates[0]!
  const usedFallback = selected.provider !== primary.provider || selected.model !== primary.model

  return { selected, usedFallback }
}
