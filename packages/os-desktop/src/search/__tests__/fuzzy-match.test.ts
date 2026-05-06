/**
 * Unit tests for fuzzy-match.ts — 15+ cases.
 */

import { describe, it, expect } from 'vitest'
import { fuzzyScore, fuzzyFilter, normalise } from '../fuzzy-match'

// ---------------------------------------------------------------------------
// normalise
// ---------------------------------------------------------------------------

describe('normalise', () => {
  it('converts to lower-case', () => {
    expect(normalise('Hello WORLD')).toBe('hello world')
  })

  it('collapses multiple spaces', () => {
    expect(normalise('foo   bar')).toBe('foo bar')
  })

  it('trims leading/trailing whitespace', () => {
    expect(normalise('  trim  ')).toBe('trim')
  })
})

// ---------------------------------------------------------------------------
// fuzzyScore
// ---------------------------------------------------------------------------

describe('fuzzyScore', () => {
  it('returns 1 for empty query', () => {
    expect(fuzzyScore('', 'anything')).toBe(1)
  })

  it('returns 0 for empty text (non-empty query)', () => {
    expect(fuzzyScore('q', '')).toBe(0)
  })

  it('prefix match returns 150', () => {
    expect(fuzzyScore('da', 'dashboard')).toBe(150)
  })

  it('exact substring (not at start) returns 100', () => {
    expect(fuzzyScore('board', 'dashboard')).toBe(100)
  })

  it('case-insensitive prefix match', () => {
    expect(fuzzyScore('DA', 'dashboard')).toBe(150)
  })

  it('case-insensitive substring match', () => {
    expect(fuzzyScore('BOARD', 'dashboard')).toBe(100)
  })

  it('subsequence match returns a value between 1 and 50', () => {
    // 'd', 'a', 'h' appear in order in 'dashboard'
    const score = fuzzyScore('dah', 'dashboard')
    expect(score).toBeGreaterThanOrEqual(1)
    expect(score).toBeLessThanOrEqual(50)
  })

  it('non-matching query returns 0', () => {
    expect(fuzzyScore('xyz', 'dashboard')).toBe(0)
  })

  it('prefix score is higher than substring score', () => {
    expect(fuzzyScore('dash', 'dashboard')).toBeGreaterThan(fuzzyScore('board', 'dashboard'))
  })

  it('prefix score is higher than subsequence score', () => {
    expect(fuzzyScore('da', 'dashboard')).toBeGreaterThan(fuzzyScore('dhs', 'dashboard'))
  })

  it('identical string returns prefix match score (150)', () => {
    expect(fuzzyScore('trace', 'trace')).toBe(150)
  })

  it('short subsequence in long text scores low', () => {
    const score = fuzzyScore('a', 'antidisestablishmentarianism')
    // 'a' is both a prefix AND start of text, so 150
    expect(score).toBe(150)
  })

  it('non-subsequence with shared chars returns 0 if order wrong', () => {
    // 'ba' cannot be a subsequence of 'abc' from left-to-right when reversed
    // 'ba' in 'abc': b at index 1, a at index 0 → a comes before b, fails
    expect(fuzzyScore('ba', 'abc')).toBe(0)
  })

  it('handles single character queries', () => {
    expect(fuzzyScore('t', 'traces')).toBe(150) // prefix
    expect(fuzzyScore('r', 'traces')).toBeGreaterThan(0) // subsequence or substring
  })

  it('returns non-zero for matching multi-word query', () => {
    expect(fuzzyScore('go to', 'go to dashboard')).toBe(150)
  })
})

// ---------------------------------------------------------------------------
// fuzzyFilter
// ---------------------------------------------------------------------------

describe('fuzzyFilter', () => {
  const entities = [
    { label: 'Dashboard', subtitle: 'home' },
    { label: 'Traces', subtitle: 'observability' },
    { label: 'Settings', subtitle: 'preferences' },
    { label: 'Workspaces', subtitle: 'manage workspaces' },
    { label: 'Go to Traces', subtitle: 'Navigation' },
  ]

  it('returns all entities when query is empty', () => {
    const result = fuzzyFilter('', entities)
    expect(result).toHaveLength(entities.length)
  })

  it('filters by label prefix', () => {
    const result = fuzzyFilter('da', entities)
    expect(result.map((e) => e.label)).toContain('Dashboard')
  })

  it('filters by label substring', () => {
    const result = fuzzyFilter('setting', entities)
    expect(result.map((e) => e.label)).toContain('Settings')
  })

  it('filters by subtitle', () => {
    const result = fuzzyFilter('observability', entities)
    expect(result.map((e) => e.label)).toContain('Traces')
  })

  it('returns empty array when nothing matches', () => {
    const result = fuzzyFilter('zzzzz', entities)
    expect(result).toHaveLength(0)
  })

  it('ranks prefix matches above substring matches', () => {
    // 'Traces' (prefix 'tr') should rank above 'Go to Traces' (substring 'Traces')
    const result = fuzzyFilter('traces', entities)
    const labels = result.map((e) => e.label)
    expect(labels.indexOf('Traces')).toBeLessThan(labels.indexOf('Go to Traces'))
  })

  it('caps results at 200', () => {
    const large = Array.from({ length: 300 }, (_, i) => ({ label: `item ${i}` }))
    const result = fuzzyFilter('item', large)
    expect(result.length).toBeLessThanOrEqual(200)
  })
})
