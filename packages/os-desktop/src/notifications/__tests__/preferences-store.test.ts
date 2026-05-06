/**
 * Tests for preferences-store — localStorage persistence.
 *
 * Covers:
 *   - loadNotificationPreferences returns defaults when localStorage is empty
 *   - saveNotificationPreferences persists to localStorage
 *   - loadNotificationPreferences reads saved data back
 *   - loadNotificationPreferences falls back to defaults on corrupt data
 *   - clearNotificationPreferences removes the key
 *   - Saved data is merged with defaults (new known keys get default routing)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  clearNotificationPreferences,
} from '../preferences/preferences-store'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../preferences/preferences-types'

const STORAGE_KEY = 'agentskitos.notifications.prefs'

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

const store: Record<string, string> = {}

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key]
  }),
  clear: vi.fn(() => {
    Object.keys(store).forEach((k) => delete store[k])
  }),
  length: 0,
  key: vi.fn(),
}

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('loadNotificationPreferences', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  it('returns defaults when localStorage is empty', () => {
    const prefs = loadNotificationPreferences()
    expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFERENCES)
  })

  it('reads back saved preferences correctly', () => {
    const custom = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      quietHours: {
        enabled: true,
        startMinute: 22 * 60,
        endMinute: 8 * 60,
        allowCritical: false,
      },
    }
    store[STORAGE_KEY] = JSON.stringify(custom)
    const prefs = loadNotificationPreferences()
    expect(prefs.quietHours.enabled).toBe(true)
    expect(prefs.quietHours.startMinute).toBe(22 * 60)
    expect(prefs.quietHours.allowCritical).toBe(false)
  })

  it('falls back to defaults on corrupt JSON', () => {
    store[STORAGE_KEY] = '{ not valid json ~~'
    const prefs = loadNotificationPreferences()
    expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFERENCES)
  })

  it('falls back to defaults on invalid schema', () => {
    store[STORAGE_KEY] = JSON.stringify({ routing: 'bad', quietHours: null })
    const prefs = loadNotificationPreferences()
    expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFERENCES)
  })

  it('merges saved routing with defaults (new keys get default routing)', () => {
    // Save only a partial routing map
    store[STORAGE_KEY] = JSON.stringify({
      routing: { 'error.*': 'silent' },
      quietHours: { enabled: false, startMinute: 1320, endMinute: 480, allowCritical: true },
    })
    const prefs = loadNotificationPreferences()
    // Custom override preserved
    expect(prefs.routing['error.*']).toBe('silent')
    // Other known keys get the default ('panel')
    expect(prefs.routing['flow.run.completed']).toBe('panel')
  })
})

describe('saveNotificationPreferences', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  it('saves prefs to localStorage', () => {
    saveNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES),
    )
  })
})

describe('clearNotificationPreferences', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  it('removes the key from localStorage', () => {
    store[STORAGE_KEY] = JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES)
    clearNotificationPreferences()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
    expect(store[STORAGE_KEY]).toBeUndefined()
  })
})
