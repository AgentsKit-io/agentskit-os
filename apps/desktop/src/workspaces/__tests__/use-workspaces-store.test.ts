/**
 * Unit tests for use-workspaces-store.
 *
 * Covers:
 *   - getCurrentWorkspaceId returns null when no data persisted
 *   - setCurrentWorkspaceId persists to localStorage
 *   - getCurrentWorkspaceId returns the persisted id
 *   - clearCurrentWorkspaceId removes the persisted value
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCurrentWorkspaceId,
  setCurrentWorkspaceId,
  clearCurrentWorkspaceId,
} from '../use-workspaces-store'

const STORAGE_KEY = 'agentskitos.current-workspace'

describe('use-workspaces-store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getCurrentWorkspaceId returns null when nothing is stored', () => {
    expect(getCurrentWorkspaceId()).toBeNull()
  })

  it('setCurrentWorkspaceId persists the id to localStorage', () => {
    setCurrentWorkspaceId('ws-42')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('ws-42')
  })

  it('getCurrentWorkspaceId returns the persisted id', () => {
    localStorage.setItem(STORAGE_KEY, 'ws-99')
    expect(getCurrentWorkspaceId()).toBe('ws-99')
  })

  it('clearCurrentWorkspaceId removes the persisted value', () => {
    setCurrentWorkspaceId('ws-42')
    expect(getCurrentWorkspaceId()).toBe('ws-42')

    clearCurrentWorkspaceId()
    expect(getCurrentWorkspaceId()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('setCurrentWorkspaceId overwrites a previous value', () => {
    setCurrentWorkspaceId('ws-1')
    setCurrentWorkspaceId('ws-2')
    expect(getCurrentWorkspaceId()).toBe('ws-2')
  })
})
