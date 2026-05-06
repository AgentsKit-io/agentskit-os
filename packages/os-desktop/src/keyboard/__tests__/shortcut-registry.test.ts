/**
 * Unit tests for shortcut-registry.ts.
 */

import { describe, it, expect } from 'vitest'
import { BUILT_IN_SHORTCUTS, getBuiltIn, getCategories } from '../shortcut-registry'

describe('BUILT_IN_SHORTCUTS', () => {
  it('has exactly 13 shortcuts', () => {
    expect(BUILT_IN_SHORTCUTS).toHaveLength(13)
  })

  it('all shortcuts have required fields', () => {
    for (const s of BUILT_IN_SHORTCUTS) {
      expect(s.id).toBeTruthy()
      expect(s.label).toBeTruthy()
      expect(s.defaultBinding).toBeTruthy()
      expect(s.description).toBeTruthy()
      expect(s.category).toBeTruthy()
    }
  })

  it('all ids are unique', () => {
    const ids = BUILT_IN_SHORTCUTS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('default bindings have no duplicates', () => {
    const bindings = BUILT_IN_SHORTCUTS.map((s) => s.defaultBinding)
    expect(new Set(bindings).size).toBe(bindings.length)
  })

  it('includes palette.toggle with meta+k', () => {
    const palette = BUILT_IN_SHORTCUTS.find((s) => s.id === 'palette.toggle')
    expect(palette).toBeDefined()
    expect(palette?.defaultBinding).toBe('meta+k')
  })

  it('includes shortcuts.open', () => {
    const shortcutsPanel = BUILT_IN_SHORTCUTS.find((s) => s.id === 'shortcuts.open')
    expect(shortcutsPanel).toBeDefined()
    expect(shortcutsPanel?.category).toBe('Navigation')
  })
})

describe('getBuiltIn', () => {
  it('returns the shortcut for a known id', () => {
    const s = getBuiltIn('palette.toggle')
    expect(s?.id).toBe('palette.toggle')
  })

  it('returns undefined for an unknown id', () => {
    expect(getBuiltIn('nonexistent.id')).toBeUndefined()
  })
})

describe('getCategories', () => {
  it('returns unique categories in insertion order', () => {
    const cats = getCategories()
    expect(cats).toContain('Navigation')
    expect(cats).toContain('View')
    expect(cats).toContain('Runtime')
    expect(cats).toContain('System')
    expect(cats).toContain('Help')
    // All unique
    expect(new Set(cats).size).toBe(cats.length)
  })

  it('Navigation comes first', () => {
    const cats = getCategories()
    expect(cats[0]).toBe('Navigation')
  })
})
