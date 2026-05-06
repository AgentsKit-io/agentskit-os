/**
 * Tests for snapshot-types — Zod schema validation and migration stub.
 */

import { describe, it, expect } from 'vitest'
import { DesktopSnapshotSchema, migrateSnapshot, SNAPSHOT_VERSION } from '../snapshot-types'
import type { DesktopSnapshot } from '../snapshot-types'

const VALID_SNAP: DesktopSnapshot = {
  version: 1,
  createdAt: '2026-05-02T00:00:00.000Z',
  state: { 'agentskit:theme': 'dark' },
}

describe('DesktopSnapshotSchema', () => {
  it('validates a correct snapshot', () => {
    const result = DesktopSnapshotSchema.safeParse(VALID_SNAP)
    expect(result.success).toBe(true)
  })

  it('rejects a snapshot without version', () => {
    const { version: _v, ...noVersion } = VALID_SNAP
    const result = DesktopSnapshotSchema.safeParse(noVersion)
    expect(result.success).toBe(false)
  })

  it('rejects a snapshot without createdAt', () => {
    const { createdAt: _c, ...noCreatedAt } = VALID_SNAP
    const result = DesktopSnapshotSchema.safeParse(noCreatedAt)
    expect(result.success).toBe(false)
  })

  it('rejects a snapshot without state', () => {
    const { state: _s, ...noState } = VALID_SNAP
    const result = DesktopSnapshotSchema.safeParse(noState)
    expect(result.success).toBe(false)
  })

  it('rejects a negative version', () => {
    const result = DesktopSnapshotSchema.safeParse({ ...VALID_SNAP, version: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects a non-integer version', () => {
    const result = DesktopSnapshotSchema.safeParse({ ...VALID_SNAP, version: 1.5 })
    expect(result.success).toBe(false)
  })

  it('allows state with multiple key types', () => {
    const result = DesktopSnapshotSchema.safeParse({
      ...VALID_SNAP,
      state: {
        'agentskit:theme': 'dark',
        'agentskitos.preferences': { density: 'comfortable' },
        'agentskitos.focus-mode': false,
      },
    })
    expect(result.success).toBe(true)
  })

  it('allows an empty state object', () => {
    const result = DesktopSnapshotSchema.safeParse({ ...VALID_SNAP, state: {} })
    expect(result.success).toBe(true)
  })
})

describe('SNAPSHOT_VERSION', () => {
  it('is 1', () => {
    expect(SNAPSHOT_VERSION).toBe(1)
  })
})

describe('migrateSnapshot', () => {
  it('returns the snapshot unchanged when version matches current', () => {
    const result = migrateSnapshot(VALID_SNAP, SNAPSHOT_VERSION)
    expect(result).toEqual(VALID_SNAP)
  })

  it('throws for an unknown version', () => {
    expect(() => migrateSnapshot(VALID_SNAP, 99)).toThrow('Unsupported snapshot version 99')
  })

  it('throws for version 0', () => {
    expect(() => migrateSnapshot(VALID_SNAP, 0)).toThrow()
  })
})
