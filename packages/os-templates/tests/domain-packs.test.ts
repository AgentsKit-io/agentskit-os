import { describe, expect, it } from 'vitest'
import {
  OFFICIAL_DOMAIN_PACK_IDS,
  OFFICIAL_DOMAIN_PACKS,
  getOfficialDomainPack,
} from '../src/domain-packs.js'

describe('official domain packs (#338)', () => {
  it('exposes every documented domain id', () => {
    expect([...OFFICIAL_DOMAIN_PACK_IDS].sort()).toEqual([
      'clinical', 'engineering', 'finance', 'marketing', 'support',
    ])
  })

  it('every pack has at least one starter template + eval pack + recommended policy', () => {
    for (const pack of OFFICIAL_DOMAIN_PACKS) {
      expect(pack.starterTemplateIds.length).toBeGreaterThan(0)
      expect(pack.evalPackIds.length).toBeGreaterThan(0)
      expect(pack.recommendedPolicyProfileIds.length).toBeGreaterThan(0)
    }
  })

  it('clinical pack tags HIPAA + recommends read-only review', () => {
    const p = getOfficialDomainPack('clinical')
    expect(p.tags).toContain('hipaa')
    expect(p.recommendedPolicyProfileIds).toContain('read_only_review')
  })

  it('engineering pack ships SDLC starter templates', () => {
    const p = getOfficialDomainPack('engineering')
    expect(p.starterTemplateIds).toContain('pr-review')
  })
})
