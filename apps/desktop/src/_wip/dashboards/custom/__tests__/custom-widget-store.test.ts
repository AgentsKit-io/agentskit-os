/**
 * Tests for custom-widget-store.ts
 *
 * Covers:
 *   - loadCustomWidgets returns empty array when localStorage is empty
 *   - saveCustomWidget persists and loadCustomWidgets retrieves
 *   - saveCustomWidget updates existing widget with same id
 *   - deleteCustomWidget removes the widget by id
 *   - getCustomWidget returns the correct widget
 *   - exportCustomWidgetsJson produces valid JSON
 *   - importCustomWidgetsJson replaces storage with parsed data
 *   - importCustomWidgetsJson returns false for invalid JSON
 *   - makeCustomWidgetId generates unique IDs
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadCustomWidgets,
  saveCustomWidget,
  deleteCustomWidget,
  getCustomWidget,
  exportCustomWidgetsJson,
  importCustomWidgetsJson,
  makeCustomWidgetId,
} from '../custom-widget-store'
import type { CustomWidget } from '../custom-widget-types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeWidget(overrides?: Partial<CustomWidget>): CustomWidget {
  return {
    id: 'test-widget-1',
    title: 'Test Widget',
    kind: 'number',
    source: { method: 'metrics.cost.total', pathExpr: 'total', pollMs: 5000 },
    format: { prefix: '$', precision: 2 },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  // The test-setup.ts global afterEach clears localStorage, but also clear
  // at the start of each test to ensure isolation.
  localStorage.clear()
})

describe('loadCustomWidgets', () => {
  it('returns empty array when localStorage is empty', () => {
    expect(loadCustomWidgets()).toEqual([])
  })

  it('returns empty array for invalid stored JSON', () => {
    localStorage.setItem('agentskitos.custom-widgets', 'not-json')
    expect(loadCustomWidgets()).toEqual([])
  })

  it('returns empty array for stored JSON that fails Zod validation', () => {
    localStorage.setItem('agentskitos.custom-widgets', JSON.stringify([{ id: '' }]))
    expect(loadCustomWidgets()).toEqual([])
  })
})

describe('saveCustomWidget / loadCustomWidgets', () => {
  it('persists a widget and retrieves it', () => {
    const w = makeWidget()
    saveCustomWidget(w)
    const loaded = loadCustomWidgets()
    expect(loaded).toHaveLength(1)
    expect(loaded[0]).toEqual(w)
  })

  it('updates an existing widget with the same id', () => {
    const w = makeWidget()
    saveCustomWidget(w)
    const updated = { ...w, title: 'Updated title' }
    saveCustomWidget(updated)
    const loaded = loadCustomWidgets()
    expect(loaded).toHaveLength(1)
    expect(loaded[0]!.title).toBe('Updated title')
  })

  it('appends a new widget when id differs', () => {
    saveCustomWidget(makeWidget({ id: 'w1' }))
    saveCustomWidget(makeWidget({ id: 'w2', title: 'Widget 2' }))
    expect(loadCustomWidgets()).toHaveLength(2)
  })
})

describe('deleteCustomWidget', () => {
  it('removes the widget with the given id', () => {
    saveCustomWidget(makeWidget({ id: 'w1' }))
    saveCustomWidget(makeWidget({ id: 'w2', title: 'W2' }))
    deleteCustomWidget('w1')
    const loaded = loadCustomWidgets()
    expect(loaded).toHaveLength(1)
    expect(loaded[0]!.id).toBe('w2')
  })

  it('is a no-op for unknown id', () => {
    saveCustomWidget(makeWidget())
    deleteCustomWidget('does-not-exist')
    expect(loadCustomWidgets()).toHaveLength(1)
  })
})

describe('getCustomWidget', () => {
  it('returns the widget for a known id', () => {
    const w = makeWidget()
    saveCustomWidget(w)
    expect(getCustomWidget('test-widget-1')).toEqual(w)
  })

  it('returns undefined for an unknown id', () => {
    expect(getCustomWidget('missing')).toBeUndefined()
  })
})

describe('exportCustomWidgetsJson / importCustomWidgetsJson', () => {
  it('round-trips correctly', () => {
    const w = makeWidget()
    saveCustomWidget(w)
    const json = exportCustomWidgetsJson()
    localStorage.clear()
    const ok = importCustomWidgetsJson(json)
    expect(ok).toBe(true)
    expect(loadCustomWidgets()).toHaveLength(1)
    expect(loadCustomWidgets()[0]).toEqual(w)
  })

  it('returns false for invalid JSON', () => {
    expect(importCustomWidgetsJson('not-json')).toBe(false)
  })

  it('returns false for JSON that fails schema validation', () => {
    expect(importCustomWidgetsJson(JSON.stringify([{ id: '' }]))).toBe(false)
  })
})

describe('makeCustomWidgetId', () => {
  it('generates non-empty strings', () => {
    expect(makeCustomWidgetId().length).toBeGreaterThan(0)
  })

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, makeCustomWidgetId))
    expect(ids.size).toBe(100)
  })
})
