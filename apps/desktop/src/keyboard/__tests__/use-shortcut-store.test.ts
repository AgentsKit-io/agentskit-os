/**
 * Unit tests for use-shortcut-store.ts.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadOverrides,
  saveOverrides,
  clearOverrides,
  exportOverridesToJson,
  importOverridesFromJson,
} from '../use-shortcut-store'

// localStorage is stubbed in test-setup.ts

beforeEach(() => {
  localStorage.clear()
})

describe('loadOverrides', () => {
  it('returns empty object when nothing is stored', () => {
    expect(loadOverrides()).toEqual({})
  })

  it('returns stored overrides', () => {
    localStorage.setItem(
      'agentskitos.shortcuts',
      JSON.stringify({ 'palette.toggle': 'ctrl+k' }),
    )
    expect(loadOverrides()).toEqual({ 'palette.toggle': 'ctrl+k' })
  })

  it('ignores non-string values in stored data', () => {
    localStorage.setItem(
      'agentskitos.shortcuts',
      JSON.stringify({ 'palette.toggle': 'ctrl+k', bad: 42 }),
    )
    expect(loadOverrides()).toEqual({ 'palette.toggle': 'ctrl+k' })
  })

  it('returns empty object for malformed JSON', () => {
    localStorage.setItem('agentskitos.shortcuts', '{not valid json')
    expect(loadOverrides()).toEqual({})
  })

  it('returns empty object when stored value is an array', () => {
    localStorage.setItem('agentskitos.shortcuts', '["a","b"]')
    expect(loadOverrides()).toEqual({})
  })
})

describe('saveOverrides', () => {
  it('persists overrides to localStorage', () => {
    saveOverrides({ 'nav.dashboard': 'meta+shift+1' })
    const raw = localStorage.getItem('agentskitos.shortcuts')
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!)).toEqual({ 'nav.dashboard': 'meta+shift+1' })
  })
})

describe('clearOverrides', () => {
  it('removes the stored key', () => {
    saveOverrides({ 'nav.dashboard': 'meta+shift+1' })
    clearOverrides()
    expect(localStorage.getItem('agentskitos.shortcuts')).toBeNull()
  })
})

describe('exportOverridesToJson', () => {
  it('produces valid JSON with version envelope', () => {
    const json = exportOverridesToJson({ 'nav.dashboard': 'meta+shift+1' })
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.overrides).toEqual({ 'nav.dashboard': 'meta+shift+1' })
  })

  it('produces valid JSON for empty overrides', () => {
    const json = exportOverridesToJson({})
    const parsed = JSON.parse(json)
    expect(parsed.overrides).toEqual({})
  })
})

describe('importOverridesFromJson', () => {
  it('imports from envelope format', () => {
    const json = JSON.stringify({
      version: 1,
      overrides: { 'nav.dashboard': 'meta+shift+1' },
    })
    expect(importOverridesFromJson(json)).toEqual({ 'nav.dashboard': 'meta+shift+1' })
  })

  it('imports from bare format', () => {
    const json = JSON.stringify({ 'nav.dashboard': 'meta+shift+1' })
    expect(importOverridesFromJson(json)).toEqual({ 'nav.dashboard': 'meta+shift+1' })
  })

  it('ignores non-string values', () => {
    const json = JSON.stringify({ 'nav.dashboard': 'meta+shift+1', bad: 99 })
    expect(importOverridesFromJson(json)).toEqual({ 'nav.dashboard': 'meta+shift+1' })
  })

  it('throws on invalid JSON', () => {
    expect(() => importOverridesFromJson('{bad json')).toThrow('Invalid JSON')
  })

  it('throws when root is an array', () => {
    expect(() => importOverridesFromJson('["a"]')).toThrow('Expected a JSON object')
  })

  it('throws when envelope overrides is not an object', () => {
    const json = JSON.stringify({ version: 1, overrides: 'wrong' })
    expect(() => importOverridesFromJson(json)).toThrow('Invalid overrides payload')
  })

  it('round-trips export → import', () => {
    const original = { 'palette.toggle': 'ctrl+k', 'view.focus-mode': 'alt+f' }
    const json = exportOverridesToJson(original)
    expect(importOverridesFromJson(json)).toEqual(original)
  })
})
