/**
 * Unit tests for useDashboardsStore.
 *
 * Covers:
 *   - Initial hydration (default set when localStorage empty)
 *   - Hydration from localStorage with valid JSON
 *   - Falls back to default on invalid JSON
 *   - createDashboard() adds a new dashboard and activates it
 *   - switchDashboard() changes activeId
 *   - renameDashboard() updates the name
 *   - removeDashboard() removes the dashboard; refuses to leave 0
 *   - addWidget() / removeWidget() / updateLayout()
 *   - exportJson() / importJson()
 *   - reset() restores default set
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useDashboardsStore, buildDefaultSet, makeWidgetId } from '../use-dashboards-store'

const STORAGE_KEY = 'agentskitos.dashboards'

describe('useDashboardsStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with the default dashboard set when localStorage is empty', () => {
    const { result } = renderHook(() => useDashboardsStore())
    expect(result.current.set.dashboards).toHaveLength(1)
    expect(result.current.set.dashboards[0]?.id).toBe('agentskitos.default')
    expect(result.current.set.dashboards[0]?.widgets.length).toBeGreaterThan(0)
  })

  it('hydrates from localStorage on mount', () => {
    const custom = buildDefaultSet()
    custom.dashboards[0]!.name = 'Hydrated'
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))

    const { result } = renderHook(() => useDashboardsStore())
    expect(result.current.set.dashboards[0]?.name).toBe('Hydrated')
  })

  it('falls back to default when localStorage contains invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{')
    const { result } = renderHook(() => useDashboardsStore())
    expect(result.current.set.dashboards[0]?.id).toBe('agentskitos.default')
  })

  it('falls back to default when localStorage has wrong schema', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ wrong: true }))
    const { result } = renderHook(() => useDashboardsStore())
    expect(result.current.set.dashboards[0]?.id).toBe('agentskitos.default')
  })

  it('createDashboard() adds a new dashboard and activates it', () => {
    const { result } = renderHook(() => useDashboardsStore())

    let newId = ''
    act(() => {
      newId = result.current.createDashboard('Analytics')
    })

    expect(result.current.set.dashboards).toHaveLength(2)
    expect(result.current.set.activeId).toBe(newId)
    const newDashboard = result.current.set.dashboards.find((d) => d.id === newId)
    expect(newDashboard?.name).toBe('Analytics')
    expect(newDashboard?.widgets).toHaveLength(0)
  })

  it('switchDashboard() changes activeId', () => {
    const { result } = renderHook(() => useDashboardsStore())

    let id2 = ''
    act(() => {
      id2 = result.current.createDashboard('Second')
    })
    // After creation the new one is active, switch back to default
    act(() => {
      result.current.switchDashboard('agentskitos.default')
    })
    expect(result.current.set.activeId).toBe('agentskitos.default')

    act(() => {
      result.current.switchDashboard(id2)
    })
    expect(result.current.set.activeId).toBe(id2)
  })

  it('switchDashboard() is a noop for unknown id', () => {
    const { result } = renderHook(() => useDashboardsStore())
    act(() => {
      result.current.switchDashboard('does-not-exist')
    })
    expect(result.current.set.activeId).toBe('agentskitos.default')
  })

  it('renameDashboard() updates the name', () => {
    const { result } = renderHook(() => useDashboardsStore())
    act(() => {
      result.current.renameDashboard('agentskitos.default', 'Renamed')
    })
    expect(result.current.set.dashboards[0]?.name).toBe('Renamed')
  })

  it('removeDashboard() removes a dashboard', () => {
    const { result } = renderHook(() => useDashboardsStore())

    let id2 = ''
    act(() => {
      id2 = result.current.createDashboard('Deletable')
    })
    expect(result.current.set.dashboards).toHaveLength(2)

    act(() => {
      result.current.removeDashboard(id2)
    })
    expect(result.current.set.dashboards).toHaveLength(1)
    expect(result.current.set.dashboards[0]?.id).toBe('agentskitos.default')
  })

  it('removeDashboard() does not remove the last dashboard', () => {
    const { result } = renderHook(() => useDashboardsStore())
    act(() => {
      result.current.removeDashboard('agentskitos.default')
    })
    expect(result.current.set.dashboards).toHaveLength(1)
  })

  it('removeDashboard() switches activeId when the active dashboard is removed', () => {
    const { result } = renderHook(() => useDashboardsStore())

    let id2 = ''
    act(() => {
      id2 = result.current.createDashboard('Second')
    })
    // id2 is active; remove default first by switching to it then creating another
    act(() => {
      result.current.removeDashboard(id2)
    })
    // active should now be the default
    expect(result.current.set.activeId).toBe('agentskitos.default')
  })

  it('addWidget() appends a widget to the target dashboard', () => {
    const { result } = renderHook(() => useDashboardsStore())
    const widget = {
      id: makeWidgetId(),
      kind: 'cost-chart',
      x: 0,
      y: 0,
      w: 6,
      h: 3,
    }
    const initialLen = result.current.set.dashboards[0]!.widgets.length

    act(() => {
      result.current.addWidget('agentskitos.default', widget)
    })

    expect(result.current.set.dashboards[0]!.widgets).toHaveLength(initialLen + 1)
    expect(result.current.set.dashboards[0]!.widgets.at(-1)?.kind).toBe('cost-chart')
  })

  it('removeWidget() removes the specified widget', () => {
    const { result } = renderHook(() => useDashboardsStore())
    const id = makeWidgetId()
    act(() => {
      result.current.addWidget('agentskitos.default', {
        id,
        kind: 'cost-chart',
        x: 0,
        y: 0,
        w: 6,
        h: 3,
      })
    })
    const before = result.current.set.dashboards[0]!.widgets.length
    act(() => {
      result.current.removeWidget('agentskitos.default', id)
    })
    expect(result.current.set.dashboards[0]!.widgets).toHaveLength(before - 1)
    expect(result.current.set.dashboards[0]!.widgets.find((w) => w.id === id)).toBeUndefined()
  })

  it('updateLayout() replaces the widget array for a dashboard', () => {
    const { result } = renderHook(() => useDashboardsStore())
    const newWidgets = [
      { id: makeWidgetId(), kind: 'stats-summary', x: 0, y: 0, w: 12, h: 2 },
    ]
    act(() => {
      result.current.updateLayout('agentskitos.default', newWidgets)
    })
    expect(result.current.set.dashboards[0]!.widgets).toHaveLength(1)
    expect(result.current.set.dashboards[0]!.widgets[0]?.kind).toBe('stats-summary')
  })

  it('exportJson() returns a parseable JSON string', () => {
    const { result } = renderHook(() => useDashboardsStore())
    const json = result.current.exportJson()
    expect(() => JSON.parse(json)).not.toThrow()
    const parsed = JSON.parse(json) as { dashboards: unknown[] }
    expect(Array.isArray(parsed.dashboards)).toBe(true)
  })

  it('importJson() imports a valid set', () => {
    const { result } = renderHook(() => useDashboardsStore())

    let id2 = ''
    act(() => {
      id2 = result.current.createDashboard('Imported')
    })
    const json = result.current.exportJson()

    // Reset and then import
    act(() => {
      result.current.reset()
    })
    expect(result.current.set.dashboards).toHaveLength(1)

    let success = false
    act(() => {
      success = result.current.importJson(json)
    })

    expect(success).toBe(true)
    expect(result.current.set.dashboards).toHaveLength(2)
    expect(result.current.set.dashboards.find((d) => d.id === id2)?.name).toBe('Imported')
  })

  it('importJson() returns false for invalid JSON', () => {
    const { result } = renderHook(() => useDashboardsStore())
    let success = true
    act(() => {
      success = result.current.importJson('not-json{{')
    })
    expect(success).toBe(false)
  })

  it('importJson() returns false for JSON not matching the schema', () => {
    const { result } = renderHook(() => useDashboardsStore())
    let success = true
    act(() => {
      success = result.current.importJson(JSON.stringify({ wrong: true }))
    })
    expect(success).toBe(false)
  })

  it('reset() restores the default set', () => {
    const { result } = renderHook(() => useDashboardsStore())
    act(() => {
      result.current.createDashboard('Extra')
    })
    expect(result.current.set.dashboards).toHaveLength(2)

    act(() => {
      result.current.reset()
    })
    expect(result.current.set.dashboards).toHaveLength(1)
    expect(result.current.set.dashboards[0]?.id).toBe('agentskitos.default')
  })

  it('persists state to localStorage on mutation', () => {
    const { result } = renderHook(() => useDashboardsStore())
    act(() => {
      result.current.createDashboard('Persisted')
    })
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!) as { dashboards: Array<{ name: string }> }
    expect(parsed.dashboards.some((d) => d.name === 'Persisted')).toBe(true)
  })
})
