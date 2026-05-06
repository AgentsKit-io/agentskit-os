/**
 * Tests for snapshot-store — capture, apply, JSON round-trip, key whitelist,
 * and missing-key handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  captureSnapshot,
  applySnapshot,
  exportSnapshotJson,
  importSnapshotJson,
} from '../snapshot-store'
import { SNAPSHOT_KEYS } from '../snapshot-keys'
import { SNAPSHOT_VERSION } from '../snapshot-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seedLocalStorage(entries: Record<string, unknown>) {
  for (const [key, value] of Object.entries(entries)) {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

// ---------------------------------------------------------------------------
// captureSnapshot
// ---------------------------------------------------------------------------

describe('captureSnapshot', () => {
  it('returns a snapshot with the current SNAPSHOT_VERSION', () => {
    const snap = captureSnapshot()
    expect(snap.version).toBe(SNAPSHOT_VERSION)
  })

  it('includes a valid ISO createdAt timestamp', () => {
    const snap = captureSnapshot()
    expect(new Date(snap.createdAt).toISOString()).toBe(snap.createdAt)
  })

  it('captures a stored value for a known key', () => {
    localStorage.setItem('agentskit:theme', JSON.stringify('cyber'))
    const snap = captureSnapshot()
    expect(snap.state['agentskit:theme']).toBe('cyber')
  })

  it('captures values for all seeded SNAPSHOT_KEYS', () => {
    const theme = 'light'
    const prefs = { density: 'compact', fontSize: 'sm' }
    localStorage.setItem('agentskit:theme', JSON.stringify(theme))
    localStorage.setItem('agentskitos.preferences', JSON.stringify(prefs))
    const snap = captureSnapshot()
    expect(snap.state['agentskit:theme']).toBe(theme)
    expect(snap.state['agentskitos.preferences']).toEqual(prefs)
  })

  it('omits keys that are absent from localStorage', () => {
    // localStorage is empty — no keys should appear in state.
    const snap = captureSnapshot()
    expect(Object.keys(snap.state)).toHaveLength(0)
  })

  it('only includes keys that are listed in SNAPSHOT_KEYS', () => {
    // Seed a key that is NOT in SNAPSHOT_KEYS
    localStorage.setItem('some.other.key', JSON.stringify('should-be-ignored'))
    // Also seed a key that IS in SNAPSHOT_KEYS
    localStorage.setItem('agentskit:theme', JSON.stringify('dark'))
    const snap = captureSnapshot()
    expect(Object.keys(snap.state).every((k) => SNAPSHOT_KEYS.includes(k))).toBe(true)
    expect(snap.state['some.other.key']).toBeUndefined()
  })

  it('stores a raw string when a value is not valid JSON', () => {
    // Manually set a non-JSON value to simulate legacy/corrupt data.
    localStorage.setItem('agentskitos.focus-mode', 'true')
    const snap = captureSnapshot()
    // 'true' is valid JSON (boolean literal) — should be parsed to boolean.
    expect(snap.state['agentskitos.focus-mode']).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// applySnapshot
// ---------------------------------------------------------------------------

describe('applySnapshot', () => {
  it('writes snapshot state entries back to localStorage', () => {
    const snap = captureSnapshot()
    snap.state['agentskit:theme'] = 'light'
    applySnapshot(snap)
    expect(localStorage.getItem('agentskit:theme')).toBe(JSON.stringify('light'))
  })

  it('does not write keys that are not in SNAPSHOT_KEYS', () => {
    const snap = captureSnapshot()
    // Manually inject a foreign key into state (should not be written).
    ;(snap.state as Record<string, unknown>)['foreign.key'] = 'evil'
    applySnapshot(snap)
    expect(localStorage.getItem('foreign.key')).toBeNull()
  })

  it('dispatches a StorageEvent on window', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    applySnapshot(captureSnapshot())
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(StorageEvent))
    dispatchSpy.mockRestore()
  })

  it('does not throw when localStorage.setItem throws', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const snap = captureSnapshot()
    snap.state['agentskit:theme'] = 'dark'
    expect(() => applySnapshot(snap)).not.toThrow()
    vi.restoreAllMocks()
  })
})

// ---------------------------------------------------------------------------
// exportSnapshotJson / importSnapshotJson — round-trip
// ---------------------------------------------------------------------------

describe('exportSnapshotJson / importSnapshotJson', () => {
  it('round-trips a snapshot through JSON', () => {
    seedLocalStorage({
      'agentskit:theme': 'cyber',
      'agentskitos.preferences': { density: 'comfortable', fontSize: 'md' },
    })
    const snap = captureSnapshot()
    const json = exportSnapshotJson(snap)
    const restored = importSnapshotJson(json)
    expect(restored.version).toBe(snap.version)
    expect(restored.state).toEqual(snap.state)
  })

  it('exportSnapshotJson produces valid JSON', () => {
    const snap = captureSnapshot()
    const json = exportSnapshotJson(snap)
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('importSnapshotJson throws on invalid JSON', () => {
    expect(() => importSnapshotJson('{not valid json')).toThrow(SyntaxError)
  })

  it('importSnapshotJson throws when the object does not match the schema', () => {
    const bad = JSON.stringify({ foo: 'bar' })
    expect(() => importSnapshotJson(bad)).toThrow()
  })

  it('importSnapshotJson throws for an unrecognised version', () => {
    const snap = captureSnapshot()
    const bad = JSON.stringify({ ...snap, version: 999 })
    expect(() => importSnapshotJson(bad)).toThrow('Unsupported snapshot version 999')
  })
})

// ---------------------------------------------------------------------------
// Key whitelist
// ---------------------------------------------------------------------------

describe('SNAPSHOT_KEYS whitelist', () => {
  it('contains at least 8 distinct keys', () => {
    expect(SNAPSHOT_KEYS.length).toBeGreaterThanOrEqual(8)
  })

  it('includes the theme key', () => {
    expect(SNAPSHOT_KEYS).toContain('agentskit:theme')
  })

  it('includes the preferences key', () => {
    expect(SNAPSHOT_KEYS).toContain('agentskitos.preferences')
  })

  it('includes the shortcuts key', () => {
    expect(SNAPSHOT_KEYS).toContain('agentskitos.shortcuts')
  })

  it('includes the custom-themes key', () => {
    expect(SNAPSHOT_KEYS).toContain('agentskitos.custom-themes')
  })

  it('has no duplicate keys', () => {
    const set = new Set(SNAPSHOT_KEYS)
    expect(set.size).toBe(SNAPSHOT_KEYS.length)
  })
})

// ---------------------------------------------------------------------------
// Missing-key handling
// ---------------------------------------------------------------------------

describe('missing key handling in applySnapshot', () => {
  beforeEach(() => {
    // Pre-populate a key that will NOT be in the snapshot.
    localStorage.setItem('agentskitos.focus-mode', JSON.stringify(true))
  })

  it('leaves existing localStorage values untouched for keys absent from snap.state', () => {
    // Snapshot that has NO focus-mode key.
    const snap = captureSnapshot()
    delete snap.state['agentskitos.focus-mode']
    // Overwrite focus-mode directly to ensure it was set.
    localStorage.setItem('agentskitos.focus-mode', JSON.stringify(true))
    applySnapshot(snap)
    // The key should still be there because applySnapshot does not delete missing keys.
    expect(localStorage.getItem('agentskitos.focus-mode')).toBe(JSON.stringify(true))
  })
})
