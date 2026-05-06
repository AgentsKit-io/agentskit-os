/**
 * NotificationsProvider — global notification center context.
 *
 * Exposes `useNotifications()` returning the NotificationsContextValue.
 * Subscribes to sidecar events via subscribeEvents(); auto-pushes a
 * notification for any event type matching `error.*` or `audit.flagged.*`.
 *
 * Integrates with NotificationPreferences (via useNotificationPreferences)
 * to apply per-event routing and quiet-hours suppression before pushing.
 *
 *   routing = 'silent'        → notification is dropped
 *   routing = 'panel'         → pushed to in-app panel (existing behaviour)
 *   routing = 'os-toast'      → TODO: Tauri Notification plugin (future)
 *   routing = 'desktop-alert' → TODO: Tauri Notification plugin (future)
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { subscribeEvents } from '../lib/sidecar'
import { useNotificationsStore } from './use-notifications-store'
import { useNotificationPreferences } from './preferences/notification-preferences-provider'
import { routeNotification } from './preferences/preferences-engine'
import type { NotificationsContextValue, Notify } from './types'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined)

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type NotificationsProviderProps = {
  children: React.ReactNode
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const store = useNotificationsStore()
  const { prefs } = useNotificationPreferences()

  // Subscribe to sidecar events and auto-push on error.* / audit.flagged.*
  useEffect(() => {
    const unsub = subscribeEvents((event) => {
      const { type, data } = event

      if (type.startsWith('error.')) {
        const routing = routeNotification({ eventType: type }, prefs)

        if (routing === 'silent') return

        const payload: Notify = {
          severity: 'error',
          title: `Error: ${type}`,
          message:
            typeof data['message'] === 'string'
              ? data['message']
              : JSON.stringify(data).slice(0, 120),
        }

        if (routing === 'panel') {
          store.push(payload)
        } else if (routing === 'os-toast' || routing === 'desktop-alert') {
          // TODO: deliver via Tauri Notification plugin when available
          // import('@tauri-apps/plugin-notification').then(({ sendNotification }) => {
          //   sendNotification({ title: payload.title, body: payload.message })
          // })
          store.push(payload)
        }
        return
      }

      if (type.startsWith('audit.flagged.')) {
        const routing = routeNotification({ eventType: type }, prefs)

        if (routing === 'silent') return

        const payload: Notify = {
          severity: 'warning',
          title: `Audit flag: ${type}`,
          message:
            typeof data['message'] === 'string'
              ? data['message']
              : JSON.stringify(data).slice(0, 120),
        }

        if (routing === 'panel') {
          store.push(payload)
        } else if (routing === 'os-toast' || routing === 'desktop-alert') {
          // TODO: deliver via Tauri Notification plugin when available
          store.push(payload)
        }
        return
      }
    })

    return unsub
    // prefs reference is intentionally excluded — we re-subscribe only when
    // the subscription itself needs to change. Routing reads prefs at call time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  const unread = useMemo(
    () => store.items.filter((n) => !n.read).length,
    [store.items],
  )

  const value: NotificationsContextValue = useMemo(
    () => ({
      items: store.items,
      unread,
      push: store.push,
      markRead: store.markRead,
      clear: store.clear,
      open,
      close,
      isOpen,
    }),
    [store.items, unread, store.push, store.markRead, store.clear, open, close, isOpen],
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}
