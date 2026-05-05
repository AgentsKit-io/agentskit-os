// BrandKit + content guardrails per RFC-0004. Pure schema + decision logic.

import { z } from 'zod'
import { Slug, TagList } from '../schema/_primitives.js'

const SemverPlain = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/)

export const VoiceTone = z.enum(['formal', 'casual', 'playful', 'technical', 'empathetic'])
export type VoiceTone = z.infer<typeof VoiceTone>

export const Severity = z.enum(['warn', 'block'])
export type Severity = z.infer<typeof Severity>

export const VoiceConfig = z.object({
  tone: z.array(VoiceTone).min(1).max(VoiceTone.options.length),
  persona: z.string().min(1).max(256).optional(),
  examples: z
    .object({
      good: z.array(z.string().min(1).max(2048)).max(32).default([]),
      bad: z.array(z.string().min(1).max(2048)).max(32).default([]),
    })
    .optional(),
})
export type VoiceConfig = z.infer<typeof VoiceConfig>

export const PreferredTerm = z.object({
  term: z.string().min(1).max(128),
  useInstead: z.string().min(1).max(128),
})
export type PreferredTerm = z.infer<typeof PreferredTerm>

export const BannedPhrase = z.object({
  phrase: z.string().min(1).max(512),
  reason: z.string().min(1).max(512),
  severity: Severity.default('warn'),
})
export type BannedPhrase = z.infer<typeof BannedPhrase>

export const RequiredDisclaimer = z.object({
  text: z.string().min(1).max(2048),
  where: z.enum(['first', 'last', 'inline']).default('last'),
  triggerOn: z.array(z.string().min(1).max(128)).max(64).default([]),
})
export type RequiredDisclaimer = z.infer<typeof RequiredDisclaimer>

export const GlossaryEntry = z.object({
  term: z.string().min(1).max(128),
  definition: z.string().min(1).max(2048),
})
export type GlossaryEntry = z.infer<typeof GlossaryEntry>

export const VocabularyConfig = z.object({
  preferredTerms: z.array(PreferredTerm).max(512).default([]),
  bannedPhrases: z.array(BannedPhrase).max(512).default([]),
  requiredDisclaimers: z.array(RequiredDisclaimer).max(64).default([]),
  glossary: z.array(GlossaryEntry).max(512).default([]),
})
export type VocabularyConfig = z.infer<typeof VocabularyConfig>

export const FormattingConfig = z.object({
  titleCase: z.boolean().optional(),
  oxfordComma: z.boolean().optional(),
  quoteStyle: z.enum(['curly', 'straight']).optional(),
  emoji: z.enum(['always', 'sometimes', 'never']).optional(),
  lengthLimits: z
    .object({
      min: z.number().int().nonnegative().optional(),
      max: z.number().int().positive().max(1_000_000).optional(),
      perChannel: z
        .record(
          z.string().min(1).max(64),
          z.object({
            min: z.number().int().nonnegative().optional(),
            max: z.number().int().positive().max(1_000_000).optional(),
          }),
        )
        .optional(),
    })
    .optional(),
})
export type FormattingConfig = z.infer<typeof FormattingConfig>

export const IdentityConfig = z.object({
  productName: z.string().min(1).max(128).optional(),
  legalName: z.string().min(1).max(256).optional(),
  capitalizationRules: z.record(z.string().min(1).max(128), z.string().min(1).max(128)).optional(),
  pronouns: z.enum(['we', 'i', 'they']).optional(),
})
export type IdentityConfig = z.infer<typeof IdentityConfig>

export const BrandKit = z.object({
  id: Slug,
  name: z.string().min(1).max(128),
  version: SemverPlain,
  client: Slug.optional(),
  voice: VoiceConfig,
  vocabulary: VocabularyConfig.default(() => VocabularyConfig.parse({})),
  formatting: FormattingConfig.default(() => FormattingConfig.parse({})),
  identity: IdentityConfig.default(() => IdentityConfig.parse({})),
  validators: z.array(z.string().min(1).max(128)).max(32).default([]),
  metadata: z
    .object({ tags: TagList.default([]), docs: z.string().url().optional() })
    .default(() => ({ tags: [] as string[] })),
})
export type BrandKit = z.infer<typeof BrandKit>

