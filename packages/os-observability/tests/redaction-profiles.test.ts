import { describe, expect, it } from 'vitest'
import { createSubstringRedactor, getRedactionProfile } from '../src/redaction-profiles.js'

describe('redaction profiles (#439)', () => {
  it('returns a usable redactor', () => {
    const p = getRedactionProfile('default_pii')
    const redact = createSubstringRedactor(p)
    expect(redact('token sk-abc')).toContain('[REDACTED]')
  })

  it('none profile is a no-op', () => {
    const p = getRedactionProfile('none')
    const redact = createSubstringRedactor(p)
    expect(redact('hello')).toBe('hello')
  })
})

