/**
 * Unit tests for useNotificationsStore.
 *
 * Tests cover:
 *   - Initial hydration from localStorage
 *   - push() prepends newest, caps at MAX_MEMORY (200)
 *   - markRead() flips the read flag
 *   - clear() empties state and removes localStorage key
 *   - Persistence: saves newest MAX_PERSIST (50) to localStorage
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useNotificationsStore } from '../use-notifications-store'
import type { Notify } from '../types'

const STORAGE_KEY = 'agentskitos.notifications'

function makeNotify(overrides: Partial<Notify> = {}): Notify {
  return {
    severity: 'info',
    title: 'Test notification',
    ...overrides,
  }
}

describe('useNotificationsStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts empty when localStorage has no data', () => {
    const { result } = renderHook(() => useNotificationsStore())
    expect(result.current.items).toHaveLength(0)
  })

  it('hydrates from localStorage on first render', () => {
    const stored = [
      {
        id: 'abc',
        severity: 'info',
        title: 'Stored notification',
        timestamp: new Date().toISOString(),
        read: false,
      },
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

    const { result } = renderHook(() => useNotificationsStore())
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]?.title).toBe('Stored notification')
  })

  it('push() adds a new notification at the front', () => {
    const { result } = renderHook(() => useNotificationsStore())

    act(() => {
      result.current.push(makeNotify({ title: 'First' }))
    })
    act(() => {
      result.current.push(makeNotify({ title: 'Second' }))
    })

    expect(result.current.items).toHaveLength(2)
    expect(result.current.items[0]?.title).toBe('Second')
    expect(result.current.items[1]?.title).toBe('First')
  })

  it('push() assigns a unique id and timestamp', () => {
    const { result } = renderHook(() => useNotificationsStore())

    act(() => {
      result.current.push(makeNotify())
    })
    act(() => {
      result.current.push(makeNotify())
    })

    const ids = result.current.items.map((n) => n.id)
    expect(new Set(ids).size).toBe(2)
    for (const item of result.current.items) {
      expect(item.timestamp).toBeTruthy()
    }
  })

  it('push() marks new notifications as unread', () => {
    const { result } = renderHook(() => useNotificationsStore())
    act(() => {
      result.current.push(makeNotify())
    })
    expect(result.current.items[0]?.read).toBe(false)
  })

  it('push() caps items at 200 in memory', () => {
    const { result } = renderHook(() => useNotificationsStore())

    act(() => {
      for (let i = 0; i < 210; i++) {
        result.current.push(makeNotify({ title: `n-${i}` }))
      }
    })

    expect(result.current.items).toHaveLength(200)
    // Newest should be n-209
    expect(result.current.items[0]?.title).toBe('n-209')
  })

  it('push() persists up to 50 items to localStorage', () => {
    const { result } = renderHook(() => useNotificationsStore())

    act(() => {
      for (let i = 0; i < 60; i++) {
        result.current.push(makeNotify({ title: `n-${i}` }))
      }
    })

    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed: unknown[] = JSON.parse(raw!)
    expect(parsed).toHaveLength(50)
  })

  it('markRead() flips the read flag for the given id', () => {
    const { result } = renderHook(() => useNotificationsStore())

    act(() => {
      result.current.push(makeNotify({ title: 'Unread' }))
    })

    const id = result.current.items[0]!.id
    expect(result.current.items[0]!.read).toBe(false)

    act(() => {
      result.current.markRead(id)
    })

    expect(result.current.items[0]!.read).toBe(true)
  })

  it('markRead() does not affect other notifications', () => {
    const { result } = renderHook(() => useNotificationsStore())

    act(() => {
      result.current.push(makeNotify({ title: 'A' }))
      result.current.push(makeNotify({ title: 'B' }))
    })

    const firstId = result.current.items[0]!.id
    act(() => {
      result.current.markRead(firstId)
    })

    expect(result.current.items[0]!.read).toBe(true)
    expect(result.current.items[1]!.read).toBe(false)
  })

  it('clear() removes all items from state', () => {
    const { result } = renderHook(() => useNotificationsStore())

    act(() => {
      result.current.push(makeNotify())
      result.current.push(makeNotify())
    })
    expect(result.current.items).toHaveLength(2)

    act(() => {
      result.current.clear()
    })

    expect(result.current.items).toHaveLength(0)
  })

  it('clear() removes the localStorage entry', () => {
    const { result } = renderHook(() => useNotificationsStore())

    act(() => {
      result.current.push(makeNotify())
    })
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()

    act(() => {
      result.current.clear()
    })

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
