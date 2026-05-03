import { describe, expect, it } from 'vitest'
import {
  Slug,
  Tag,
  TagList,
  VaultSecretRef,
  RepoRef,
  parseRepoRef,
  safeParseRepoRef,
} from '../../src/schema/_primitives.js'

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

  describe('RepoRef', () => {
    it('accepts a bare HTTPS URL with branch ref', () => {
      const r = parseRepoRef({
        url: 'https://github.com/AgentsKit-io/agentskit-os.git',
        ref: 'main',
      })
      expect(r.url).toBe('https://github.com/AgentsKit-io/agentskit-os.git')
      expect(r.ref).toBe('main')
      expect(r.worktreePath).toBeUndefined()
    })

    it('accepts a tag ref', () => {
      const r = parseRepoRef({
        url: 'https://github.com/org/repo.git',
        ref: 'v1.2.3',
      })
      expect(r.ref).toBe('v1.2.3')
    })

    it('accepts a SHA ref', () => {
      const r = parseRepoRef({
        url: 'https://github.com/org/repo.git',
        ref: 'abc1234def5678',
      })
      expect(r.ref).toBe('abc1234def5678')
    })

    it('accepts an abbreviated SHA ref', () => {
      const r = parseRepoRef({
        url: 'https://github.com/org/repo.git',
        ref: 'deadbeef',
      })
      expect(r.ref).toBe('deadbeef')
    })

    it('accepts worktreePath', () => {
      const r = parseRepoRef({
        url: 'https://github.com/org/repo.git',
        ref: 'main',
        worktreePath: '/tmp/checkouts/my-feature',
      })
      expect(r.worktreePath).toBe('/tmp/checkouts/my-feature')
    })

    it('worktreePath is optional', () => {
      const r = safeParseRepoRef({
        url: 'https://github.com/org/repo.git',
        ref: 'main',
      })
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.worktreePath).toBeUndefined()
    })

    it('rejects invalid URL', () => {
      expect(
        safeParseRepoRef({ url: 'not-a-url', ref: 'main' }).success,
      ).toBe(false)
    })

    it('rejects empty ref', () => {
      expect(
        safeParseRepoRef({ url: 'https://github.com/org/repo.git', ref: '' }).success,
      ).toBe(false)
    })

    it('rejects ref exceeding 255 chars', () => {
      expect(
        safeParseRepoRef({
          url: 'https://github.com/org/repo.git',
          ref: 'x'.repeat(256),
        }).success,
      ).toBe(false)
    })

    it('rejects worktreePath exceeding 1024 chars', () => {
      expect(
        safeParseRepoRef({
          url: 'https://github.com/org/repo.git',
          ref: 'main',
          worktreePath: '/a'.repeat(513),
        }).success,
      ).toBe(false)
    })

    it('throws on parseRepoRef with invalid input', () => {
      expect(() => parseRepoRef({})).toThrow()
    })
  })
})
