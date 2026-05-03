/**
 * Unit tests for use-status-line-store helpers.
 *
 * Covers:
 *   - loadStatusLineConfig returns defaults when storage is empty
 *   - loadStatusLineConfig hydrates a valid stored list
 *   - loadStatusLineConfig strips stale ids and appends newly-added ones
 *   - loadStatusLineConfig falls back on invalid JSON
 *   - saveStatusLineConfig writes to localStorage
 *   - clearStatusLineConfig removes the key from localStorage
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadStatusLineConfig,
  saveStatusLineConfig,
  clearStatusLineConfig,
} from '../use-status-line-store'

const STORAGE_KEY = 'agentskitos.status-line'
const DEFAULTS = ['a', 'b', 'c']

describe('use-status-line-store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns defaults when localStorage is empty', () => {
    const result = loadStatusLineConfig(DEFAULTS)
    expect(result).toEqual(DEFAULTS)
  })

  it('hydrates a valid stored list', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['c', 'a']))
    const result = loadStatusLineConfig(DEFAULTS)
    // Stored ids first (c, a), then unmentioned defaults (b)
    expect(result).toEqual(['c', 'a', 'b'])
  })

  it('strips stale ids not in defaults', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['c', 'STALE', 'a']))
    const result = loadStatusLineConfig(DEFAULTS)
    expect(result).not.toContain('STALE')
    expect(result).toContain('a')
    expect(result).toContain('c')
  })

  it('appends ids that appear in defaults but not in the stored list', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['a']))
    const result = loadStatusLineConfig(DEFAULTS)
    // 'b' and 'c' must be appended after 'a'
    expect(result).toContain('b')
    expect(result).toContain('c')
    expect(result.indexOf('a')).toBeLessThan(result.indexOf('b'))
  })

  it('falls back to defaults on invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'NOT JSON')
    const result = loadStatusLineConfig(DEFAULTS)
    expect(result).toEqual(DEFAULTS)
  })

  it('falls back to defaults when stored value is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ids: ['a', 'b'] }))
    const result = loadStatusLineConfig(DEFAULTS)
    expect(result).toEqual(DEFAULTS)
  })

  it('saveStatusLineConfig writes ids to localStorage', () => {
    saveStatusLineConfig(['b', 'a'])
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!)).toEqual(['b', 'a'])
  })

  it('clearStatusLineConfig removes the key', () => {
    saveStatusLineConfig(['a', 'b'])
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    clearStatusLineConfig()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
