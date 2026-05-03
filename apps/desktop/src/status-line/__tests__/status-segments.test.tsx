/**
 * Unit tests for the built-in status segments registry.
 *
 * Covers:
 *   - BUILT_IN_SEGMENTS contains all 8 segments
 *   - Each segment has a unique, non-empty id and label
 *   - Each render() returns a non-null/undefined value for a baseline context
 *   - getSegmentById returns the correct segment
 *   - getSegmentById returns undefined for unknown ids
 *   - DEFAULT_VISIBLE_IDS matches BUILT_IN_SEGMENTS map
 *   - Specific render outputs for a known context
 */

import { describe, it, expect } from 'vitest'
import {
  BUILT_IN_SEGMENTS,
  DEFAULT_VISIBLE_IDS,
  getSegmentById,
} from '../status-segments'
import type { StatusContext } from '../types'

function makeCtx(overrides: Partial<StatusContext> = {}): StatusContext {
  return {
    workspaceName: 'Default',
    runMode: 'real',
    sidecarStatus: 'connected',
    activeRuns: 0,
    cost24h: 0,
    unreadNotifications: 0,
    theme: 'dark',
    now: new Date('2024-01-15T14:30:00'),
    ...overrides,
  }
}

describe('BUILT_IN_SEGMENTS', () => {
  it('contains exactly 8 segments', () => {
    expect(BUILT_IN_SEGMENTS).toHaveLength(8)
  })

  it('all segments have unique non-empty ids', () => {
    const ids = BUILT_IN_SEGMENTS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id.length).toBeGreaterThan(0)
  })

  it('all segments have non-empty labels', () => {
    for (const seg of BUILT_IN_SEGMENTS) {
      expect(seg.label.length).toBeGreaterThan(0)
    }
  })

  it('all render() return a non-null/undefined value for a baseline context', () => {
    const ctx = makeCtx()
    for (const seg of BUILT_IN_SEGMENTS) {
      const rendered = seg.render(ctx)
      expect(rendered).not.toBeNull()
      expect(rendered).not.toBeUndefined()
    }
  })
})

describe('DEFAULT_VISIBLE_IDS', () => {
  it('matches BUILT_IN_SEGMENTS ids in the same order', () => {
    expect(DEFAULT_VISIBLE_IDS).toEqual(BUILT_IN_SEGMENTS.map((s) => s.id))
  })
})

describe('getSegmentById', () => {
  it('returns the correct segment for a known id', () => {
    const seg = getSegmentById('workspace')
    expect(seg).toBeDefined()
    expect(seg?.id).toBe('workspace')
  })

  it('returns undefined for an unknown id', () => {
    expect(getSegmentById('not-a-real-segment')).toBeUndefined()
  })
})

describe('segment render outputs', () => {
  it('workspace renders workspace name', () => {
    const ctx = makeCtx({ workspaceName: 'My Workspace' })
    expect(getSegmentById('workspace')?.render(ctx)).toBe('My Workspace')
  })

  it('workspace renders dash when workspaceName is null', () => {
    const ctx = makeCtx({ workspaceName: null })
    expect(getSegmentById('workspace')?.render(ctx)).toBe('—')
  })

  it('run-mode renders human-readable label', () => {
    expect(getSegmentById('run-mode')?.render(makeCtx({ runMode: 'dry_run' }))).toBe(
      'Dry run',
    )
    expect(getSegmentById('run-mode')?.render(makeCtx({ runMode: 'sandbox' }))).toBe(
      'Sandbox',
    )
  })

  it('sidecar-status renders connected indicator', () => {
    const out = String(
      getSegmentById('sidecar-status')?.render(makeCtx({ sidecarStatus: 'connected' })),
    )
    expect(out).toContain('Connected')
  })

  it('sidecar-status renders disconnected indicator', () => {
    const out = String(
      getSegmentById('sidecar-status')?.render(
        makeCtx({ sidecarStatus: 'disconnected' }),
      ),
    )
    expect(out).toContain('Offline')
  })

  it('active-runs renders "No active runs" when zero', () => {
    expect(
      getSegmentById('active-runs')?.render(makeCtx({ activeRuns: 0 })),
    ).toBe('No active runs')
  })

  it('active-runs renders singular for 1', () => {
    expect(
      getSegmentById('active-runs')?.render(makeCtx({ activeRuns: 1 })),
    ).toBe('1 run active')
  })

  it('active-runs renders plural for >1', () => {
    expect(
      getSegmentById('active-runs')?.render(makeCtx({ activeRuns: 3 })),
    ).toBe('3 runs active')
  })

  it('cost-24h renders formatted cost', () => {
    const out = String(getSegmentById('cost-24h')?.render(makeCtx({ cost24h: 1.5 })))
    expect(out).toContain('$1.50')
  })

  it('notifications renders "No notifications" when zero', () => {
    expect(
      getSegmentById('notifications')?.render(makeCtx({ unreadNotifications: 0 })),
    ).toBe('No notifications')
  })

  it('notifications renders count when > 0', () => {
    expect(
      getSegmentById('notifications')?.render(makeCtx({ unreadNotifications: 5 })),
    ).toBe('5 notifications')
  })

  it('theme renders theme name', () => {
    expect(getSegmentById('theme')?.render(makeCtx({ theme: 'cyber' }))).toBe('cyber')
  })

  it('time renders HH:MM', () => {
    const ctx = makeCtx({ now: new Date('2024-01-15T14:30:00') })
    expect(getSegmentById('time')?.render(ctx)).toBe('14:30')
  })

  it('time pads single-digit hours and minutes', () => {
    const ctx = makeCtx({ now: new Date('2024-01-15T09:05:00') })
    expect(getSegmentById('time')?.render(ctx)).toBe('09:05')
  })
})
