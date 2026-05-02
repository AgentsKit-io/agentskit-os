import { describe, expect, it } from 'vitest'
import {
  EXTENSION_API_VERSION,
  EXTENSION_POINTS,
  ExtensionPoint,
  PluginRegistry,
  isApiCompatible,
  isHotReloadable,
  parsePluginEntrypoint,
  safeParsePluginEntrypoint,
  stabilityOf,
} from '../../src/plugins/catalog.js'

describe('EXTENSION_POINTS', () => {
  it('exposes 24 stable points', () => {
    expect(EXTENSION_POINTS.length).toBe(24)
  })

  it.each(EXTENSION_POINTS)('parses %s', (p) => {
    expect(ExtensionPoint.safeParse(p).success).toBe(true)
  })

  it('rejects unknown point', () => {
    expect(ExtensionPoint.safeParse('cosmic').success).toBe(false)
  })
})

describe('stabilityOf', () => {
  it('marks core points stable', () => {
    expect(stabilityOf('tool')).toBe('stable')
    expect(stabilityOf('trigger')).toBe('stable')
    expect(stabilityOf('memory-backend')).toBe('stable')
  })

  it('marks experimental points', () => {
    expect(stabilityOf('flow-node-kind')).toBe('experimental')
    expect(stabilityOf('consent-policy')).toBe('experimental')
    expect(stabilityOf('brand-kit-validator')).toBe('experimental')
    expect(stabilityOf('cost-meter')).toBe('experimental')
  })
})

describe('isHotReloadable', () => {
  it.each([
    ['tool', true],
    ['skill', true],
    ['ui-panel', true],
    ['template-pack', true],
    ['vault-backend', false],
    ['sandbox-runtime', false],
    ['audit-signer', false],
    ['egress-enforcer', false],
  ] as const)('%s → %s', (p, expected) => {
    expect(isHotReloadable(p)).toBe(expected)
  })
})

describe('PluginEntrypoint', () => {
  const valid = {
    id: 'gh-bot',
    registers: [
      { point: 'tool', id: 'github-fetch', pluginId: 'gh-bot', version: '1.0.0' },
      { point: 'trigger', id: 'pr-opened', pluginId: 'gh-bot', version: '1.0.0' },
    ],
  }

  it('parses with default extensionApi', () => {
    const e = parsePluginEntrypoint(valid)
    expect(e.extensionApi).toBe('^1.0.0')
    expect(e.registers).toHaveLength(2)
  })

  it('rejects empty registers', () => {
    expect(safeParsePluginEntrypoint({ ...valid, registers: [] }).success).toBe(false)
  })

  it('rejects unknown extension point in register', () => {
    expect(
      safeParsePluginEntrypoint({
        ...valid,
        registers: [{ point: 'cosmic', id: 'x', pluginId: 'gh-bot', version: '1.0.0' }],
      }).success,
    ).toBe(false)
  })

  it('rejects bad semver', () => {
    expect(
      safeParsePluginEntrypoint({
        ...valid,
        registers: [{ point: 'tool', id: 'x', pluginId: 'gh-bot', version: '1.0' }],
      }).success,
    ).toBe(false)
  })

  it('throws on parsePluginEntrypoint with invalid input', () => {
    expect(() => parsePluginEntrypoint({})).toThrow()
  })
})

describe('PluginRegistry', () => {
  const reg = (over: Partial<{ point: 'tool' | 'trigger'; id: string; pluginId: string }> = {}) => ({
    point: over.point ?? 'tool',
    id: over.id ?? 'web-search',
    pluginId: over.pluginId ?? 'plugin-a',
    version: '1.0.0',
  } as const)

  it('registers and looks up by (point, id)', () => {
    const r = new PluginRegistry()
    expect(r.register(reg()).kind).toBe('ok')
    expect(r.size).toBe(1)
    const found = r.get('tool', 'web-search')
    expect(found?.pluginId).toBe('plugin-a')
  })

  it('allows same plugin to re-register (idempotent update)', () => {
    const r = new PluginRegistry()
    r.register(reg())
    expect(r.register(reg()).kind).toBe('ok')
    expect(r.size).toBe(1)
  })

  it('reports conflict when different plugin claims same key', () => {
    const r = new PluginRegistry()
    r.register(reg({ pluginId: 'plugin-a' }))
    const result = r.register(reg({ pluginId: 'plugin-b' }))
    expect(result.kind).toBe('conflict')
    if (result.kind === 'conflict') {
      expect(result.conflict.existingPluginId).toBe('plugin-a')
      expect(result.conflict.attemptedPluginId).toBe('plugin-b')
    }
  })

  it('unregisterPlugin removes only that plugin entries', () => {
    const r = new PluginRegistry()
    r.register(reg({ pluginId: 'plugin-a', id: 'a' }))
    r.register(reg({ pluginId: 'plugin-a', id: 'b' }))
    r.register(reg({ pluginId: 'plugin-b', id: 'c' }))
    expect(r.unregisterPlugin('plugin-a')).toBe(2)
    expect(r.size).toBe(1)
  })

  it('list filters by extension point', () => {
    const r = new PluginRegistry()
    r.register(reg({ point: 'tool', id: 't1' }))
    r.register(reg({ point: 'trigger', id: 'g1' }))
    expect(r.list('tool')).toHaveLength(1)
    expect(r.list('trigger')).toHaveLength(1)
    expect(r.list()).toHaveLength(2)
  })
})

describe('isApiCompatible', () => {
  it('matching majors are compatible', () => {
    expect(isApiCompatible('1.0', '1.5')).toBe(true)
  })

  it('different majors are incompatible', () => {
    expect(isApiCompatible('1.0', '2.0')).toBe(false)
  })

  it('exposes EXTENSION_API_VERSION', () => {
    expect(EXTENSION_API_VERSION).toBe('1.0')
  })
})
