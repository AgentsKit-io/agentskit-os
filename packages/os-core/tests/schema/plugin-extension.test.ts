import { describe, expect, it } from 'vitest'
import {
  PluginConfig,
  resolvePluginEntries,
} from '../../src/index.js'

describe('plugin manifest extension (#83)', () => {
  it('parses entryPoints + uiSlot + isolation + minHostVersion', () => {
    const cfg = PluginConfig.parse({
      id: 'cost-widget',
      name: 'Cost Widget',
      version: '0.1.0',
      source: 'marketplace:cost-widget',
      contributes: ['ui-widget'],
      entryPoints: { 'ui-widget': './dist/widget.js' },
      uiSlot: 'dashboard',
      isolation: 'iframe',
      minHostVersion: '^1.0.0',
    })
    expect(cfg.entryPoints?.['ui-widget']).toBe('./dist/widget.js')
    expect(cfg.uiSlot).toBe('dashboard')
    expect(cfg.minHostVersion).toBe('^1.0.0')
  })

  it('rejects unknown uiSlot values', () => {
    const r = PluginConfig.safeParse({
      id: 'x',
      name: 'X',
      version: '0.1.0',
      source: 'file:plugin.js',
      contributes: ['ui-panel'],
      uiSlot: 'totally-bogus',
    })
    expect(r.success).toBe(false)
  })
})

describe('resolvePluginEntries (#83)', () => {
  it('falls back to isolation default per contribution kind', () => {
    const cfg = PluginConfig.parse({
      id: 'multi',
      name: 'Multi',
      version: '0.1.0',
      source: 'file:multi.js',
      contributes: ['tool', 'ui-panel'],
      entryPoints: { tool: './tool.js', 'ui-panel': './panel.js' },
      uiSlot: 'sidebar',
    })
    const entries = resolvePluginEntries(cfg)
    const tool = entries.find((e) => e.contribution === 'tool')
    const panel = entries.find((e) => e.contribution === 'ui-panel')
    expect(tool?.isolation).toBe('subprocess')
    expect(tool?.uiSlot).toBeUndefined()
    expect(panel?.isolation).toBe('iframe')
    expect(panel?.uiSlot).toBe('sidebar')
    expect(panel?.entryPoint).toBe('./panel.js')
  })

  it('honors caller-pinned isolation override', () => {
    const cfg = PluginConfig.parse({
      id: 'native',
      name: 'Native',
      version: '0.1.0',
      source: 'file:native.js',
      contributes: ['ui-panel'],
      isolation: 'webview',
    })
    expect(resolvePluginEntries(cfg)[0]?.isolation).toBe('webview')
  })

  it('returns undefined entryPoint when manifest does not declare one for a contribution', () => {
    const cfg = PluginConfig.parse({
      id: 'lite',
      name: 'Lite',
      version: '0.1.0',
      source: 'file:lite.js',
      contributes: ['tool'],
    })
    expect(resolvePluginEntries(cfg)[0]?.entryPoint).toBeUndefined()
  })
})
