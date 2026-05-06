import { describe, expect, it } from 'vitest'
import {
  REDACTION_PROFILE_IDS,
  applyRedactionProfile,
  createRedactor,
  getRedactionProfile,
} from '../../src/index.js'

describe('redaction profiles (#439)', () => {
  it('exposes every profile id with a non-empty rule set', () => {
    for (const id of REDACTION_PROFILE_IDS) {
      const p = getRedactionProfile(id)
      expect(p.rules.length).toBeGreaterThan(0)
      expect(p.mask).toMatch(/REDACTED/)
    }
  })

  it('default profile masks api keys but leaves PII alone', () => {
    const p = getRedactionProfile('default')
    const text = 'contact alice@example.com Authorization: Bearer abcdef0123456789ABCDEF'
    const out = applyRedactionProfile(text, p)
    expect(out).toContain('alice@example.com')
    expect(out).not.toContain('abcdef0123456789ABCDEF')
    expect(out).toContain('[REDACTED]')
  })

  it('pii-strict masks email + phone + ssn + credit card', () => {
    const p = getRedactionProfile('pii-strict')
    const text =
      'alice@example.com (415) 555-0182 ssn 123-45-6789 card 4111-1111-1111-1111 ip 10.0.0.7'
    const out = applyRedactionProfile(text, p)
    expect(out).not.toContain('alice@example.com')
    expect(out).not.toContain('555-0182')
    expect(out).not.toContain('123-45-6789')
    expect(out).not.toContain('4111-1111-1111-1111')
    expect(out).not.toContain('10.0.0.7')
  })

  it('hipaa-safe-harbor coarsens DOB + masks MRN + tokens', () => {
    const r = createRedactor('hipaa-safe-harbor')
    const out = r('Patient DOB 1985-04-12 MRN: ABC-123456 url ?token=secretXYZ')
    expect(out).not.toContain('1985-04-12')
    expect(out).not.toContain('ABC-123456')
    expect(out).not.toContain('secretXYZ')
    expect(out).toContain('?token=[REDACTED]')
  })

  it('createRedactor is composable as a (s)=>string fn', () => {
    const r = createRedactor('pii-strict')
    expect(typeof r).toBe('function')
    expect(r('hello@example.com')).toBe('[REDACTED]')
  })
})
