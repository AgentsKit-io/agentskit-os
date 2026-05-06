// Per #439 — named redaction profiles for trace/export pipelines (pure; no I/O).

export type RedactionProfileId = 'none' | 'default_pii' | 'hipaa_safe_harbor'

export type RedactionProfile = {
  readonly id: RedactionProfileId
  readonly title: string
  readonly description: string
  /** Case-insensitive substrings replaced with token. */
  readonly patterns: readonly string[]
  readonly token: string
}

const profile = (p: RedactionProfile): RedactionProfile => p

export const REDACTION_PROFILES: readonly RedactionProfile[] = [
  profile({
    id: 'none',
    title: 'No redaction',
    description: 'Do not redact inputs/exports.',
    patterns: [],
    token: '[REDACTED]',
  }),
  profile({
    id: 'default_pii',
    title: 'Default PII redaction',
    description: 'Conservative PII-ish patterns (emails, bearer tokens, api keys).',
    patterns: ['@', 'bearer ', 'api_key', 'apikey', 'sk-', '-----begin'],
    token: '[REDACTED]',
  }),
  profile({
    id: 'hipaa_safe_harbor',
    title: 'HIPAA Safe Harbor (starter)',
    description:
      'Starter HIPAA-style safe-harbor patterns for exports; intended to be expanded to full 18 identifiers (#182).',
    patterns: [
      '@',
      'ssn',
      'social security',
      'dob',
      'date of birth',
      'mrn',
      'medical record',
      'patient',
      'address',
      'phone',
      'ip',
    ],
    token: '[REDACTED]',
  }),
]

export const getRedactionProfile = (id: RedactionProfileId): RedactionProfile =>
  REDACTION_PROFILES.find((p) => p.id === id) ?? REDACTION_PROFILES[0]!

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const createSubstringRedactor = (p: RedactionProfile): ((s: string) => string) => {
  if (p.patterns.length === 0) return (s) => s
  const re = new RegExp(p.patterns.map(escapeRe).join('|'), 'gi')
  return (s: string) => s.replace(re, p.token)
}

