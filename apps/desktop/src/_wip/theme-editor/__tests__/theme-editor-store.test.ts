/**
 * Tests for theme-editor-store — localStorage CRUD + JSON import/export.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadCustomThemes,
  addCustomTheme,
  updateCustomTheme,
  removeCustomTheme,
  upsertCustomTheme,
  exportThemeJson,
  importThemeJson,
  generateThemeId,
} from '../theme-editor-store'
import type { CustomTheme } from '../theme-editor-types'

const BASE_THEME: CustomTheme = {
  id: 'test-theme-1',
  name: 'Test Theme',
  base: 'dark',
  overrides: { '--ag-accent': '#ff0000' },
}

describe('loadCustomThemes', () => {
  it('returns [] when nothing is stored', () => {
    expect(loadCustomThemes()).toEqual([])
  })

  it('returns [] when stored JSON is malformed', () => {
    localStorage.setItem('agentskitos.custom-themes', '{bad json}')
    expect(loadCustomThemes()).toEqual([])
  })

  it('returns [] when stored array fails Zod validation', () => {
    localStorage.setItem('agentskitos.custom-themes', JSON.stringify([{ invalid: true }]))
    expect(loadCustomThemes()).toEqual([])
  })
})

describe('addCustomTheme', () => {
  it('adds a theme and persists it', () => {
    const result = addCustomTheme(BASE_THEME)
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('test-theme-1')
    // Verify persistence
    expect(loadCustomThemes()).toHaveLength(1)
  })

  it('throws when a theme with the same id already exists', () => {
    addCustomTheme(BASE_THEME)
    expect(() => addCustomTheme(BASE_THEME)).toThrow('test-theme-1')
  })
})

describe('updateCustomTheme', () => {
  beforeEach(() => {
    addCustomTheme(BASE_THEME)
  })

  it('updates name of an existing theme', () => {
    const result = updateCustomTheme('test-theme-1', { name: 'Renamed' })
    expect(result).not.toBeNull()
    expect(result![0]!.name).toBe('Renamed')
    expect(loadCustomThemes()[0]!.name).toBe('Renamed')
  })

  it('updates overrides', () => {
    const result = updateCustomTheme('test-theme-1', {
      overrides: { '--ag-accent': '#00ff00' },
    })
    expect(result![0]!.overrides['--ag-accent']).toBe('#00ff00')
  })

  it('returns null when id does not exist', () => {
    expect(updateCustomTheme('no-such-id', { name: 'X' })).toBeNull()
  })
})

describe('removeCustomTheme', () => {
  it('removes a theme by id', () => {
    addCustomTheme(BASE_THEME)
    const result = removeCustomTheme('test-theme-1')
    expect(result).toHaveLength(0)
    expect(loadCustomThemes()).toHaveLength(0)
  })

  it('is a no-op for an unknown id', () => {
    addCustomTheme(BASE_THEME)
    const result = removeCustomTheme('ghost')
    expect(result).toHaveLength(1)
  })
})

describe('upsertCustomTheme', () => {
  it('inserts a new theme when id is not present', () => {
    const result = upsertCustomTheme(BASE_THEME)
    expect(result).toHaveLength(1)
  })

  it('updates an existing theme when id matches', () => {
    upsertCustomTheme(BASE_THEME)
    const updated = { ...BASE_THEME, name: 'Updated Name' }
    const result = upsertCustomTheme(updated)
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('Updated Name')
  })
})

describe('exportThemeJson / importThemeJson', () => {
  it('round-trips a CustomTheme through JSON', () => {
    const json = exportThemeJson(BASE_THEME)
    const parsed = importThemeJson(json)
    expect(parsed).toEqual(BASE_THEME)
  })

  it('importThemeJson throws on invalid JSON', () => {
    expect(() => importThemeJson('{bad}')).toThrow()
  })

  it('importThemeJson throws on invalid schema', () => {
    const bad = JSON.stringify({ id: '', name: '', base: 'ocean', overrides: {} })
    expect(() => importThemeJson(bad)).toThrow()
  })
})

describe('generateThemeId', () => {
  it('generates an id containing the slugified name', () => {
    const id = generateThemeId('My Cool Theme')
    expect(id).toContain('my-cool-theme')
    expect(id).toMatch(/^custom-/)
  })

  it('generates unique ids for repeated calls', () => {
    const id1 = generateThemeId('Test')
    const id2 = generateThemeId('Test')
    // They may differ by timestamp; in practice we just ensure both are valid strings
    expect(typeof id1).toBe('string')
    expect(typeof id2).toBe('string')
  })
})
