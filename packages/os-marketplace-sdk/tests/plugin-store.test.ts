import { describe, expect, it } from 'vitest'
import {
  filterPluginStoreEntries,
  latestAudit,
  renderStoreBadge,
  type PluginStoreEntry,
} from '../src/plugin-store.js'
import type { ProvenanceBundle } from '../src/provenance.js'

const provenance: ProvenanceBundle = {
  schemaVersion: '1.0',
  pluginId: 'p',
  version: '1.0.0',
  attestation: {
    slsaLevel: 3,
    builder: 'gh-actions',
    sourceRepo: 'org/repo',
    sourceCommit: 'abc',
    builtAt: '2026-05-06T00:00:00Z',
  },
  sbom: [],
  declaredPermissions: [],
}

const entry = (over: Partial<PluginStoreEntry> = {}): PluginStoreEntry => ({
  schemaVersion: '1.0',
  pluginId: 'p',
  version: '1.0.0',
  verification: 'community',
  provenance,
  audits: [],
  ...over,
})

describe('plugin store helpers (#89)', () => {
  it('latestAudit picks the most recent entry', () => {
    const e = entry({
      audits: [
        { auditedAt: '2026-01-01T00:00:00Z', auditor: 'a', findings: [], status: 'pass' },
        { auditedAt: '2026-04-01T00:00:00Z', auditor: 'b', findings: [], status: 'fail' },
      ],
    })
    expect(latestAudit(e)?.auditor).toBe('b')
  })

  it('filterPluginStoreEntries enforces minVerification', () => {
    const items = [
      entry({ pluginId: 'p1', verification: 'unverified' }),
      entry({ pluginId: 'p2', verification: 'verified' }),
      entry({ pluginId: 'p3', verification: 'official' }),
    ]
    const r = filterPluginStoreEntries(items, { minVerification: 'verified' })
    expect(r.map((e) => e.pluginId)).toEqual(['p2', 'p3'])
  })

  it('requireAuditPass drops entries with no audit + entries with fail audit', () => {
    const items = [
      entry({ pluginId: 'no-audit' }),
      entry({
        pluginId: 'failed',
        audits: [{ auditedAt: '2026-04-01T00:00:00Z', auditor: 'a', findings: [], status: 'fail' }],
      }),
      entry({
        pluginId: 'passed',
        audits: [{ auditedAt: '2026-04-02T00:00:00Z', auditor: 'a', findings: [], status: 'pass' }],
      }),
    ]
    const r = filterPluginStoreEntries(items, { requireAuditPass: true })
    expect(r.map((e) => e.pluginId)).toEqual(['passed'])
  })

  it('renderStoreBadge surfaces verification + audit status', () => {
    const e = entry({
      verification: 'verified',
      audits: [{ auditedAt: '2026-04-01T00:00:00Z', auditor: 'a', findings: [], status: 'pass' }],
    })
    expect(renderStoreBadge(e)).toBe('verified · audit:pass')
  })
})
