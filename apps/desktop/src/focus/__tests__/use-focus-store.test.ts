import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getFocusMode, setFocusMode } from '../use-focus-store'

describe('use-focus-store', () => {
  const STORAGE_KEY = 'agentskitos.focus-mode'

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY)
  })

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY)
    vi.restoreAllMocks()
  })

  it('returns false as the default when nothing is stored', () => {
    expect(getFocusMode()).toBe(false)
  })

  it('persists and retrieves true', () => {
    setFocusMode(true)
    expect(getFocusMode()).toBe(true)
  })

  it('persists and retrieves false', () => {
    setFocusMode(true)
    setFocusMode(false)
    expect(getFocusMode()).toBe(false)
  })

  it('returns false when an invalid value is stored', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid')
    expect(getFocusMode()).toBe(false)
  })

  it('returns false when localStorage.getItem throws', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(getFocusMode()).toBe(false)
  })

  it('does not throw when localStorage.setItem throws', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => setFocusMode(true)).not.toThrow()
  })

  it('updates the stored value on subsequent setFocusMode calls', () => {
    setFocusMode(false)
    expect(getFocusMode()).toBe(false)
    setFocusMode(true)
    expect(getFocusMode()).toBe(true)
    setFocusMode(false)
    expect(getFocusMode()).toBe(false)
  })
})
