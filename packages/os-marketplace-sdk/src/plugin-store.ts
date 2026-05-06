// Per #89 — third-party plugin store: verified badge + audit trail.
// Pure: schemas + verdicts. Uses provenance + listing primitives already shipped.

import type { ProvenanceBundle } from './provenance.js'

export type VerificationLevel = 'unverified' | 'community' | 'verified' | 'official'

export type AuditEntry = {
  readonly auditedAt: string
  readonly auditor: string
  readonly findings: readonly string[]
  /** Status the audit assigned. */
  readonly status: 'pass' | 'pass-with-notes' | 'fail'
}

export type PluginStoreEntry = {
  readonly schemaVersion: '1.0'
  readonly pluginId: string
  readonly version: string
  readonly verification: VerificationLevel
  readonly provenance: ProvenanceBundle
  readonly audits: readonly AuditEntry[]
}

export type StoreFilter = {
  readonly minVerification?: VerificationLevel
  /** Require at least one passing audit. */
  readonly requireAuditPass?: boolean
}

const VERIFICATION_RANK: Readonly<Record<VerificationLevel, number>> = {
  unverified: 0,
  community: 1,
  verified: 2,
  official: 3,
}

/** Pick the highest-status audit for an entry (#89). */
export const latestAudit = (entry: PluginStoreEntry): AuditEntry | undefined => {
  if (entry.audits.length === 0) return undefined
  return [...entry.audits].sort((a, b) => b.auditedAt.localeCompare(a.auditedAt))[0]
}

/**
 * Filter plugin-store entries by verification level + audit status (#89).
 */
export const filterPluginStoreEntries = (
  entries: readonly PluginStoreEntry[],
  filter: StoreFilter,
): readonly PluginStoreEntry[] => {
  const minRank = filter.minVerification !== undefined
    ? VERIFICATION_RANK[filter.minVerification]
    : 0
  return entries.filter((e) => {
    if (VERIFICATION_RANK[e.verification] < minRank) return false
    if (filter.requireAuditPass === true) {
      const last = latestAudit(e)
      if (last === undefined) return false
      if (last.status === 'fail') return false
    }
    return true
  })
}

/** Render a compact store badge label (#89). */
export const renderStoreBadge = (entry: PluginStoreEntry): string => {
  const last = latestAudit(entry)
  const auditPart = last !== undefined ? ` · audit:${last.status}` : ''
  return `${entry.verification}${auditPart}`
}
