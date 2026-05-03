import { describe, expect, it } from 'vitest'
import {
  FallbackEntry,
  NoAdapterAvailableError,
  parseFallbackEntry,
  pickAdapter,
  safeParseFallbackEntry,
} from '../../src/runtime/adapter-fallback.js'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const primaryOpenAI: FallbackEntry = parseFallbackEntry({
  provider: 'openai',
  model: 'gpt-4o',
})

const fallbackAnthropic: FallbackEntry = parseFallbackEntry({
  provider: 'anthropic',
  model: 'claude-3-haiku',
})

const localOllama: FallbackEntry = parseFallbackEntry({
  provider: 'ollama',
  model: 'llama3',
  local: true,
})

const ALL_AVAILABLE = new Set(['openai', 'anthropic', 'ollama'])
const ONLY_ANTHROPIC = new Set(['anthropic'])
const ONLY_OLLAMA = new Set(['ollama'])
const NONE: Set<string> = new Set()

// ---------------------------------------------------------------------------
// FallbackEntry schema
// ---------------------------------------------------------------------------

describe('FallbackEntry schema', () => {
  it('parses minimal entry', () => {
    const e = parseFallbackEntry({ provider: 'openai', model: 'gpt-4o' })
    expect(e.local).toBe(false)
  })

  it('parses local entry', () => {
    const e = parseFallbackEntry({ provider: 'ollama', model: 'llama3', local: true })
    expect(e.local).toBe(true)
  })

  it('rejects missing provider', () => {
    expect(safeParseFallbackEntry({ model: 'gpt-4o' }).success).toBe(false)
  })

  it('rejects missing model', () => {
    expect(safeParseFallbackEntry({ provider: 'openai' }).success).toBe(false)
  })

  it('rejects empty provider', () => {
    expect(safeParseFallbackEntry({ provider: '', model: 'gpt-4o' }).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// pickAdapter — primary available
// ---------------------------------------------------------------------------

describe('pickAdapter — primary available', () => {
  it('returns primary when available', () => {
    const r = pickAdapter({
      primary: primaryOpenAI,
      fallbacks: [fallbackAnthropic],
      available: ALL_AVAILABLE,
    })
    expect(r.selected.provider).toBe('openai')
    expect(r.usedFallback).toBe(false)
  })

  it('usedFallback is false for primary', () => {
    const r = pickAdapter({
      primary: primaryOpenAI,
      fallbacks: [],
      available: new Set(['openai']),
    })
    expect(r.usedFallback).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// pickAdapter — primary down, fallback used
// ---------------------------------------------------------------------------

describe('pickAdapter — primary unavailable, fallback used', () => {
  it('falls back to anthropic when openai is down', () => {
    const r = pickAdapter({
      primary: primaryOpenAI,
      fallbacks: [fallbackAnthropic],
      available: ONLY_ANTHROPIC,
    })
    expect(r.selected.provider).toBe('anthropic')
    expect(r.usedFallback).toBe(true)
  })

  it('tries fallbacks in order', () => {
    const fallback2: FallbackEntry = parseFallbackEntry({ provider: 'cohere', model: 'command' })
    const r = pickAdapter({
      primary: primaryOpenAI,
      fallbacks: [fallbackAnthropic, fallback2],
      available: new Set(['cohere']),
    })
    expect(r.selected.provider).toBe('cohere')
    expect(r.usedFallback).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// pickAdapter — preferLocal override
// ---------------------------------------------------------------------------

describe('pickAdapter — preferLocal', () => {
  it('prefers local provider over earlier network provider when preferLocal=true', () => {
    // openai + anthropic are reachable, ollama is also reachable but local
    const r = pickAdapter({
      primary: primaryOpenAI,
      fallbacks: [fallbackAnthropic, localOllama],
      available: ALL_AVAILABLE,
      preferLocal: true,
    })
    expect(r.selected.provider).toBe('ollama')
  })

  it('falls back to network providers when no local is available even with preferLocal', () => {
    const r = pickAdapter({
      primary: primaryOpenAI,
      fallbacks: [fallbackAnthropic, localOllama],
      available: ONLY_ANTHROPIC,
      preferLocal: true,
    })
    // ollama is not available → pick anthropic (the only reachable)
    expect(r.selected.provider).toBe('anthropic')
  })

  it('preferLocal=false preserves original ordering', () => {
    const r = pickAdapter({
      primary: primaryOpenAI,
      fallbacks: [fallbackAnthropic, localOllama],
      available: ALL_AVAILABLE,
      preferLocal: false,
    })
    expect(r.selected.provider).toBe('openai')
  })
})

// ---------------------------------------------------------------------------
// pickAdapter — none available → structured error
// ---------------------------------------------------------------------------

describe('pickAdapter — none available', () => {
  it('throws NoAdapterAvailableError when no provider is reachable', () => {
    expect(() =>
      pickAdapter({
        primary: primaryOpenAI,
        fallbacks: [fallbackAnthropic],
        available: NONE,
      }),
    ).toThrow(NoAdapterAvailableError)
  })

  it('NoAdapterAvailableError carries structured code', () => {
    let caught: unknown
    try {
      pickAdapter({
        primary: primaryOpenAI,
        fallbacks: [],
        available: NONE,
      })
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(NoAdapterAvailableError)
    expect((caught as NoAdapterAvailableError).code).toBe('os.runtime.no_adapter_available')
  })

  it('error message lists tried providers', () => {
    let caught: unknown
    try {
      pickAdapter({
        primary: primaryOpenAI,
        fallbacks: [fallbackAnthropic],
        available: NONE,
      })
    } catch (e) {
      caught = e
    }
    const msg = (caught as NoAdapterAvailableError).message
    expect(msg).toContain('openai')
    expect(msg).toContain('anthropic')
  })

  it('selects only-local when preferLocal and only ollama available', () => {
    const r = pickAdapter({
      primary: primaryOpenAI,
      fallbacks: [fallbackAnthropic, localOllama],
      available: ONLY_OLLAMA,
      preferLocal: true,
    })
    expect(r.selected.provider).toBe('ollama')
  })
})
