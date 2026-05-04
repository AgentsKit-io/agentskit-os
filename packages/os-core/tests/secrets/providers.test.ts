import { describe, expect, it } from 'vitest'
import {
  BUILTIN_PROVIDERS,
  checkProviderKeys,
  filterProviders,
  parseProviderRequirement,
} from '../../src/secrets/providers.js'

describe('BUILTIN_PROVIDERS', () => {
  it('includes the canonical LLM + integration set', () => {
    const ids = BUILTIN_PROVIDERS.map((p) => p.id)
    for (const id of ['openai', 'anthropic', 'gemini', 'github', 'slack', 'linear', 'discord', 'teams', 'marketplace', 'ollama', 'lmstudio']) {
      expect(ids).toContain(id)
    }
  })

  it('every entry parses against the schema', () => {
    for (const p of BUILTIN_PROVIDERS) {
      expect(() => parseProviderRequirement(p)).not.toThrow()
    }
  })

  it('local providers are not marked cloud', () => {
    expect(BUILTIN_PROVIDERS.find((p) => p.id === 'ollama')?.cloud).toBe(false)
    expect(BUILTIN_PROVIDERS.find((p) => p.id === 'lmstudio')?.cloud).toBe(false)
  })
})

describe('filterProviders', () => {
  it('air-gap mode strips cloud providers', () => {
    const out = filterProviders(BUILTIN_PROVIDERS, { airGapped: true })
    expect(out.every((p) => !p.cloud)).toBe(true)
    expect(out.length).toBeGreaterThan(0)
  })

  it('kind filter restricts to llm only', () => {
    const out = filterProviders(BUILTIN_PROVIDERS, { kinds: ['llm'] })
    expect(out.every((p) => p.kind === 'llm')).toBe(true)
  })
})

describe('checkProviderKeys', () => {
  const openai = BUILTIN_PROVIDERS.find((p) => p.id === 'openai')!

  it('returns ok when required key present', () => {
    const r = checkProviderKeys(openai, new Set(['OPENAI_API_KEY']))
    expect(r.status).toBe('ok')
    expect(r.missingKeys).toEqual([])
  })

  it('returns missing with remediation when key absent', () => {
    const r = checkProviderKeys(openai, new Set())
    expect(r.status).toBe('missing')
    expect(r.missingKeys).toContain('OPENAI_API_KEY')
    expect(r.remediation).toContain('OPENAI_API_KEY')
  })

  it('skips cloud provider in air-gap mode', () => {
    const r = checkProviderKeys(openai, new Set(), { airGapped: true })
    expect(r.status).toBe('skipped')
    expect(r.missingKeys).toEqual([])
  })

  it('local provider with no required keys is ok even with empty vault', () => {
    const ollama = BUILTIN_PROVIDERS.find((p) => p.id === 'ollama')!
    const r = checkProviderKeys(ollama, new Set())
    expect(r.status).toBe('ok')
  })

  it('does not return secret values in any field', () => {
    const r = checkProviderKeys(openai, new Set(['OPENAI_API_KEY']))
    const json = JSON.stringify(r)
    expect(json).not.toContain('sk-')
  })
})
