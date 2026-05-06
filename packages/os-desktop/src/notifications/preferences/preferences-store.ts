/**
 * Notification preferences localStorage store.
 *
 * Key: agentskitos.notifications.prefs
 * Defaults: panel routing for all known event types, quiet hours disabled.
 */

import {
  NotificationPreferencesSchema,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './preferences-types'
import type { NotificationPreferences } from './preferences-types'

const STORAGE_KEY = 'agentskitos.notifications.prefs'

// ---------------------------------------------------------------------------
// Load / save
// ---------------------------------------------------------------------------

export function loadNotificationPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES
    const parsed = NotificationPreferencesSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return DEFAULT_NOTIFICATION_PREFERENCES
    // Merge with defaults so newly-added known event types get a routing value
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...parsed.data,
      routing: {
        ...DEFAULT_NOTIFICATION_PREFERENCES.routing,
        ...parsed.data.routing,
      },
    }
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES
  }
}

export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Non-fatal: ignore QuotaExceededError etc.
  }
}

export function clearNotificationPreferences(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Non-fatal
  }
}
