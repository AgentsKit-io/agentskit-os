/**
 * use-theme-editor — hook encapsulating live preview logic for the theme editor.
 *
 * Applies CSS variable overrides to `document.documentElement` on every change
 * (debounced 80ms) so the user sees a live preview as they tweak values.
 * On unmount or when the panel is closed, cleans up any overrides it applied.
 *
 * M2 / Issue #231 — Theme editor with live preview + marketplace stub.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { applyThemeToDocument, clearThemeOverrides } from '@agentskit/os-ui'
import {
  EDITABLE_TOKENS,
  type BaseTheme,
  type CustomTheme,
  type ThemeOverride,
} from './theme-editor-types'
import { loadCustomThemes, upsertCustomTheme, generateThemeId } from './theme-editor-store'

/** Default token values for each base theme. */
const BASE_DEFAULTS: Record<BaseTheme, ThemeOverride> = {
  dark: {
    '--ag-surface': '#08090c',
    '--ag-surface-alt': '#0d0e12',
    '--ag-surface-dim': '#0a0b0e',
    '--ag-panel': '#111217',
    '--ag-panel-alt': '#16171d',
    '--ag-line': '#1f2025',
    '--ag-line-soft': '#141519',
    '--ag-ink': '#f5f5f7',
    '--ag-ink-muted': '#a1a1aa',
    '--ag-ink-subtle': '#71717a',
    '--ag-accent': '#22d3ee',
    '--ag-accent-hover': '#67e8f9',
    '--ag-accent-dim': '#0e7490',
  },
  cyber: {
    '--ag-surface': '#050508',
    '--ag-surface-alt': '#0a0a10',
    '--ag-surface-dim': '#07070c',
    '--ag-panel': '#0d0d18',
    '--ag-panel-alt': '#12121f',
    '--ag-line': '#1a1a2e',
    '--ag-line-soft': '#111122',
    '--ag-ink': '#e8e8ff',
    '--ag-ink-muted': '#9090bb',
    '--ag-ink-subtle': '#6060aa',
    '--ag-accent': '#00f5ff',
    '--ag-accent-hover': '#66faff',
    '--ag-accent-dim': '#003d40',
  },
  light: {
    '--ag-surface': '#ffffff',
    '--ag-surface-alt': '#f5f5f7',
    '--ag-surface-dim': '#fafafa',
    '--ag-panel': '#f0f0f2',
    '--ag-panel-alt': '#e8e8ec',
    '--ag-line': '#d4d4d8',
    '--ag-line-soft': '#e4e4e7',
    '--ag-ink': '#09090b',
    '--ag-ink-muted': '#52525b',
    '--ag-ink-subtle': '#71717a',
    '--ag-accent': '#0891b2',
    '--ag-accent-hover': '#0e7490',
    '--ag-accent-dim': '#cffafe',
  },
}

export interface UseThemeEditorReturn {
  /** Current base theme selection */
  baseTheme: BaseTheme
  setBaseTheme: (base: BaseTheme) => void
  /** Active overrides (CSS var → value) */
  overrides: ThemeOverride
  /** Update a single token value */
  setToken: (varName: string, value: string) => void
  /** Reset overrides to the base theme defaults */
  reset: () => void
  /** Name for a new theme (used by Save As New) */
  themeName: string
  setThemeName: (name: string) => void
  /** Currently editing theme id (undefined = creating new) */
  editingId: string | undefined
  /** Load an existing CustomTheme into the editor */
  loadTheme: (theme: CustomTheme) => void
  /** Apply a preview of marketplace-style overrides without saving */
  previewOverrides: (overrides: ThemeOverride) => void
  /** Save the current edits, updating an existing theme or creating a new one */
  save: () => CustomTheme
  /** Save as a brand-new theme regardless of whether one is loaded */
  saveAsNew: (name?: string) => CustomTheme
  /** Resolved token values (base defaults merged with overrides) */
  resolvedTokens: ThemeOverride
  /** All saved custom themes (refreshed on save) */
  savedThemes: CustomTheme[]
  /** Refresh list of saved themes from store */
  refreshSaved: () => void
}

const DEBOUNCE_MS = 80

export function useThemeEditor(): UseThemeEditorReturn {
  const [baseTheme, setBaseThemeState] = useState<BaseTheme>('dark')
  const [overrides, setOverrides] = useState<ThemeOverride>({})
  const [themeName, setThemeName] = useState('My Theme')
  const [editingId, setEditingId] = useState<string | undefined>(undefined)
  const [savedThemes, setSavedThemes] = useState<CustomTheme[]>([])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const appliedVarsRef = useRef<string[]>([])

  const resolvedTokens: ThemeOverride = {
    ...BASE_DEFAULTS[baseTheme],
    ...overrides,
  }

  const refreshSaved = useCallback(() => {
    setSavedThemes(loadCustomThemes())
  }, [])

  // Load saved themes on mount
  useEffect(() => {
    refreshSaved()
  }, [refreshSaved])

  // Debounced live preview: apply all resolved tokens to documentElement
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      applyThemeToDocument({
        name: baseTheme,
        cssVars: resolvedTokens,
      })
      appliedVarsRef.current = Object.keys(resolvedTokens)
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseTheme, overrides])

  // On unmount, restore the base theme without custom overrides
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      clearThemeOverrides(appliedVarsRef.current)
    }
  }, [])

  const setBaseTheme = useCallback((base: BaseTheme) => {
    setBaseThemeState(base)
    setOverrides({})
  }, [])

  const setToken = useCallback((varName: string, value: string) => {
    setOverrides((prev) => ({ ...prev, [varName]: value }))
  }, [])

  const reset = useCallback(() => {
    setOverrides({})
  }, [])

  const loadTheme = useCallback((theme: CustomTheme) => {
    setBaseThemeState(theme.base)
    setOverrides(theme.overrides)
    setThemeName(theme.name)
    setEditingId(theme.id)
  }, [])

  const previewOverrides = useCallback((incoming: ThemeOverride) => {
    setOverrides(incoming)
  }, [])

  const save = useCallback((): CustomTheme => {
    const id = editingId ?? generateThemeId(themeName)
    const theme: CustomTheme = {
      id,
      name: themeName,
      base: baseTheme,
      overrides,
    }
    upsertCustomTheme(theme)
    setEditingId(id)
    setSavedThemes(loadCustomThemes())
    return theme
  }, [editingId, themeName, baseTheme, overrides])

  const saveAsNew = useCallback((name?: string): CustomTheme => {
    const newName = name ?? `${themeName} (copy)`
    const id = generateThemeId(newName)
    const theme: CustomTheme = {
      id,
      name: newName,
      base: baseTheme,
      overrides,
    }
    upsertCustomTheme(theme)
    setThemeName(newName)
    setEditingId(id)
    setSavedThemes(loadCustomThemes())
    return theme
  }, [themeName, baseTheme, overrides])

  return {
    baseTheme,
    setBaseTheme,
    overrides,
    setToken,
    reset,
    themeName,
    setThemeName,
    editingId,
    loadTheme,
    previewOverrides,
    save,
    saveAsNew,
    resolvedTokens,
    savedThemes,
    refreshSaved,
  }
}

export { BASE_DEFAULTS, EDITABLE_TOKENS }
