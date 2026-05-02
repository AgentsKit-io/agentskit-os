import { describe, expect, it } from 'vitest'
import {
  SENSITIVITY_LEVELS,
  Sensitivity,
  checkConsent,
  compareSensitivity,
  evaluateBreakGlass,
  parseBreakGlassActivation,
  parseConsentRef,
  requiresConsent,
  safeParseBreakGlassActivation,
  safeParseConsentRef,
  type ConsentRef,
} from '../../src/consent/consent.js'

const ULID = '01HXYZTPGGJTZ3WBPJN3XKXQ7N'
const ED = 'A'.repeat(64)

const principalUser = {
  kind: 'user' as const,
  id: 'usr_1',
  workspaceId: 'team-a',
}

const validConsent: ConsentRef = parseConsentRef({
  id: ULID,
  subjectId: 'subject-hash-abc',
  scope: ['data:medical_record', 'purpose:treatment'],
  policy: 'hipaa-treatment',
  grantedAt: '2026-04-01T00:00:00.000Z',
  expiresAt: '2027-04-01T00:00:00.000Z',
  grantedBy: principalUser,
  proof: { algorithm: 'ed25519', publicKey: ED, signature: 'B'.repeat(64) },
  jurisdiction: ['us-hipaa'],
})

describe('Sensitivity', () => {
  it('exposes 7 levels', () => {
    expect(SENSITIVITY_LEVELS.length).toBe(7)
  })

  it.each(SENSITIVITY_LEVELS)('parses %s', (s) => {
    expect(Sensitivity.safeParse(s).success).toBe(true)
  })

  it('phi outranks pii', () => {
    expect(compareSensitivity('phi', 'pii')).toBeGreaterThan(0)
  })

  it('public ranks lowest', () => {
    expect(compareSensitivity('public', 'internal')).toBeLessThan(0)
  })
})

describe('requiresConsent', () => {
  it.each([
    ['public', false],
    ['internal', false],
    ['confidential', false],
    ['pii', true],
    ['financial', true],
    ['legal-privileged', true],
    ['phi', true],
  ] as const)('%s → %s', (level, expected) => {
    expect(requiresConsent(level)).toBe(expected)
  })
})

describe('ConsentRef schema', () => {
  it('parses well-formed consent', () => {
    expect(validConsent.scope).toContain('purpose:treatment')
  })

  it('rejects bad scope grammar', () => {
    expect(
      safeParseConsentRef({ ...validConsent, scope: ['random_thing'] }).success,
    ).toBe(false)
  })

  it('rejects malformed ULID', () => {
    expect(safeParseConsentRef({ ...validConsent, id: 'not-ulid' }).success).toBe(false)
  })

  it('rejects empty scope', () => {
    expect(safeParseConsentRef({ ...validConsent, scope: [] }).success).toBe(false)
  })

  it('throws on parseConsentRef with invalid input', () => {
    expect(() => parseConsentRef({})).toThrow()
  })
})

describe('checkConsent', () => {
  it('allows when scope matches', () => {
    const d = checkConsent(validConsent, ['data:medical_record'])
    expect(d.kind).toBe('allow')
  })

  it('denies when consent missing', () => {
    const d = checkConsent(undefined, ['data:medical_record'])
    expect(d.kind).toBe('deny')
    if (d.kind === 'deny') expect(d.code).toBe('consent_missing')
  })

  it('denies when scope not granted', () => {
    const d = checkConsent(validConsent, ['data:billing'])
    expect(d.kind).toBe('deny')
    if (d.kind === 'deny') expect(d.code).toBe('consent_scope_violation')
  })

  it('denies expired consent', () => {
    const d = checkConsent(validConsent, ['data:medical_record'], new Date('2030-01-01Z'))
    expect(d.kind).toBe('deny')
    if (d.kind === 'deny') expect(d.code).toBe('consent_expired')
  })

  it('allows multi-scope when all granted', () => {
    const d = checkConsent(validConsent, ['data:medical_record', 'purpose:treatment'])
    expect(d.kind).toBe('allow')
  })

  it('denies multi-scope when one missing', () => {
    const d = checkConsent(validConsent, ['data:medical_record', 'purpose:research'])
    expect(d.kind).toBe('deny')
  })
})

