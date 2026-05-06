import { describe, expect, it } from 'vitest'
import {
  REDACTION_PROFILE_IDS,
  applyRedactionProfile,
  getRedactionProfile,
} from '../../src/index.js'

describe('hipaa-safe-harbor-extended (#461)', () => {
  it('listed in REDACTION_PROFILE_IDS', () => {
    expect(REDACTION_PROFILE_IDS).toContain('hipaa-safe-harbor-extended')
  })

  it('redacts vehicle VIN', () => {
    const p = getRedactionProfile('hipaa-safe-harbor-extended')
    const out = applyRedactionProfile('VIN 1HGCM82633A123456', p)
    expect(out).not.toContain('1HGCM82633A123456')
  })

  it('redacts device serial labels', () => {
    const p = getRedactionProfile('hipaa-safe-harbor-extended')
    const out = applyRedactionProfile('Serial: ABC-123456', p)
    expect(out).not.toContain('ABC-123456')
  })

  it('redacts labelled account numbers', () => {
    const p = getRedactionProfile('hipaa-safe-harbor-extended')
    const out = applyRedactionProfile('Account: 12345678', p)
    expect(out).not.toContain('12345678')
  })

  it('inherits every rule from hipaa-safe-harbor', () => {
    const base = getRedactionProfile('hipaa-safe-harbor')
    const ext = getRedactionProfile('hipaa-safe-harbor-extended')
    for (const rule of base.rules) {
      expect(ext.rules.some((r) => r.id === rule.id)).toBe(true)
    }
  })
})
