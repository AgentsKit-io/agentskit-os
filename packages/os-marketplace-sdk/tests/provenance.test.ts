import { describe, expect, it } from 'vitest'
import {
  diffPermissions,
  evaluateProvenanceAgainstPolicy,
  type ProvenanceBundle,
} from '../src/provenance.js'

const bundle: ProvenanceBundle = {
  schemaVersion: '1.0',
  pluginId: 'cost-widget',
  version: '0.1.0',
  attestation: {
    slsaLevel: 3,
    builder: 'github-actions:org/repo',
    sourceRepo: 'org/repo',
    sourceCommit: 'deadbeef',
    builtAt: '2026-05-06T12:00:00Z',
  },
  sbom: [
    { name: 'left-pad', version: '1.0.0', integrity: 'sha512-aaa==', license: 'MIT' },
    { name: 'right-pad', version: '1.0.0', integrity: 'sha512-bbb==' },
  ],
  declaredPermissions: ['vault:read', 'net:fetch:slack.com'],
}

describe('diffPermissions (#342)', () => {
  it('reports added/removed/unchanged sets', () => {
    const d = diffPermissions(['a', 'b'], ['b', 'c'])
    expect(d.added).toEqual(['c'])
    expect(d.removed).toEqual(['a'])
    expect(d.unchanged).toEqual(['b'])
  })
})

describe('evaluateProvenanceAgainstPolicy (#342)', () => {
  it('passes when SLSA level + permissions clear', () => {
    expect(evaluateProvenanceAgainstPolicy(bundle, { minSlsaLevel: 3 }).ok).toBe(true)
  })

  it('fails when SLSA level below policy', () => {
    const v = evaluateProvenanceAgainstPolicy(bundle, { minSlsaLevel: 4 })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.reasons[0]).toContain('slsa.level')
  })

  it('fails when denied permission appears', () => {
    const v = evaluateProvenanceAgainstPolicy(bundle, {
      minSlsaLevel: 0,
      deniedPermissions: ['vault:read'],
    })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.reasons[0]).toContain('denied_permissions')
  })

  it('fails when license required + missing on SBOM', () => {
    const v = evaluateProvenanceAgainstPolicy(bundle, {
      minSlsaLevel: 0,
      requireLicensePerDep: true,
    })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.reasons[0]).toContain('sbom.license_missing')
  })
})
