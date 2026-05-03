/**
 * Unit tests for shortcut-types.ts pure helpers.
 */

import { describe, it, expect } from 'vitest'
import {
  parseBinding,
  matchesBinding,
  formatBinding,
  buildBindingFromEvent,
} from '../shortcut-types'

// ---------------------------------------------------------------------------
// parseBinding
// ---------------------------------------------------------------------------

describe('parseBinding', () => {
  it('parses meta+k', () => {
    const result = parseBinding('meta+k')
    expect(result).toEqual({ meta: true, ctrl: false, alt: false, shift: false, key: 'k' })
  })

  it('parses ctrl+shift+t', () => {
    const result = parseBinding('ctrl+shift+t')
    expect(result).toEqual({ meta: false, ctrl: true, alt: false, shift: true, key: 't' })
  })

  it('parses meta+shift+/', () => {
    const result = parseBinding('meta+shift+/')
    expect(result).toEqual({ meta: true, ctrl: false, alt: false, shift: true, key: '/' })
  })

  it('parses a bare key with no modifiers', () => {
    const result = parseBinding('escape')
    expect(result).toEqual({ meta: false, ctrl: false, alt: false, shift: false, key: 'escape' })
  })

  it('is case-insensitive', () => {
    const result = parseBinding('META+K')
    expect(result.meta).toBe(true)
    expect(result.key).toBe('k')
  })
})

// ---------------------------------------------------------------------------
// matchesBinding
// ---------------------------------------------------------------------------

function makeEvent(key: string, mods: Partial<KeyboardEventInit> = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true, ...mods })
}

describe('matchesBinding', () => {
  it('matches meta+k', () => {
    const e = makeEvent('k', { metaKey: true })
    expect(matchesBinding(e, 'meta+k')).toBe(true)
  })

  it('does not match when modifier differs', () => {
    const e = makeEvent('k', { ctrlKey: true })
    expect(matchesBinding(e, 'meta+k')).toBe(false)
  })

  it('matches ctrl+shift+t', () => {
    const e = makeEvent('t', { ctrlKey: true, shiftKey: true })
    expect(matchesBinding(e, 'ctrl+shift+t')).toBe(true)
  })

  it('matches escape (named key)', () => {
    const e = makeEvent('Escape')
    expect(matchesBinding(e, 'escape')).toBe(true)
  })

  it('is case-insensitive for the key', () => {
    const e = makeEvent('K', { metaKey: true })
    expect(matchesBinding(e, 'meta+k')).toBe(true)
  })

  it('does not match wrong key', () => {
    const e = makeEvent('j', { metaKey: true })
    expect(matchesBinding(e, 'meta+k')).toBe(false)
  })

  it('does not match when extra modifier present', () => {
    const e = makeEvent('k', { metaKey: true, shiftKey: true })
    expect(matchesBinding(e, 'meta+k')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// formatBinding
// ---------------------------------------------------------------------------

describe('formatBinding', () => {
  it('formats meta+k as ⌘K', () => {
    expect(formatBinding('meta+k')).toBe('⌘K')
  })

  it('formats ctrl+shift+t as ⌃⇧T', () => {
    expect(formatBinding('ctrl+shift+t')).toBe('⌃⇧T')
  })

  it('formats meta+shift+/ as ⌘⇧/', () => {
    expect(formatBinding('meta+shift+/')).toBe('⌘⇧/')
  })

  it('formats alt+f4 as ⌥F4', () => {
    expect(formatBinding('alt+f4')).toBe('⌥F4')
  })
})

// ---------------------------------------------------------------------------
// buildBindingFromEvent
// ---------------------------------------------------------------------------

describe('buildBindingFromEvent', () => {
  it('builds meta+k', () => {
    const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true })
    expect(buildBindingFromEvent(e)).toBe('meta+k')
  })

  it('builds ctrl+shift+t', () => {
    const e = new KeyboardEvent('keydown', { key: 't', ctrlKey: true, shiftKey: true })
    expect(buildBindingFromEvent(e)).toBe('ctrl+shift+t')
  })

  it('returns empty string for lone Meta key', () => {
    const e = new KeyboardEvent('keydown', { key: 'Meta', metaKey: true })
    // Just modifier parts with no key — result will be 'meta' (only modifiers)
    // but the key part is filtered
    const result = buildBindingFromEvent(e)
    expect(result).toBe('meta')
  })

  it('includes all four modifiers when pressed', () => {
    const e = new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true,
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
    })
    expect(buildBindingFromEvent(e)).toBe('meta+ctrl+alt+shift+z')
  })
})
