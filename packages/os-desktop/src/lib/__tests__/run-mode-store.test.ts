import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getRunMode, setRunMode } from '../run-mode-store'

describe('run-mode-store', () => {
  const STORAGE_KEY = 'agentskitos.runMode'

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY)
  })

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY)
    vi.restoreAllMocks()
  })

  it('returns "preview" as the default when nothing is stored', () => {
    expect(getRunMode()).toBe('preview')
  })

  it.each(['real', 'preview', 'dry_run', 'sandbox'] as const)(
    'persists and retrieves "%s"',
    (mode) => {
      setRunMode(mode)
      expect(getRunMode()).toBe(mode)
    },
  )

  it('returns "preview" when an invalid value is stored', () => {
    localStorage.setItem(STORAGE_KEY, 'totally-invalid')
    expect(getRunMode()).toBe('preview')
  })

  it('updates the stored value on subsequent setRunMode calls', () => {
    setRunMode('preview')
    expect(getRunMode()).toBe('preview')
    setRunMode('real')
    expect(getRunMode()).toBe('real')
    setRunMode('dry_run')
    expect(getRunMode()).toBe('dry_run')
  })
})
