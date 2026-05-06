/**
 * Tests for theme-editor-types — Zod schema validation and helpers.
 */

import { describe, it, expect } from 'vitest'
import {
  ThemeOverrideSchema,
  CustomThemeSchema,
  BaseThemeSchema,
  EDITABLE_TOKENS,
  TOKEN_SECTIONS,
  getTokensBySection,
} from '../theme-editor-types'

describe('BaseThemeSchema', () => {
  it('accepts valid base themes', () => {
    expect(BaseThemeSchema.parse('dark')).toBe('dark')
    expect(BaseThemeSchema.parse('cyber')).toBe('cyber')
    expect(BaseThemeSchema.parse('light')).toBe('light')
  })

  it('rejects unknown base theme', () => {
    expect(BaseThemeSchema.safeParse('ocean').success).toBe(false)
  })
})

describe('ThemeOverrideSchema', () => {
  it('accepts valid CSS var records', () => {
    const result = ThemeOverrideSchema.parse({
      '--ag-accent': '#22d3ee',
      '--ag-surface': '#08090c',
    })
    expect(result['--ag-accent']).toBe('#22d3ee')
  })

  it('rejects keys that do not start with --', () => {
    expect(
      ThemeOverrideSchema.safeParse({ 'ag-accent': '#22d3ee' }).success,
    ).toBe(false)
  })

  it('accepts empty record', () => {
    expect(ThemeOverrideSchema.parse({})).toEqual({})
  })
})

describe('CustomThemeSchema', () => {
  const valid = {
    id: 'my-theme-123',
    name: 'My Theme',
    base: 'dark' as const,
    overrides: { '--ag-accent': '#ff0000' },
  }

  it('parses a valid custom theme', () => {
    const result = CustomThemeSchema.parse(valid)
    expect(result.id).toBe('my-theme-123')
    expect(result.name).toBe('My Theme')
    expect(result.base).toBe('dark')
    expect(result.overrides['--ag-accent']).toBe('#ff0000')
  })

  it('rejects missing id', () => {
    const { id: _id, ...rest } = valid
    expect(CustomThemeSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects empty name', () => {
    expect(CustomThemeSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
  })

  it('rejects invalid base', () => {
    expect(CustomThemeSchema.safeParse({ ...valid, base: 'ocean' }).success).toBe(false)
  })

  it('rejects bad override keys', () => {
    expect(
      CustomThemeSchema.safeParse({ ...valid, overrides: { color: '#fff' } }).success,
    ).toBe(false)
  })
})

describe('EDITABLE_TOKENS', () => {
  it('is non-empty', () => {
    expect(EDITABLE_TOKENS.length).toBeGreaterThan(0)
  })

  it('all tokens have varName starting with --ag-', () => {
    for (const t of EDITABLE_TOKENS) {
      expect(t.varName).toMatch(/^--ag-/)
    }
  })

  it('all tokens have a non-empty label', () => {
    for (const t of EDITABLE_TOKENS) {
      expect(t.label.length).toBeGreaterThan(0)
    }
  })

  it('all tokens have a known section', () => {
    for (const t of EDITABLE_TOKENS) {
      expect(TOKEN_SECTIONS).toContain(t.section)
    }
  })
})

describe('getTokensBySection', () => {
  it('returns only tokens for the requested section', () => {
    const surfaceTokens = getTokensBySection('Surfaces')
    expect(surfaceTokens.every((t) => t.section === 'Surfaces')).toBe(true)
    expect(surfaceTokens.length).toBeGreaterThan(0)
  })

  it('returns empty for a section with no tokens', () => {
    // Cast to trick type-checker; we're testing the runtime filter
    const result = getTokensBySection('Unknown' as 'Surfaces')
    expect(result).toEqual([])
  })
})
