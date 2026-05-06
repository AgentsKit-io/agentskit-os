/**
 * Tests for PreferencesSchema Zod parsing.
 *
 * Covers:
 *   - Default values applied when no input is given
 *   - Valid full input round-trips
 *   - Invalid field values produce parse errors
 *   - Partial input fills remaining fields with defaults
 */

import { describe, it, expect } from 'vitest'
import { PreferencesSchema, DEFAULT_PREFERENCES } from '../preferences-types'

describe('PreferencesSchema', () => {
  it('parses empty object using defaults', () => {
    const result = PreferencesSchema.parse({})
    expect(result.density).toBe('comfortable')
    expect(result.fontSize).toBe('md')
    expect(result.language).toBe('en')
    expect(result.reducedMotion).toBe(false)
    expect(result.highContrast).toBe(false)
    expect(result.telemetryOptIn).toBe(false)
  })

  it('round-trips a valid full preferences object', () => {
    const input = {
      density: 'compact',
      fontSize: 'lg',
      language: 'ja',
      reducedMotion: true,
      highContrast: true,
      telemetryOptIn: true,
    }
    const result = PreferencesSchema.parse(input)
    expect(result).toEqual(input)
  })

  it('applies defaults for missing fields in a partial object', () => {
    const result = PreferencesSchema.parse({ density: 'compact' })
    expect(result.density).toBe('compact')
    expect(result.fontSize).toBe('md')
    expect(result.language).toBe('en')
  })

  it('rejects an invalid density value', () => {
    expect(() => PreferencesSchema.parse({ density: 'huge' })).toThrow()
  })

  it('rejects an invalid fontSize value', () => {
    expect(() => PreferencesSchema.parse({ fontSize: 'xl' })).toThrow()
  })

  it('rejects an invalid language value', () => {
    expect(() => PreferencesSchema.parse({ language: 'klingon' })).toThrow()
  })

  it('rejects non-boolean reducedMotion', () => {
    expect(() => PreferencesSchema.parse({ reducedMotion: 'yes' })).toThrow()
  })

  it('DEFAULT_PREFERENCES matches schema defaults', () => {
    const defaults = PreferencesSchema.parse({})
    expect(DEFAULT_PREFERENCES).toEqual(defaults)
  })

  it('accepts all valid language codes', () => {
    for (const lang of ['en', 'es', 'pt', 'fr', 'de', 'ja'] as const) {
      expect(() => PreferencesSchema.parse({ language: lang })).not.toThrow()
    }
  })

  it('accepts all valid density values', () => {
    for (const d of ['compact', 'comfortable'] as const) {
      expect(() => PreferencesSchema.parse({ density: d })).not.toThrow()
    }
  })

  it('accepts all valid fontSize values', () => {
    for (const fs of ['sm', 'md', 'lg'] as const) {
      expect(() => PreferencesSchema.parse({ fontSize: fs })).not.toThrow()
    }
  })
})
