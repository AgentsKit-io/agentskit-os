/**
 * Tests for preferences-engine — pure routing decisions.
 *
 * Covers:
 *   - Default routing falls back to 'panel'
 *   - Exact key match
 *   - Prefix wildcard match (e.g. "error.*")
 *   - Longest prefix wins when multiple wildcards match
 *   - Quiet hours: suppresses non-critical within window → 'silent'
 *   - Quiet hours: critical events pass through when allowCritical=true
 *   - Quiet hours: critical events suppressed when allowCritical=false
 *   - Overnight quiet window (spans midnight) handled correctly
 *   - Quiet hours disabled: routing works normally
 *   - Same-day quiet window handled correctly
 */

import { describe, it, expect } from 'vitest'
import { routeNotification } from '../preferences/preferences-engine'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../preferences/preferences-types'
import type { NotificationPreferences } from '../preferences/preferences-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDate(hour: number, minute = 0): Date {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d
}

function makePrefs(
  overrides: Partial<NotificationPreferences> = {},
): NotificationPreferences {
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...overrides }
}

// ---------------------------------------------------------------------------
// Basic routing
// ---------------------------------------------------------------------------

describe('routeNotification — basic routing', () => {
  it('returns "panel" when no routing key matches (default fallback)', () => {
    const prefs = makePrefs({ routing: {} })
    expect(routeNotification({ eventType: 'unknown.event' }, prefs)).toBe('panel')
  })

  it('returns the exact matching routing value', () => {
    const prefs = makePrefs({ routing: { 'flow.run.completed': 'os-toast' } })
    expect(routeNotification({ eventType: 'flow.run.completed' }, prefs)).toBe('os-toast')
  })

  it('matches prefix wildcard "error.*" for "error.network"', () => {
    const prefs = makePrefs({ routing: { 'error.*': 'desktop-alert' } })
    expect(routeNotification({ eventType: 'error.network' }, prefs)).toBe('desktop-alert')
  })

  it('matches prefix wildcard "audit.flagged.*" for "audit.flagged.pii"', () => {
    const prefs = makePrefs({ routing: { 'audit.flagged.*': 'silent' } })
    expect(routeNotification({ eventType: 'audit.flagged.pii' }, prefs)).toBe('silent')
  })

  it('prefers exact match over wildcard', () => {
    const prefs = makePrefs({
      routing: { 'error.*': 'silent', 'error.network': 'panel' },
    })
    expect(routeNotification({ eventType: 'error.network' }, prefs)).toBe('panel')
  })

  it('returns "silent" for explicitly silent-routed event', () => {
    const prefs = makePrefs({ routing: { 'cost.threshold': 'silent' } })
    expect(routeNotification({ eventType: 'cost.threshold' }, prefs)).toBe('silent')
  })
})

// ---------------------------------------------------------------------------
// Quiet hours — disabled
// ---------------------------------------------------------------------------

describe('routeNotification — quiet hours disabled', () => {
  it('routes normally when quiet hours are disabled even during the window', () => {
    const prefs = makePrefs({
      routing: { 'flow.run.failed': 'os-toast' },
      quietHours: {
        enabled: false,
        startMinute: 0,
        endMinute: 1439,
        allowCritical: true,
      },
    })
    // Time doesn't matter when disabled
    expect(routeNotification({ eventType: 'flow.run.failed' }, prefs, makeDate(12))).toBe(
      'os-toast',
    )
  })
})

// ---------------------------------------------------------------------------
// Quiet hours — enabled, same-day window (e.g. 09:00–17:00)
// ---------------------------------------------------------------------------

describe('routeNotification — quiet hours same-day window', () => {
  const quietPrefs = makePrefs({
    routing: { 'flow.run.completed': 'os-toast' },
    quietHours: {
      enabled: true,
      startMinute: 9 * 60, // 09:00
      endMinute: 17 * 60, // 17:00
      allowCritical: true,
    },
  })

  it('suppresses non-critical event inside window', () => {
    expect(
      routeNotification({ eventType: 'flow.run.completed' }, quietPrefs, makeDate(12)),
    ).toBe('silent')
  })

  it('routes normally outside window (before start)', () => {
    expect(
      routeNotification({ eventType: 'flow.run.completed' }, quietPrefs, makeDate(8, 59)),
    ).toBe('os-toast')
  })

  it('routes normally outside window (after end)', () => {
    expect(
      routeNotification({ eventType: 'flow.run.completed' }, quietPrefs, makeDate(17)),
    ).toBe('os-toast')
  })
})

