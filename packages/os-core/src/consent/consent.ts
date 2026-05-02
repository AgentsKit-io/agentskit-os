// Consent + break-glass primitives per RFC-0005. Pure schema + decision logic.

import { z } from 'zod'
import { Slug } from '../schema/_primitives.js'
import { Ulid } from '../events/event.js'
import { PrincipalRef } from '../auth/principal.js'

export const SENSITIVITY_LEVELS = [
  'public',
  'internal',
  'confidential',
  'pii',
  'financial',
  'legal-privileged',
  'phi',
] as const
export type Sensitivity = (typeof SENSITIVITY_LEVELS)[number]
export const Sensitivity = z.enum(SENSITIVITY_LEVELS)

const SENSITIVITY_RANK: Record<Sensitivity, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  pii: 3,
  financial: 3,
  'legal-privileged': 4,
  phi: 4,
}

export const compareSensitivity = (a: Sensitivity, b: Sensitivity): number =>
  SENSITIVITY_RANK[a] - SENSITIVITY_RANK[b]

export const requiresConsent = (level: Sensitivity): boolean =>
  SENSITIVITY_RANK[level] >= SENSITIVITY_RANK.pii

export const ConsentScope = z
  .string()
  .min(3)
  .max(128)
  .regex(/^(data|purpose|recipient):[a-z][a-z0-9_-]*$/, {
    message: 'must be data:<cat> | purpose:<intent> | recipient:<kind>',
  })
export type ConsentScope = z.infer<typeof ConsentScope>

export const Jurisdiction = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z][a-z0-9-]*$/, { message: 'must be lowercase slug-like' })

export const ConsentSignature = z.object({
  algorithm: z.literal('ed25519'),
  publicKey: z.string().min(64).max(8192),
  signature: z.string().min(64).max(8192),
})

export const ConsentRef: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    id: Ulid,
    subjectId: z.string().min(1).max(256),
    scope: z.array(ConsentScope).min(1).max(64),
    policy: Slug,
    grantedAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }).optional(),
    grantedBy: PrincipalRef,
    proof: ConsentSignature,
    revocableUntil: z.string().datetime({ offset: true }).optional(),
    jurisdiction: z.array(Jurisdiction).max(8).optional(),
    parentConsent: Ulid.optional(),
  }),
)
export type ConsentRef = {
  id: string
  subjectId: string
  scope: readonly ConsentScope[]
  policy: string
  grantedAt: string
  expiresAt?: string
  grantedBy: unknown
  proof: { algorithm: 'ed25519'; publicKey: string; signature: string }
  revocableUntil?: string
  jurisdiction?: readonly string[]
  parentConsent?: string
}

export const parseConsentRef = (input: unknown): ConsentRef =>
  ConsentRef.parse(input) as ConsentRef
export const safeParseConsentRef = (input: unknown) => ConsentRef.safeParse(input)

export type ConsentDecision =
  | { kind: 'allow' }
  | {
      kind: 'deny'
      code: 'consent_missing' | 'consent_expired' | 'consent_scope_violation'
      message: string
    }

export const checkConsent = (
  consent: ConsentRef | undefined,
  requiredScope: readonly ConsentScope[],
  now: Date = new Date(),
): ConsentDecision => {
  if (!consent) {
    return {
      kind: 'deny',
      code: 'consent_missing',
      message: `consent missing for required scope [${requiredScope.join(', ')}]`,
    }
  }
  if (consent.expiresAt) {
    const exp = Date.parse(consent.expiresAt)
    if (Number.isFinite(exp) && now.getTime() >= exp) {
      return { kind: 'deny', code: 'consent_expired', message: `consent ${consent.id} expired` }
    }
  }
  const granted = new Set(consent.scope)
  for (const need of requiredScope) {
    if (!granted.has(need)) {
      return {
        kind: 'deny',
        code: 'consent_scope_violation',
        message: `consent ${consent.id} does not grant required scope "${need}"`,
      }
    }
  }
  return { kind: 'allow' }
}