describe('BreakGlassActivation schema', () => {
  const validBG = {
    reason: 'emergency-clinical' as const,
    initiator: principalUser,
    bypasses: ['hitl', 'consent'],
    scope: { durationMs: 60_000, resources: ['flow:emergency-triage'] },
    postHocReview: { mode: 'mandatory', reviewer: principalUser, slaHours: 24 },
    ttl: '2030-05-01T00:00:00.000Z',
  }

  it('parses minimal activation', () => {
    const a = parseBreakGlassActivation(validBG)
    expect(a.bypasses).toEqual(['hitl', 'consent'])
  })

  it('rejects empty bypasses', () => {
    expect(safeParseBreakGlassActivation({ ...validBG, bypasses: [] }).success).toBe(false)
  })

  it('rejects unknown bypass', () => {
    expect(
      safeParseBreakGlassActivation({ ...validBG, bypasses: ['cosmic'] }).success,
    ).toBe(false)
  })

  it('rejects unknown postHocReview mode', () => {
    expect(
      safeParseBreakGlassActivation({
        ...validBG,
        postHocReview: { mode: 'cosmic' },
      }).success,
    ).toBe(false)
  })

  it('accepts org-extended reason slug', () => {
    expect(
      safeParseBreakGlassActivation({ ...validBG, reason: 'org-internal-emergency' }).success,
    ).toBe(true)
  })

  it('rejects malformed reason', () => {
    expect(
      safeParseBreakGlassActivation({ ...validBG, reason: 'Invalid Reason' }).success,
    ).toBe(false)
  })
})

describe('evaluateBreakGlass', () => {
  const principal = { kind: 'user' as const, id: 'usr_1', workspaceId: 'team-a' }
  const baseBG = parseBreakGlassActivation({
    reason: 'emergency-clinical',
    initiator: principal,
    bypasses: ['hitl'],
    scope: { durationMs: 60_000, resources: ['flow:x'] },
    postHocReview: { mode: 'mandatory', reviewer: principal, slaHours: 24 },
    ttl: '2030-01-01T00:00:00.000Z',
  })

  it('activates valid emergency-clinical', () => {
    const d = evaluateBreakGlass(baseBG)
    expect(d.kind).toBe('activate')
  })

  it('rejects expired ttl', () => {
    const expired = parseBreakGlassActivation({
      ...baseBG,
      ttl: '2020-01-01T00:00:00.000Z',
    })
    const d = evaluateBreakGlass(expired)
    expect(d.kind).toBe('reject')
    if (d.kind === 'reject') expect(d.code).toBe('ttl_expired')
  })

  it('requires two-person for safety-of-life', () => {
    const sol = parseBreakGlassActivation({ ...baseBG, reason: 'safety-of-life' })
    const d = evaluateBreakGlass(sol)
    expect(d.kind).toBe('reject')
    if (d.kind === 'reject') expect(d.code).toBe('two_person_required')
  })

  it('safety-of-life passes with twoPersonRule', () => {
    const sol = parseBreakGlassActivation({
      ...baseBG,
      reason: 'safety-of-life',
      twoPersonRule: { secondInitiator: principal },
    })
    const d = evaluateBreakGlass(sol)
    expect(d.kind).toBe('activate')
  })

  it('rejects unknown reason without org-extended allowlist', () => {
    const ext = parseBreakGlassActivation({ ...baseBG, reason: 'random-reason' })
    const d = evaluateBreakGlass(ext)
    expect(d.kind).toBe('reject')
    if (d.kind === 'reject') expect(d.code).toBe('unknown_reason_disallowed')
  })

  it('accepts org-extended reason with allowlist', () => {
    const ext = parseBreakGlassActivation({ ...baseBG, reason: 'corporate-incident' })
    const d = evaluateBreakGlass(ext, { allowedExtraReasons: ['corporate-incident'] })
    expect(d.kind).toBe('activate')
  })
})