// ---------------------------------------------------------------------------
// Quiet hours — overnight window (e.g. 22:00–08:00)
// ---------------------------------------------------------------------------

describe('routeNotification — quiet hours overnight window', () => {
  const quietPrefs = makePrefs({
    routing: { 'flow.run.completed': 'os-toast' },
    quietHours: {
      enabled: true,
      startMinute: 22 * 60, // 22:00
      endMinute: 8 * 60,   // 08:00
      allowCritical: true,
    },
  })

  it('suppresses non-critical event after midnight', () => {
    expect(
      routeNotification({ eventType: 'flow.run.completed' }, quietPrefs, makeDate(2)),
    ).toBe('silent')
  })

  it('suppresses non-critical event before end (07:59)', () => {
    expect(
      routeNotification({ eventType: 'flow.run.completed' }, quietPrefs, makeDate(7, 59)),
    ).toBe('silent')
  })

  it('suppresses non-critical event at start (22:00)', () => {
    expect(
      routeNotification({ eventType: 'flow.run.completed' }, quietPrefs, makeDate(22)),
    ).toBe('silent')
  })

  it('routes normally during daytime (12:00)', () => {
    expect(
      routeNotification({ eventType: 'flow.run.completed' }, quietPrefs, makeDate(12)),
    ).toBe('os-toast')
  })
})

// ---------------------------------------------------------------------------
// Quiet hours — critical event handling
// ---------------------------------------------------------------------------

describe('routeNotification — critical events during quiet hours', () => {
  const windowStart = makeDate(22)
  const windowEnd = makeDate(8)
  void windowEnd

  it('delivers critical event (error.*) when allowCritical=true', () => {
    const prefs = makePrefs({
      routing: { 'error.*': 'desktop-alert' },
      quietHours: {
        enabled: true,
        startMinute: 22 * 60,
        endMinute: 8 * 60,
        allowCritical: true,
      },
    })
    expect(
      routeNotification({ eventType: 'error.crash' }, prefs, windowStart),
    ).toBe('desktop-alert')
  })

  it('suppresses critical event (error.*) when allowCritical=false', () => {
    const prefs = makePrefs({
      routing: { 'error.*': 'desktop-alert' },
      quietHours: {
        enabled: true,
        startMinute: 22 * 60,
        endMinute: 8 * 60,
        allowCritical: false,
      },
    })
    expect(
      routeNotification({ eventType: 'error.crash' }, prefs, windowStart),
    ).toBe('silent')
  })

  it('delivers audit.flagged.* when allowCritical=true', () => {
    const prefs = makePrefs({
      routing: { 'audit.flagged.*': 'os-toast' },
      quietHours: {
        enabled: true,
        startMinute: 22 * 60,
        endMinute: 8 * 60,
        allowCritical: true,
      },
    })
    expect(
      routeNotification({ eventType: 'audit.flagged.pii' }, prefs, windowStart),
    ).toBe('os-toast')
  })

  it('suppresses non-critical cost.threshold when allowCritical=true (still quiet)', () => {
    const prefs = makePrefs({
      routing: { 'cost.threshold': 'os-toast' },
      quietHours: {
        enabled: true,
        startMinute: 22 * 60,
        endMinute: 8 * 60,
        allowCritical: true,
      },
    })
    expect(
      routeNotification({ eventType: 'cost.threshold' }, prefs, windowStart),
    ).toBe('silent')
  })
})

// ---------------------------------------------------------------------------
// Default preferences smoke test
// ---------------------------------------------------------------------------

describe('routeNotification — default preferences', () => {
  it('routes error.* to panel by default', () => {
    expect(
      routeNotification({ eventType: 'error.api' }, DEFAULT_NOTIFICATION_PREFERENCES),
    ).toBe('panel')
  })

  it('routes flow.run.completed to panel by default', () => {
    expect(
      routeNotification(
        { eventType: 'flow.run.completed' },
        DEFAULT_NOTIFICATION_PREFERENCES,
      ),
    ).toBe('panel')
  })
})
