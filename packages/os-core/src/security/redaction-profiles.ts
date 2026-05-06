// Per #439 — named redaction profiles (regime-specific defaults).
// Pure: regex-driven; no I/O. Callers wire these as the `redact` fn on
// trace exporters and on `CodingRunArtifactsOpts.redact` (#367).
// HIPAA preset is a *Safe-Harbor-aligned subset* — not a substitute for
// validated PHI tooling; see threat-model §4.4 / §5 for caveats.

export type RedactionProfileId =
  | 'default'
  | 'pii-strict'
  | 'hipaa-safe-harbor'
  | 'hipaa-safe-harbor-extended'

export type RedactionRule = {
  readonly id: string
  readonly description: string
  readonly pattern: RegExp
}

export type RedactionProfile = {
  readonly id: RedactionProfileId
  readonly mask: string
  readonly rules: readonly RedactionRule[]
}

const RULE_EMAIL: RedactionRule = {
  id: 'email',
  description: 'RFC-5322-ish email address',
  pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu,
}

const RULE_PHONE_E164: RedactionRule = {
  id: 'phone.e164',
  description: 'E.164 phone number',
  pattern: /\+\d[\d\s().-]{6,18}\d/g,
}

const RULE_PHONE_US: RedactionRule = {
  id: 'phone.us',
  description: 'US 10-digit phone number',
  pattern: /(\(\d{3}\)\s?|\d{3}[-.\s])\d{3}[-.\s]\d{4}/g,
}

const RULE_SSN: RedactionRule = {
  id: 'ssn',
  description: 'US Social Security number',
  pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
}

const RULE_CREDIT_CARD: RedactionRule = {
  id: 'credit-card',
  description: 'Bare credit-card number (13-19 digits)',
  pattern: /\b(\d[ -]?){13,19}\b/g,
}

const RULE_API_KEY_BEARER: RedactionRule = {
  id: 'api-key.bearer',
  description: 'Authorization Bearer header',
  pattern: /Bearer\s+[A-Za-z0-9._\-+/=]{16,}/g,
}

const RULE_API_KEY_GENERIC: RedactionRule = {
  id: 'api-key.generic',
  description: 'Long opaque token (sk_/pk_/akia/ghp_/xoxb-/etc.)',
  pattern:
    /\b(sk|pk|rk)[_-][A-Za-z0-9]{16,}|\bAKIA[0-9A-Z]{16}\b|\bghp_[A-Za-z0-9]{36}\b|\bxox[abpos]-[A-Za-z0-9-]{10,}\b/g,
}

const RULE_IPV4: RedactionRule = {
  id: 'ip.ipv4',
  description: 'Dotted-quad IPv4 address',
  pattern: /\b(\d{1,3}\.){3}\d{1,3}\b/g,
}

