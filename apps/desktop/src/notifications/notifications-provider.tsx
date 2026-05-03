/**
 * NotificationsProvider — global notification center context.
 *
 * Exposes `useNotifications()` returning the NotificationsContextValue.
 * Subscribes to sidecar events via subscribeEvents(); auto-pushes a
 * notification for any event type matching `error.*` or `audit.flagged.*`.
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

  // Subscribe to sidecar events and auto-push on error.* / audit.flagged.*
  useEffect(() => {
    const unsub = subscribeEvents((event) => {
      const { type, data } = event

      if (type.startsWith('error.')) {
        const payload: Notify = {
          severity: 'error',
          title: `Error: ${type}`,
          message:
            typeof data['message'] === 'string'
              ? data['message']
              : JSON.stringify(data).slice(0, 120),
        }
        store.push(payload)
        return
      }

      if (type.startsWith('audit.flagged.')) {
        const payload: Notify = {
          severity: 'warning',
          title: `Audit flag: ${type}`,
          message:
            typeof data['message'] === 'string'
              ? data['message']
              : JSON.stringify(data).slice(0, 120),
        }
        store.push(payload)
        return
      }
    })

    return unsub
    // store.push is stable (useCallback), but we only want to subscribe once
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
