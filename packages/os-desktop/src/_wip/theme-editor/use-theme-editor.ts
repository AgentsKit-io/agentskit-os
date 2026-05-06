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
const makeBaseDefaults = (
  surface: string,
  surfaceAlt: string,
  surfaceDim: string,
  panel: string,
  panelAlt: string,
  line: string,
  lineSoft: string,
  ink: string,
  inkMuted: string,
  inkSubtle: string,
  accent: string,
  accentHover: string,
  accentDim: string,
): ThemeOverride => ({
  '--ag-surface': surface,
  '--ag-surface-alt': surfaceAlt,
  '--ag-surface-dim': surfaceDim,
  '--ag-panel': panel,
  '--ag-panel-alt': panelAlt,
  '--ag-line': line,
  '--ag-line-soft': lineSoft,
  '--ag-ink': ink,
  '--ag-ink-muted': inkMuted,
  '--ag-ink-subtle': inkSubtle,
  '--ag-accent': accent,
  '--ag-accent-hover': accentHover,
  '--ag-accent-dim': accentDim,
})

const BASE_DEFAULTS: Record<BaseTheme, ThemeOverride> = {
  dark: makeBaseDefaults('#08090c', '#0d0e12', '#0a0b0e', '#111217', '#16171d', '#1f2025', '#141519', '#f5f5f7', '#a1a1aa', '#71717a', '#22d3ee', '#67e8f9', '#0e7490'),
  cyber: makeBaseDefaults('#050508', '#0a0a10', '#07070c', '#0d0d18', '#12121f', '#1a1a2e', '#111122', '#e8e8ff', '#9090bb', '#6060aa', '#00f5ff', '#66faff', '#003d40'),
  light: makeBaseDefaults('#ffffff', '#f5f5f7', '#fafafa', '#f0f0f2', '#e8e8ec', '#d4d4d8', '#e4e4e7', '#09090b', '#52525b', '#71717a', '#0891b2', '#0e7490', '#cffafe'),
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
