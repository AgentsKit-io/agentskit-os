import { describe, expect, it } from 'vitest'
import {
  hasBlockingViolation,
  parseBrandKit,
  safeParseBrandKit,
  validateAgainstBrandKit,
  type BrandKit,
} from '../../src/brand/brand-kit.js'

const minimal: BrandKit = parseBrandKit({
  id: 'acme',
  name: 'Acme Brand',
  version: '1.0.0',
  voice: { tone: ['formal'] },
})

describe('BrandKit schema', () => {
  it('parses minimal kit', () => {
    expect(minimal.voice.tone).toEqual(['formal'])
    expect(minimal.vocabulary.bannedPhrases).toEqual([])
    expect(minimal.metadata.tags).toEqual([])
  })

  it('rejects bad SemVer', () => {
    expect(safeParseBrandKit({ ...minimal, version: '1.0' }).success).toBe(false)
  })

  it('rejects empty tone array', () => {
    expect(safeParseBrandKit({ ...minimal, voice: { tone: [] } }).success).toBe(false)
  })

  it('rejects unknown tone', () => {
    expect(safeParseBrandKit({ ...minimal, voice: { tone: ['cosmic'] } }).success).toBe(false)
  })

  it('rejects unknown emoji policy', () => {
    expect(
      safeParseBrandKit({ ...minimal, formatting: { emoji: 'rare' } }).success,
    ).toBe(false)
  })

  it('rejects unknown pronouns', () => {
    expect(
      safeParseBrandKit({ ...minimal, identity: { pronouns: 'them' } }).success,
    ).toBe(false)
  })

  it('parses fully-populated kit', () => {
    const k = parseBrandKit({
      id: 'agency-acme',
      name: 'Acme',
      version: '2.1.0',
      client: 'client-x',
      voice: {
        tone: ['casual', 'empathetic'],
        persona: 'expert friend',
        examples: { good: ['Hi there!'], bad: ['Greetings, esteemed customer.'] },
      },
      vocabulary: {
        preferredTerms: [{ term: 'use', useInstead: 'leverage' }],
        bannedPhrases: [{ phrase: 'cheap', reason: 'off-brand', severity: 'block' }],
        requiredDisclaimers: [
          { text: 'Past performance is not indicative.', where: 'last', triggerOn: ['returns'] },
        ],
        glossary: [{ term: 'API', definition: 'Application Programming Interface' }],
      },
      formatting: {
        oxfordComma: true,
        emoji: 'sometimes',
        lengthLimits: { max: 1000, perChannel: { tweet: { max: 280 } } },
      },
      identity: { productName: 'Acme', pronouns: 'we' },
    })
    expect(k.client).toBe('client-x')
  })
})

describe('validateAgainstBrandKit', () => {
  const kit = parseBrandKit({
    id: 'acme',
    name: 'Acme',
    version: '1.0.0',
    voice: { tone: ['formal'] },
    vocabulary: {
      bannedPhrases: [{ phrase: 'cheap', reason: 'off-brand', severity: 'block' }],
      preferredTerms: [{ term: 'use', useInstead: 'leverage' }],
      requiredDisclaimers: [
        { text: 'Past performance is not indicative.', where: 'last', triggerOn: ['returns'] },
      ],
    },
    formatting: { lengthLimits: { max: 100, perChannel: { tweet: { max: 30 } } } },
    identity: { capitalizationRules: { acme: 'Acme' } },
  })

  it('returns no violations for clean text', () => {
    expect(validateAgainstBrandKit('Quality product from Acme.', kit)).toEqual([])
  })

  it('flags banned phrase with severity', () => {
    const v = validateAgainstBrandKit('This is cheap and great.', kit)
    expect(v[0]?.code).toBe('banned_phrase')
    expect(v[0]).toMatchObject({ severity: 'block' })
  })

  it('flags preferred-term', () => {
    const v = validateAgainstBrandKit('Just use it.', kit)
    expect(v.find((x) => x.code === 'preferred_term')?.code).toBe('preferred_term')
  })

  it('flags missing disclaimer when trigger word present', () => {
    const v = validateAgainstBrandKit('Stocks have great returns this year!', kit)
    expect(v.find((x) => x.code === 'missing_disclaimer')).toBeDefined()
  })

  it('skips disclaimer when no trigger word', () => {
    const v = validateAgainstBrandKit('Hello world.', kit)
    expect(v.find((x) => x.code === 'missing_disclaimer')).toBeUndefined()
  })

  it('flags length above max', () => {
    const v = validateAgainstBrandKit('x'.repeat(120), kit)
    expect(v.find((x) => x.code === 'length_above_max')).toMatchObject({ max: 100 })
  })

  it('honors per-channel max', () => {
    const v = validateAgainstBrandKit('x'.repeat(50), kit, { channel: 'tweet' })
    expect(v.find((x) => x.code === 'length_above_max')).toMatchObject({ max: 30, channel: 'tweet' })
  })

  it('flags capitalization mismatch', () => {
    const v = validateAgainstBrandKit('product from acme is great', kit)
    expect(v.find((x) => x.code === 'capitalization')).toBeDefined()
  })
})

describe('hasBlockingViolation', () => {
  it('blocks on severity=block phrase', () => {
    expect(
      hasBlockingViolation([
        {
          code: 'banned_phrase',
          severity: 'block',
          phrase: 'cheap',
          reason: 'r',
          index: 0,
        },
      ]),
    ).toBe(true)
  })

  it('does not block on severity=warn', () => {
    expect(
      hasBlockingViolation([
        {
          code: 'banned_phrase',
          severity: 'warn',
          phrase: 'cheap',
          reason: 'r',
          index: 0,
        },
      ]),
    ).toBe(false)
  })

  it('blocks on missing_disclaimer', () => {
    expect(
      hasBlockingViolation([{ code: 'missing_disclaimer', disclaimer: 'd', where: 'last' }]),
    ).toBe(true)
  })

  it('blocks on length violation', () => {
    expect(hasBlockingViolation([{ code: 'length_above_max', max: 100, actual: 200 }])).toBe(true)
  })

  it('does not block on preferred_term alone', () => {
    expect(
      hasBlockingViolation([{ code: 'preferred_term', term: 'use', useInstead: 'leverage', index: 0 }]),
    ).toBe(false)
  })
})
