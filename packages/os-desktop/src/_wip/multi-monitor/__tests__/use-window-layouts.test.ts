/**
 * Tests for useWindowLayouts hook and the pure read/write helpers.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import {
  readLayouts,
  writeLayouts,
  STORAGE_KEY,
  useWindowLayouts,
  type UseWindowLayoutsResult,
} from '../use-window-layouts'
import type { WindowLayout } from '../types'

// ---------------------------------------------------------------------------
// Pure helper tests
// ---------------------------------------------------------------------------

describe('readLayouts / writeLayouts', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns empty object when storage is empty', () => {
    expect(readLayouts()).toEqual({})
  })

  it('round-trips a layout through storage', () => {
    const layout: WindowLayout = { monitorId: '1', x: 100, y: 200, w: 800, h: 600 }
    writeLayouts({ dashboard: layout })
    const result = readLayouts()
    expect(result['dashboard']).toEqual(layout)
  })

  it('returns empty object when stored JSON is malformed', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json')
    expect(readLayouts()).toEqual({})
  })

  it('returns empty object when stored JSON fails schema validation', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dashboard: { invalid: true } }))
    expect(readLayouts()).toEqual({})
  })

  it('can store multiple purposes', () => {
    const d: WindowLayout = { monitorId: '0', x: 0, y: 0, w: 1280, h: 800 }
    const t: WindowLayout = { monitorId: '1', x: 10, y: 20, w: 1024, h: 768 }
    writeLayouts({ dashboard: d, traces: t })
    const result = readLayouts()
    expect(Object.keys(result)).toHaveLength(2)
    expect(result['dashboard']).toEqual(d)
    expect(result['traces']).toEqual(t)
  })
})

// ---------------------------------------------------------------------------
// Hook tests
// ---------------------------------------------------------------------------

function renderHook(): {
  container: HTMLDivElement
  root: ReturnType<typeof createRoot>
  getResult: () => UseWindowLayoutsResult | undefined
} {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  let result: UseWindowLayoutsResult | undefined

  function Probe() {
    result = useWindowLayouts()
    return null
  }

  act(() => {
    root.render(createElement(Probe, null))
  })

  return { container, root, getResult: () => result }
}

describe('useWindowLayouts', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getLayout returns undefined for unknown purpose', () => {
    const { root, container, getResult } = renderHook()
    expect(getResult()?.getLayout('dashboard')).toBeUndefined()
    act(() => { root.unmount() })
    container.remove()
  })

  it('setLayout persists and returns the layout', () => {
    const { root, container, getResult } = renderHook()
    const layout: WindowLayout = { monitorId: '0', x: 10, y: 20, w: 900, h: 700 }

    act(() => {
      getResult()?.setLayout('dashboard', layout)
    })

    expect(getResult()?.getLayout('dashboard')).toEqual(layout)
    // Also check that it was written to localStorage
    expect(readLayouts()['dashboard']).toEqual(layout)

    act(() => { root.unmount() })
    container.remove()
  })

  it('clearLayout removes the layout', () => {
    const layout: WindowLayout = { monitorId: '0', x: 0, y: 0, w: 800, h: 600 }
    writeLayouts({ traces: layout })

    const { root, container, getResult } = renderHook()

    expect(getResult()?.getLayout('traces')).toEqual(layout)

    act(() => {
      getResult()?.clearLayout('traces')
    })

    expect(getResult()?.getLayout('traces')).toBeUndefined()

    act(() => { root.unmount() })
    container.remove()
  })

  it('hydrates from localStorage on mount', () => {
    const layout: WindowLayout = { monitorId: '2', x: 50, y: 60, w: 1024, h: 768 }
    writeLayouts({ dashboard: layout })

    const { root, container, getResult } = renderHook()
    expect(getResult()?.getLayout('dashboard')).toEqual(layout)

    act(() => { root.unmount() })
    container.remove()
  })
})
