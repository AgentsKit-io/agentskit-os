import { describe, it, expect, beforeEach } from 'vitest'
import {
  ThemeDefinitionSchema,
  ThemeRegistrySchema,
  defaultThemes,
  buildThemeRegistry,
  applyThemeToDocument,
  clearThemeOverrides,
} from '../src/theme/theme-registry'

describe('ThemeDefinitionSchema', () => {
  it('parses a minimal valid definition', () => {
    const result = ThemeDefinitionSchema.safeParse({ name: 'dark' })
    expect(result.success).toBe(true)
  })

  it('parses a definition with cssVars', () => {
    const result = ThemeDefinitionSchema.safeParse({
      name: 'custom',
      cssVars: { '--ag-accent': '#ff0000' },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cssVars?.['--ag-accent']).toBe('#ff0000')
    }
  })

  it('rejects an empty name', () => {
    const result = ThemeDefinitionSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = ThemeDefinitionSchema.safeParse({ cssVars: {} })
    expect(result.success).toBe(false)
  })

  it('rejects cssVar keys that do not start with --', () => {
    const result = ThemeDefinitionSchema.safeParse({
      name: 'bad',
      cssVars: { 'color': 'red' },
    })
    expect(result.success).toBe(false)
  })
})

describe('ThemeRegistrySchema', () => {
  it('parses a valid registry', () => {
    const result = ThemeRegistrySchema.safeParse({
      dark: { name: 'dark' },
      light: { name: 'light' },
    })
    expect(result.success).toBe(true)
  })
})

describe('defaultThemes', () => {
  it('contains dark, light, and cyber', () => {
    expect(defaultThemes).toHaveProperty('dark')
    expect(defaultThemes).toHaveProperty('light')
    expect(defaultThemes).toHaveProperty('cyber')
  })

  it('has correct names', () => {
    expect(defaultThemes.dark.name).toBe('dark')
    expect(defaultThemes.light.name).toBe('light')
    expect(defaultThemes.cyber.name).toBe('cyber')
  })
})

describe('buildThemeRegistry', () => {
  it('returns default themes when no extra are provided', () => {
    const registry = buildThemeRegistry()
    expect(registry).toHaveProperty('dark')
    expect(registry).toHaveProperty('light')
    expect(registry).toHaveProperty('cyber')
  })

  it('merges extra themes', () => {
    const registry = buildThemeRegistry({
      custom: { name: 'custom', cssVars: { '--ag-accent': '#abc' } },
    })
    expect(registry).toHaveProperty('custom')
    expect(registry.custom.cssVars?.['--ag-accent']).toBe('#abc')
  })

  it('preserves built-in themes when merging', () => {
    const registry = buildThemeRegistry({ solarized: { name: 'solarized' } })
    expect(registry).toHaveProperty('dark')
    expect(registry).toHaveProperty('cyber')
  })

  it('skips invalid extra theme entries', () => {
    const registry = buildThemeRegistry({
      // @ts-expect-error intentionally invalid
      bad: { name: '' },
    })
    expect(registry).not.toHaveProperty('bad')
  })
})

describe('applyThemeToDocument', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('style')
  })

  it('sets data-theme attribute', () => {
    applyThemeToDocument({ name: 'dark' })
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('applies cssVars to documentElement.style', () => {
    applyThemeToDocument({
      name: 'custom',
      cssVars: { '--ag-accent': '#ff0000' },
    })
    expect(document.documentElement.style.getPropertyValue('--ag-accent')).toBe(
      '#ff0000',
    )
  })

  it('does not throw when cssVars is undefined', () => {
    expect(() => applyThemeToDocument({ name: 'dark' })).not.toThrow()
  })
})

describe('clearThemeOverrides', () => {
  it('removes previously applied CSS variables', () => {
    document.documentElement.style.setProperty('--ag-accent', '#ff0000')
    clearThemeOverrides(['--ag-accent'])
    expect(document.documentElement.style.getPropertyValue('--ag-accent')).toBe('')
  })
})
