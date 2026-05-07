// Per #175 — read-only share link with TTL.
// Pure: token shape + builder + verdict over (token, clock). Storage layer
// (cloud KV) persists the issued token; this module only handles the
// envelope + expiration check.

export type ShareLinkScope = 'flow' | 'agent' | 'run-trace'

export type ShareLink = {
  readonly schemaVersion: '1.0'
  readonly id: string
  readonly scope: ShareLinkScope
  readonly resourceId: string
  readonly issuedBy: string
  readonly issuedAt: number
  readonly expiresAt: number
  /** Optional one-time token; cloud KV burns it after first read. */
  readonly oneTimeUse?: boolean
}

export type ShareLinkInput = {
  readonly id: string
  readonly scope: ShareLinkScope
  readonly resourceId: string
  readonly issuedBy: string
  readonly ttlMs: number
  readonly oneTimeUse?: boolean
  readonly clock?: () => number
}

const MAX_TTL_MS = 30 * 24 * 60 * 60_000

export const buildShareLink = (input: ShareLinkInput): ShareLink => {
  if (input.ttlMs <= 0) throw new Error('share-link: ttlMs must be positive')
  if (input.ttlMs > MAX_TTL_MS) throw new Error(`share-link: ttlMs exceeds ${MAX_TTL_MS}ms cap`)
  const issuedAt = (input.clock ?? Date.now)()
  return {
    schemaVersion: '1.0',
    id: input.id,
    scope: input.scope,
    resourceId: input.resourceId,
    issuedBy: input.issuedBy,
    issuedAt,
    expiresAt: issuedAt + input.ttlMs,
    ...(input.oneTimeUse === true ? { oneTimeUse: true } : {}),
  }
}

export type ShareLinkVerdict =
  | { readonly ok: true; readonly remainingMs: number }
  | { readonly ok: false; readonly reason: 'expired' | 'scope_mismatch' | 'resource_mismatch' }

/**
 * Evaluate whether a share link is still usable for a given (scope, resourceId)
 * pair (#175). Pure: caller drives the clock.
 */
export const evaluateShareLink = (
  link: ShareLink,
  expected: { readonly scope: ShareLinkScope; readonly resourceId: string },
  opts: { readonly clock?: () => number } = {},
): ShareLinkVerdict => {
  const now = (opts.clock ?? Date.now)()
  if (link.scope !== expected.scope) return { ok: false, reason: 'scope_mismatch' }
  if (link.resourceId !== expected.resourceId) return { ok: false, reason: 'resource_mismatch' }
  if (now >= link.expiresAt) return { ok: false, reason: 'expired' }
  return { ok: true, remainingMs: link.expiresAt - now }
}
