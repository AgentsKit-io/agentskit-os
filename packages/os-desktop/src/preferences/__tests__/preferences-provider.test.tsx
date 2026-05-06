/**
 * Tests for PreferencesProvider and usePreferences().
 *
 * Covers:
 *   - Context throws outside provider
 *   - Initial state matches defaults
 *   - set() updates prefs
 *   - reset() restores defaults
 *   - exportJson() serializes prefs
 *   - importJson() loads and validates JSON
 *   - importJson() throws on invalid JSON
 *   - Persists to localStorage on change
 *   - Loads from localStorage on mount
 *   - Applies data-attributes to documentElement
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { PreferencesProvider, usePreferences } from '../preferences-provider'
import type { PreferencesContextValue } from '../preferences-provider'
import { DEFAULT_PREFERENCES } from '../preferences-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Inspector({ capture }: { capture: (ctx: PreferencesContextValue) => void }) {
  const ctx = usePreferences()
  capture(ctx)
  return null
}

function renderProvider(): {
  container: HTMLDivElement
  root: ReturnType<typeof createRoot>
  ctx: () => PreferencesContextValue
} {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  let capturedCtx: PreferencesContextValue | undefined

  act(() => {
    root.render(
      createElement(
        PreferencesProvider,
        null,
        createElement(Inspector, {
          capture: (c) => {
            capturedCtx = c
          },
        }),
      ),
    )
  })

  return {
    container,
    root,
    ctx: () => capturedCtx!,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PreferencesProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset documentElement dataset
    const el = document.documentElement
    delete el.dataset['density']
    delete el.dataset['fontSize']
    delete el.dataset['reducedMotion']
    delete el.dataset['highContrast']
  })

  it('throws when usePreferences is used outside a provider', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const Broken = () => {
      usePreferences()
      return null
    }

    expect(() => {
      act(() => {
        root.render(createElement(Broken, null))
      })
    }).toThrow('usePreferences must be used within a PreferencesProvider')

    act(() => root.unmount())
    container.remove()
  })

  it('provides default preferences on first mount', () => {
    const { root, container, ctx } = renderProvider()

    expect(ctx().prefs).toEqual(DEFAULT_PREFERENCES)

    act(() => root.unmount())
    container.remove()
  })

  it('set() updates the specified fields', () => {
    const { root, container, ctx } = renderProvider()

    act(() => ctx().set({ density: 'compact', fontSize: 'lg' }))

    expect(ctx().prefs.density).toBe('compact')
    expect(ctx().prefs.fontSize).toBe('lg')
    // Other fields unchanged
    expect(ctx().prefs.language).toBe(DEFAULT_PREFERENCES.language)

    act(() => root.unmount())
    container.remove()
  })

  it('reset() restores defaults', () => {
    const { root, container, ctx } = renderProvider()

    act(() => ctx().set({ density: 'compact', telemetryOptIn: true }))
    act(() => ctx().reset())

    expect(ctx().prefs).toEqual(DEFAULT_PREFERENCES)

    act(() => root.unmount())
    container.remove()
  })

  it('exportJson() returns valid JSON matching current prefs', () => {
    const { root, container, ctx } = renderProvider()

    act(() => ctx().set({ language: 'ja' }))
    const json = ctx().exportJson()
    const parsed = JSON.parse(json)

    expect(parsed.language).toBe('ja')

    act(() => root.unmount())
    container.remove()
  })

  it('importJson() loads valid JSON and updates prefs', () => {
    const { root, container, ctx } = renderProvider()

    const newPrefs = { ...DEFAULT_PREFERENCES, density: 'compact', highContrast: true }
    act(() => ctx().importJson(JSON.stringify(newPrefs)))

    expect(ctx().prefs.density).toBe('compact')
    expect(ctx().prefs.highContrast).toBe(true)

    act(() => root.unmount())
    container.remove()
  })

  it('importJson() throws on invalid JSON', () => {
    const { root, container, ctx } = renderProvider()

    expect(() => {
      act(() => ctx().importJson('not-valid-json'))
    }).toThrow()

    act(() => root.unmount())
    container.remove()
  })

  it('importJson() throws when schema validation fails', () => {
    const { root, container, ctx } = renderProvider()

    expect(() => {
      act(() => ctx().importJson(JSON.stringify({ density: 'huge' })))
    }).toThrow()

    act(() => root.unmount())
    container.remove()
  })

  it('persists prefs to localStorage when set() is called', () => {
    const { root, container, ctx } = renderProvider()

    act(() => ctx().set({ fontSize: 'sm' }))

    const stored = localStorage.getItem('agentskitos.preferences')
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed.fontSize).toBe('sm')

    act(() => root.unmount())
    container.remove()
  })

  it('loads persisted prefs from localStorage on mount', () => {
    // Pre-populate storage
    localStorage.setItem(
      'agentskitos.preferences',
      JSON.stringify({ ...DEFAULT_PREFERENCES, language: 'fr' }),
    )

    const { root, container, ctx } = renderProvider()

    expect(ctx().prefs.language).toBe('fr')

    act(() => root.unmount())
    container.remove()
  })

  it('applies data-density to documentElement', () => {
    const { root, container, ctx } = renderProvider()

    act(() => ctx().set({ density: 'compact' }))

    expect(document.documentElement.dataset['density']).toBe('compact')

    act(() => root.unmount())
    container.remove()
  })

  it('applies data-reduced-motion to documentElement', () => {
    const { root, container, ctx } = renderProvider()

    act(() => ctx().set({ reducedMotion: true }))

    expect(document.documentElement.dataset['reducedMotion']).toBe('true')

    act(() => root.unmount())
    container.remove()
  })

  it('applies data-high-contrast to documentElement', () => {
    const { root, container, ctx } = renderProvider()

    act(() => ctx().set({ highContrast: true }))

    expect(document.documentElement.dataset['highContrast']).toBe('true')

    act(() => root.unmount())
    container.remove()
  })

  it('applies data-font-size to documentElement', () => {
    const { root, container, ctx } = renderProvider()

    act(() => ctx().set({ fontSize: 'lg' }))

    expect(document.documentElement.dataset['fontSize']).toBe('lg')

    act(() => root.unmount())
    container.remove()
  })
})