export const parseBrandKit = (input: unknown): BrandKit => BrandKit.parse(input)
export const safeParseBrandKit = (input: unknown) => BrandKit.safeParse(input)

// --- Pure validator ---

export type BrandViolation =
  | { code: 'banned_phrase'; severity: Severity; phrase: string; reason: string; index: number }
  | { code: 'preferred_term'; term: string; useInstead: string; index: number }
  | { code: 'missing_disclaimer'; disclaimer: string; where: 'first' | 'last' | 'inline' }
  | { code: 'length_below_min'; min: number; actual: number; channel?: string }
  | { code: 'length_above_max'; max: number; actual: number; channel?: string }
  | { code: 'capitalization'; expected: string; got: string; index: number }

export type ValidationOptions = {
  readonly channel?: string
}

const findAll = (haystack: string, needle: string): readonly number[] => {
  const out: number[] = []
  if (needle.length === 0) return out
  const lower = haystack.toLowerCase()
  const ln = needle.toLowerCase()
  let i = 0
  while ((i = lower.indexOf(ln, i)) !== -1) {
    out.push(i)
    i += ln.length
  }
  return out
}

const coalesce = <T>(a: T | undefined, b: T | undefined): T | undefined => (a !== undefined ? a : b)

type ChannelLengthLimits = { readonly min: number | undefined; readonly max: number | undefined }

export const validateAgainstBrandKit = (
  text: string,
  kit: BrandKit,
  options: ValidationOptions = {},
): readonly BrandViolation[] => {
  const out: BrandViolation[] = []

  for (const ban of kit.vocabulary.bannedPhrases) {
    for (const idx of findAll(text, ban.phrase)) {
      out.push({
        code: 'banned_phrase',
        severity: ban.severity,
        phrase: ban.phrase,
        reason: ban.reason,
        index: idx,
      })
    }
  }

  for (const pref of kit.vocabulary.preferredTerms) {
    for (const idx of findAll(text, pref.term)) {
      out.push({
        code: 'preferred_term',
        term: pref.term,
        useInstead: pref.useInstead,
        index: idx,
      })
    }
  }

  for (const dsc of kit.vocabulary.requiredDisclaimers) {
    const triggered =
      dsc.triggerOn.length === 0 ||
      dsc.triggerOn.some((t) => text.toLowerCase().includes(t.toLowerCase()))
    if (!triggered) continue
    if (!text.includes(dsc.text)) {
      out.push({ code: 'missing_disclaimer', disclaimer: dsc.text, where: dsc.where })
    }
  }

  const channel = options.channel
  const limits = kit.formatting.lengthLimits
  if (limits) {
    let perChannel: ChannelLengthLimits | undefined
    if (channel) {
      const raw = limits.perChannel?.[channel]
      if (raw) perChannel = { min: raw.min, max: raw.max }
    }
    const min = coalesce(perChannel?.min, limits.min)
    const max = coalesce(perChannel?.max, limits.max)
    const len = text.length
    if (min !== undefined && len < min) {
      const v: BrandViolation = { code: 'length_below_min', min, actual: len }
      if (channel !== undefined) v.channel = channel
      out.push(v)
    }
    if (max !== undefined && len > max) {
      const v: BrandViolation = { code: 'length_above_max', max, actual: len }
      if (channel !== undefined) v.channel = channel
      out.push(v)
    }
  }

  const caps = kit.identity.capitalizationRules
  if (caps) {
    for (const [_canonical, expected] of Object.entries(caps)) {
      const wrongCases = findAll(text, expected).filter(
        (i) => text.slice(i, i + expected.length) !== expected,
      )
      for (const idx of wrongCases) {
        out.push({
          code: 'capitalization',
          expected,
          got: text.slice(idx, idx + expected.length),
          index: idx,
        })
      }
    }
  }

  return out
}

export const hasBlockingViolation = (violations: readonly BrandViolation[]): boolean =>
  violations.some(
    (v) =>
      (v.code === 'banned_phrase' && v.severity === 'block') ||
      v.code === 'missing_disclaimer' ||
      v.code === 'length_above_max' ||
      v.code === 'length_below_min',
  )
