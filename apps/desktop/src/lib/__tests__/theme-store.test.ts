import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getTheme, setTheme } from '../theme-store'

describe('theme-store', () => {
  const STORAGE_KEY = 'agentskit:theme'

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY)
  })

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY)
    vi.restoreAllMocks()
  })

  it('returns "dark" as the default when nothing is stored', () => {
    expect(getTheme()).toBe('dark')
  })

  it('persists and retrieves the selected theme', () => {
    setTheme('light')
    expect(getTheme()).toBe('light')
  })

  it('persists and retrieves the cyber theme', () => {
    setTheme('cyber')
    expect(getTheme()).toBe('cyber')
  })

  it('persists and retrieves the system theme', () => {
    setTheme('system')
    expect(getTheme()).toBe('system')
  })

  it('returns "dark" when an invalid value is stored', () => {
    localStorage.setItem(STORAGE_KEY, 'totally-invalid-theme')
    expect(getTheme()).toBe('dark')
  })

  it('returns "dark" when localStorage.getItem throws', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(getTheme()).toBe('dark')
  })

  it('does not throw when localStorage.setItem throws', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => setTheme('light')).not.toThrow()
  })

  it('updates the stored value on subsequent setTheme calls', () => {
    setTheme('dark')
    expect(getTheme()).toBe('dark')
    setTheme('cyber')
    expect(getTheme()).toBe('cyber')
    setTheme('system')
    expect(getTheme()).toBe('system')
  })
})
