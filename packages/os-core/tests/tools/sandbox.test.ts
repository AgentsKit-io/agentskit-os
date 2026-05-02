import { describe, expect, it } from 'vitest'
import {
  SANDBOX_LEVELS,
  SandboxLevel,
  MIN_SANDBOX_FOR,
  decideSandbox,
  parseToolManifest,
  safeParseToolManifest,
} from '../../src/tools/sandbox.js'

describe('SandboxLevel', () => {
  it('exposes 5 levels', () => {
    expect(SANDBOX_LEVELS).toEqual(['none', 'process', 'container', 'vm', 'webcontainer'])
  })

  it.each(SANDBOX_LEVELS)('parses %s', (s) => {
    expect(SandboxLevel.safeParse(s).success).toBe(true)
  })
})

describe('MIN_SANDBOX_FOR', () => {
  it('none → none', () => expect(MIN_SANDBOX_FOR.none).toBe('none'))
  it('read → process', () => expect(MIN_SANDBOX_FOR.read).toBe('process'))
  it('destructive → container', () => expect(MIN_SANDBOX_FOR.destructive).toBe('container'))
  it('external → container', () => expect(MIN_SANDBOX_FOR.external).toBe('container'))
})

describe('decideSandbox', () => {
  it('uses min when no requested', () => {
    const d = decideSandbox(['read'], undefined)
    expect(d.kind).toBe('apply')
    if (d.kind === 'apply') expect(d.level).toBe('process')
  })

  it('respects elevation above minimum', () => {
    const d = decideSandbox(['read'], 'vm')
    expect(d.kind).toBe('apply')
    if (d.kind === 'apply') expect(d.level).toBe('vm')
  })

  it('rejects below-minimum without force', () => {
    const d = decideSandbox(['destructive'], 'process')
    expect(d.kind).toBe('reject')
  })

  it('allows below-minimum with force=true (with warning)', () => {
    const d = decideSandbox(['destructive'], 'process', true)
    expect(d.kind).toBe('apply')
    if (d.kind === 'apply') expect(d.reason).toContain('WARN')
  })

  it('uses max-min across mixed effects', () => {
    const d = decideSandbox(['read', 'external'], undefined)
    expect(d.kind).toBe('apply')
    if (d.kind === 'apply') expect(d.level).toBe('container')
  })

  it('none effect → none sandbox', () => {
    const d = decideSandbox(['none'], undefined)
    expect(d.kind).toBe('apply')
    if (d.kind === 'apply') expect(d.level).toBe('none')
  })
})

describe('ToolManifest', () => {
  const valid = {
    id: 'web-search',
    name: 'Web Search',
    sideEffects: ['external' as const],
  }

  it('parses minimal manifest', () => {
    const m = parseToolManifest(valid)
    expect(m.sideEffects).toEqual(['external'])
  })

  it('parses with minSandbox', () => {
    const m = parseToolManifest({ ...valid, minSandbox: 'container' })
    expect(m.minSandbox).toBe('container')
  })

  it('rejects empty sideEffects', () => {
    expect(safeParseToolManifest({ ...valid, sideEffects: [] }).success).toBe(false)
  })

  it('rejects unknown sideEffect', () => {
    expect(safeParseToolManifest({ ...valid, sideEffects: ['cosmic'] }).success).toBe(false)
  })

  it('throws on parseToolManifest with invalid input', () => {
    expect(() => parseToolManifest({})).toThrow()
  })
})