const RULE_DOB: RedactionRule = {
  id: 'dob',
  description: 'ISO-style date (YYYY-MM-DD); coarsened by HIPAA Safe Harbor',
  pattern: /\b(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g,
}

const RULE_MRN: RedactionRule = {
  id: 'medical-record-number',
  description: 'Common MRN-like identifier (MRN: …)',
  pattern: /\bMRN[:#\s-]*[A-Z0-9-]{4,}/gi,
}

const RULE_URL_WITH_TOKEN: RedactionRule = {
  id: 'url.token-query',
  description: 'URL carrying token=, key=, secret=, signature= query strings',
  pattern: /([?&](token|key|secret|signature|sig)=)[^\s&#]+/gi,
}

const DEFAULT_PROFILE: RedactionProfile = {
  id: 'default',
  mask: '[REDACTED]',
  rules: [RULE_API_KEY_BEARER, RULE_API_KEY_GENERIC, RULE_URL_WITH_TOKEN],
}

const PII_STRICT_PROFILE: RedactionProfile = {
  id: 'pii-strict',
  mask: '[REDACTED]',
  rules: [
    RULE_EMAIL,
    RULE_PHONE_E164,
    RULE_PHONE_US,
    RULE_SSN,
    RULE_CREDIT_CARD,
    RULE_API_KEY_BEARER,
    RULE_API_KEY_GENERIC,
    RULE_IPV4,
    RULE_URL_WITH_TOKEN,
  ],
}

// Best-effort regexes for the additional Safe Harbor identifiers tracked in
// #461. Higher false-positive risk than the core HIPAA profile — opt-in only.
const RULE_VIN: RedactionRule = {
  id: 'vehicle.vin',
  description: '17-char Vehicle Identification Number',
  pattern: /\b[A-HJ-NPR-Z0-9]{17}\b/g,
}

const RULE_LICENSE_PLATE: RedactionRule = {
  id: 'vehicle.license-plate',
  description: 'Common US license-plate shapes',
  pattern: /\b[A-Z]{1,3}[-\s]?[0-9]{1,4}[A-Z0-9]{0,3}\b/g,
}

const RULE_DEVICE_SERIAL: RedactionRule = {
  id: 'device.serial',
  description: 'Device serial like "Serial: …" or "S/N: …"',
  pattern: /\b(Serial|S\/N|SN)[:#]?\s*[A-Z0-9-]{6,}/gi,
}

const RULE_ACCOUNT_NUMBER: RedactionRule = {
  id: 'account.number',
  description: 'Account-style 8-16 digit identifier',
  pattern: /\b(Account|Acct)[:#]?\s*\d{8,16}\b/gi,
}

const RULE_LICENSE_NUMBER: RedactionRule = {
  id: 'license.number',
  description: 'License/certificate number labelled "License #" / "Cert #"',
  pattern: /\b(License|Cert)[:#]?\s*[A-Z0-9-]{4,}/gi,
}

const HIPAA_SAFE_HARBOR_PROFILE: RedactionProfile = {
  id: 'hipaa-safe-harbor',
  mask: '[REDACTED]',
  rules: [
    RULE_EMAIL,
    RULE_PHONE_E164,
    RULE_PHONE_US,
    RULE_SSN,
    RULE_DOB,
    RULE_MRN,
    RULE_IPV4,
    RULE_API_KEY_BEARER,
    RULE_API_KEY_GENERIC,
    RULE_CREDIT_CARD,
    RULE_URL_WITH_TOKEN,
  ],
}

const HIPAA_SAFE_HARBOR_EXTENDED_PROFILE: RedactionProfile = {
  id: 'hipaa-safe-harbor-extended',
  mask: '[REDACTED]',
  rules: [
    ...HIPAA_SAFE_HARBOR_PROFILE.rules,
    RULE_VIN,
    RULE_LICENSE_PLATE,
    RULE_DEVICE_SERIAL,
    RULE_ACCOUNT_NUMBER,
    RULE_LICENSE_NUMBER,
  ],
}

const PROFILE_BY_ID: Readonly<Record<RedactionProfileId, RedactionProfile>> = {
  default: DEFAULT_PROFILE,
  'pii-strict': PII_STRICT_PROFILE,
  'hipaa-safe-harbor': HIPAA_SAFE_HARBOR_PROFILE,
  'hipaa-safe-harbor-extended': HIPAA_SAFE_HARBOR_EXTENDED_PROFILE,
}

export const REDACTION_PROFILE_IDS: readonly RedactionProfileId[] = [
  'default',
  'pii-strict',
  'hipaa-safe-harbor',
  'hipaa-safe-harbor-extended',
]

export const getRedactionProfile = (id: RedactionProfileId): RedactionProfile => PROFILE_BY_ID[id]

/**
 * Apply every rule in `profile` to `text`. URL-token captures keep the
 * `?token=` prefix and replace only the value; other rules replace the whole
 * match with `mask`.
 */
export const applyRedactionProfile = (text: string, profile: RedactionProfile): string => {
  let out = text
  for (const rule of profile.rules) {
    if (rule.id === 'url.token-query') {
      out = out.replace(rule.pattern, (_match, p1: string) => `${p1}${profile.mask}`)
    } else {
      out = out.replace(rule.pattern, profile.mask)
    }
  }
  return out
}

/** Convenience: build a `(s) => string` redact fn for a named profile. */
export const createRedactor = (id: RedactionProfileId): ((s: string) => string) => {
  const p = getRedactionProfile(id)
  return (s) => applyRedactionProfile(s, p)
}
