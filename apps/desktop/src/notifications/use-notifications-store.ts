/**
 * useNotificationsStore — in-memory ring buffer with localStorage persistence.
 *
 * Rules:
 *   - Keeps the last MAX_MEMORY (200) notifications in memory.
 *   - Persists the last MAX_PERSIST (50) to localStorage under
 *     `agentskitos.notifications` on every mutation.
 *   - Hydrates from localStorage on first mount.
 */

import { useCallback, useState } from 'react'
import type { Notification, NotificationAction, Notify } from './types'

const MAX_MEMORY = 200
const MAX_PERSIST = 50
const STORAGE_KEY = 'agentskitos.notifications'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function loadFromStorage(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Strip action functions — they can't survive serialisation.
    // Use destructuring to omit `action` entirely (exactOptionalPropertyTypes safe).
    return (parsed as Notification[]).map(({ action: _action, ...rest }) => ({ ...rest }))
  } catch {
    return []
  }
}

function saveToStorage(items: Notification[]): void {
  try {
    // Persist newest MAX_PERSIST items, strip non-serialisable action fns
    const toSave = items.slice(0, MAX_PERSIST).map(({ action: _action, ...rest }) => rest)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch {
    // Ignore QuotaExceededError and other storage errors
  }
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export type NotificationsStore = {
  items: Notification[]
  push: (n: Notify) => void
  markRead: (id: string) => void
  clear: () => void
}

export function useNotificationsStore(): NotificationsStore {
  const [items, setItems] = useState<Notification[]>(() => loadFromStorage())

  const push = useCallback((n: Notify) => {
    // Build the item without optional keys, then conditionally spread them
    // to satisfy exactOptionalPropertyTypes.
    const baseItem = {
      id: generateId(),
      severity: n.severity,
      title: n.title,
      timestamp: new Date().toISOString(),
      read: false as const,
    }
    const newItem: Notification = {
      ...baseItem,
      ...(n.message !== undefined ? { message: n.message } : {}),
      ...(n.action !== undefined ? { action: n.action as NotificationAction } : {}),
    }

    setItems((prev) => {
      // Prepend newest, cap at MAX_MEMORY
      const next = [newItem, ...prev].slice(0, MAX_MEMORY)
      saveToStorage(next)
      return next
    })
  }, [])

  const markRead = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      saveToStorage(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setItems([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
  }, [])

  return { items, push, markRead, clear }
}
