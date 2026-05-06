/**
 * NotificationPreferencesProvider — persisted notification preference context.
 *
 * Exposes useNotificationPreferences() returning the current prefs and
 * save / reset helpers.
 *
 * Persistence: localStorage key agentskitos.notifications.prefs.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  clearNotificationPreferences,
} from './preferences-store'
import { DEFAULT_NOTIFICATION_PREFERENCES, NotificationPreferencesSchema } from './preferences-types'
import type { NotificationPreferences } from './preferences-types'

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

export type NotificationPreferencesContextValue = {
  prefs: NotificationPreferences
  save: (next: NotificationPreferences) => void
  reset: () => void
}

const NotificationPreferencesContext = createContext<
  NotificationPreferencesContextValue | undefined
>(undefined)

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNotificationPreferences(): NotificationPreferencesContextValue {
  const ctx = useContext(NotificationPreferencesContext)
  if (!ctx) {
    throw new Error(
      'useNotificationPreferences must be used within a NotificationPreferencesProvider',
    )
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type NotificationPreferencesProviderProps = {
  children: React.ReactNode
}

export function NotificationPreferencesProvider({
  children,
}: NotificationPreferencesProviderProps) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(loadNotificationPreferences)

  const save = useCallback((next: NotificationPreferences) => {
    const validated = NotificationPreferencesSchema.parse(next)
    setPrefs(validated)
    saveNotificationPreferences(validated)
  }, [])

  const reset = useCallback(() => {
    setPrefs(DEFAULT_NOTIFICATION_PREFERENCES)
    clearNotificationPreferences()
  }, [])

  const value: NotificationPreferencesContextValue = useMemo(
    () => ({ prefs, save, reset }),
    [prefs, save, reset],
  )

  return (
    <NotificationPreferencesContext.Provider value={value}>
      {children}
    </NotificationPreferencesContext.Provider>
  )
}
