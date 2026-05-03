/**
 * PreferencesProvider — global user-preferences context.
 *
 * Persists to localStorage under `agentskitos.preferences`.
 * Applies preferences to `document.documentElement` as data-attributes:
 *
 *   data-density="compact|comfortable"
 *   data-font-size="sm|md|lg"
 *   data-reduced-motion="true|false"
 *   data-high-contrast="true|false"
 *
 * Language is stored but not applied to the DOM here (would need i18n lib).
 *
 * API (via `usePreferences()`):
 *   prefs       — current Preferences object
 *   set         — partial update (merges with current)
 *   reset       — restore defaults
 *   exportJson  — serialize prefs to a JSON string
 *   importJson  — parse a JSON string and overwrite prefs (throws on invalid)
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { PreferencesSchema, DEFAULT_PREFERENCES } from './preferences-types'
import type { Preferences } from './preferences-types'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type PreferencesContextValue = {
  prefs: Preferences
  set: (partial: Partial<Preferences>) => void
  reset: () => void
  exportJson: () => string
  importJson: (json: string) => void
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined)

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) {
    throw new Error('usePreferences must be used within a PreferencesProvider')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'agentskitos.preferences'

function loadFromStorage(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    const parsed = PreferencesSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : DEFAULT_PREFERENCES
  } catch {
    return DEFAULT_PREFERENCES
  }
}

function saveToStorage(prefs: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// DOM application
// ---------------------------------------------------------------------------

function applyToDocument(prefs: Preferences): void {
  const el = document.documentElement
  el.dataset['density'] = prefs.density
  el.dataset['fontSize'] = prefs.fontSize
  el.dataset['reducedMotion'] = String(prefs.reducedMotion)
  el.dataset['highContrast'] = String(prefs.highContrast)
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type PreferencesProviderProps = {
  children: React.ReactNode
}

export function PreferencesProvider({ children }: PreferencesProviderProps) {
  const [prefs, setPrefs] = useState<Preferences>(loadFromStorage)

  // Apply to DOM whenever prefs change
  useEffect(() => {
    applyToDocument(prefs)
    saveToStorage(prefs)
  }, [prefs])

  const set = useCallback((partial: Partial<Preferences>) => {
    setPrefs((prev) => {
      const merged = PreferencesSchema.parse({ ...prev, ...partial })
      return merged
    })
  }, [])

  const reset = useCallback(() => {
    setPrefs(DEFAULT_PREFERENCES)
  }, [])

  const exportJson = useCallback(() => {
    return JSON.stringify(prefs, null, 2)
  }, [prefs])

  const importJson = useCallback((json: string) => {
    const parsed = PreferencesSchema.parse(JSON.parse(json))
    setPrefs(parsed)
  }, [])

  const value: PreferencesContextValue = useMemo(
    () => ({ prefs, set, reset, exportJson, importJson }),
    [prefs, set, reset, exportJson, importJson],
  )

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}
