import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readSplitView, writeSplitView } from '../split-view-store'

describe('split-view-store', () => {
  const STORAGE_KEY = 'agentskit:split-view'

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY)
  })

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY)
    vi.restoreAllMocks()
  })

  it('returns the default state when nothing is stored', () => {
    expect(readSplitView()).toEqual({ open: false, secondary: 'traces' })
  })

  it('persists and retrieves the split state', () => {
    writeSplitView({ open: true, secondary: 'runs' })
    expect(readSplitView()).toEqual({ open: true, secondary: 'runs' })
  })

  it('falls back to defaults when stored secondary is invalid', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ open: true, secondary: 'not-a-screen' }))
    expect(readSplitView()).toEqual({ open: true, secondary: 'traces' })
  })

  it('falls back to defaults when stored JSON is malformed', () => {
    localStorage.setItem(STORAGE_KEY, '{ not valid json')
    expect(readSplitView()).toEqual({ open: false, secondary: 'traces' })
  })

  it('returns defaults when localStorage.getItem throws', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(readSplitView()).toEqual({ open: false, secondary: 'traces' })
  })

  it('does not throw when localStorage.setItem throws', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => writeSplitView({ open: true, secondary: 'flows' })).not.toThrow()
  })

  it('coerces a missing open flag to false', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ secondary: 'agents' }))
    expect(readSplitView()).toEqual({ open: false, secondary: 'agents' })
  })
})
