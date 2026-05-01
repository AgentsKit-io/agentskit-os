import { describe, expect, it } from 'vitest'
import { Slug, Tag, TagList, VaultSecretRef } from '../../src/schema/_primitives.js'

describe('schema primitives', () => {
  describe('Slug', () => {
    it.each([['ok'], ['a'], ['a-b'], ['team-1'], ['x9-y0']])('accepts %s', (value) => {
      expect(Slug.safeParse(value).success).toBe(true)
    })

    it.each([
      ['Bad'],
      ['-bad'],
      ['bad-'],
      [''],
      ['has space'],
      ['under_score'],
      ['x'.repeat(65)],
    ])('rejects %s', (value) => {
      expect(Slug.safeParse(value).success).toBe(false)
    })
  })

  describe('Tag', () => {
    it('accepts up to 32 chars', () => {
      expect(Tag.safeParse('x'.repeat(32)).success).toBe(true)
    })
    it('rejects 33 chars', () => {
      expect(Tag.safeParse('x'.repeat(33)).success).toBe(false)
    })
    it('rejects empty', () => {
      expect(Tag.safeParse('').success).toBe(false)
    })
  })

  describe('TagList', () => {
    it('accepts up to 32 tags', () => {
      const tags = Array.from({ length: 32 }, (_, i) => `t${i}`)
      expect(TagList.safeParse(tags).success).toBe(true)
    })
    it('rejects 33 tags', () => {
      const tags = Array.from({ length: 33 }, (_, i) => `t${i}`)
      expect(TagList.safeParse(tags).success).toBe(false)
    })
  })

  describe('VaultSecretRef', () => {
    it.each([['${vault:openai_key}'], ['${vault:k1}'], ['${vault:my_secret_42}']])(
      'accepts %s',
      (value) => {
        expect(VaultSecretRef.safeParse(value).success).toBe(true)
      },
    )

    it.each([
      ['vault:key'],
      ['${vault:UPPER}'],
      ['${vault:has-hyphen}'],
      ['${vault:}'],
      ['raw-secret'],
    ])('rejects %s', (value) => {
      expect(VaultSecretRef.safeParse(value).success).toBe(false)
    })
  })
})