// --- BreakGlass ---

export const BREAK_GLASS_BYPASSES = [
  'hitl',
  'consent',
  'cost-budget',
  'egress-allowlist',
  'rate-limit',
] as const
export type BreakGlassBypass = (typeof BREAK_GLASS_BYPASSES)[number]
export const BreakGlassBypass = z.enum(BREAK_GLASS_BYPASSES)

export const BREAK_GLASS_REASONS = ['emergency-clinical', 'safety-of-life', 'court-order'] as const

export const BreakGlassReason = z.union([
  z.enum(BREAK_GLASS_REASONS),
  z
    .string()
    .min(3)
    .max(128)
    .regex(/^[a-z][a-z0-9-]*$/, { message: 'org-extended reason must be slug-like' }),
])
export type BreakGlassReason = z.infer<typeof BreakGlassReason>

export const BreakGlassPostHoc = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('mandatory'),
    reviewer: PrincipalRef,
    slaHours: z.number().int().min(1).max(720),
  }),
  z.object({
    mode: z.literal('team-queue'),
    queue: z.string().min(1).max(128),
    slaHours: z.number().int().min(1).max(720),
  }),
])

export const BreakGlassActivation = z.object({
  reason: BreakGlassReason,
  initiator: PrincipalRef,
  bypasses: z.array(BreakGlassBypass).min(1).max(BREAK_GLASS_BYPASSES.length),
  scope: z.object({
    durationMs: z.number().int().positive().max(86_400_000),
    resources: z.array(z.string().min(3).max(256)).min(1).max(256),
  }),
  postHocReview: BreakGlassPostHoc,
  ttl: z.string().datetime({ offset: true }),
  twoPersonRule: z
    .object({ secondInitiator: PrincipalRef })
    .optional(),
})
export type BreakGlassActivation = z.infer<typeof BreakGlassActivation>

export const parseBreakGlassActivation = (input: unknown): BreakGlassActivation =>
  BreakGlassActivation.parse(input)
export const safeParseBreakGlassActivation = (input: unknown) =>
  BreakGlassActivation.safeParse(input)

const REASONS_REQUIRING_TWO_PERSON: ReadonlySet<string> = new Set(['safety-of-life'])

export type BreakGlassDecision =
  | { kind: 'activate'; expiresAt: string }
  | {
      kind: 'reject'
      code:
        | 'two_person_required'
        | 'ttl_expired'
        | 'unknown_reason_disallowed'
        | 'no_bypasses_declared'
      message: string
    }

export const evaluateBreakGlass = (
  act: BreakGlassActivation,
  options: { now?: Date; allowedExtraReasons?: readonly string[] } = {},
): BreakGlassDecision => {
  const now = options.now ?? new Date()

  if (act.bypasses.length === 0) {
    return {
      kind: 'reject',
      code: 'no_bypasses_declared',
      message: 'break-glass activation must declare at least one bypass',
    }
  }

  const ttlMs = Date.parse(act.ttl)
  if (!Number.isFinite(ttlMs) || ttlMs <= now.getTime()) {
    return { kind: 'reject', code: 'ttl_expired', message: 'break-glass ttl is in the past' }
  }

  if (REASONS_REQUIRING_TWO_PERSON.has(act.reason as string) && !act.twoPersonRule) {
    return {
      kind: 'reject',
      code: 'two_person_required',
      message: `reason "${act.reason}" requires twoPersonRule`,
    }
  }

  const isCanonical = (BREAK_GLASS_REASONS as readonly string[]).includes(act.reason as string)
  const isExtended = options.allowedExtraReasons?.includes(act.reason as string) ?? false
  if (!isCanonical && !isExtended) {
    return {
      kind: 'reject',
      code: 'unknown_reason_disallowed',
      message: `reason "${act.reason}" not in canonical list or org-extended list`,
    }
  }

  return { kind: 'activate', expiresAt: act.ttl }
}
