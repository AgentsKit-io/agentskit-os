import { describe, expect, it } from 'vitest'
import {
  PluginConfig,
  composePluginSurfaces,
  planPluginMount,
} from '../../src/index.js'

const config = PluginConfig.parse({
  id: 'multi',
  name: 'Multi',
  version: '0.1.0',
  source: 'file:multi.js',
  contributes: ['tool', 'ui-panel', 'ui-widget', 'trigger', 'observability'],
  entryPoints: {
    tool: './tool.js',
    'ui-panel': './panel.js',
    'ui-widget': './widget.js',
    trigger: './trigger.js',
    observability: './obs.js',
  },
  uiSlot: 'dashboard',
})

describe('composePluginSurfaces (#96)', () => {
  it('groups entries by surface', () => {
    const g = composePluginSurfaces(config)
    expect(g.ui.map((e) => e.contribution).sort()).toEqual(['ui-panel', 'ui-widget'])
    expect(g.dashboards.map((e) => e.contribution)).toEqual(['ui-widget'])
    expect(g.tools.map((e) => e.contribution)).toEqual(['tool'])
    expect(g.triggers.map((e) => e.contribution)).toEqual(['trigger'])
    expect(g.observability.map((e) => e.contribution)).toEqual(['observability'])
  })

  it('dashboards exclude ui-widget without dashboard slot', () => {
    const cfg = PluginConfig.parse({
      id: 'p',
      name: 'P',
      version: '0.1.0',
      source: 'file:p.js',
      contributes: ['ui-widget'],
      entryPoints: { 'ui-widget': './w.js' },
      uiSlot: 'sidebar',
    })
    expect(composePluginSurfaces(cfg).dashboards).toEqual([])
  })
})

describe('planPluginMount (#96)', () => {
  it('mounts every entry that satisfies its surface', () => {
    const plan = planPluginMount(config)
    const mountSurfaces = plan.filter((p) => p.kind === 'mount').map((p) => p.surface)
    expect(mountSurfaces).toContain('tools')
    expect(mountSurfaces).toContain('triggers')
    expect(mountSurfaces).toContain('observability')
  })

  it('skips ui contribution without entryPoint', () => {
    const cfg = PluginConfig.parse({
      id: 'lite',
      name: 'Lite',
      version: '0.1.0',
      source: 'file:lite.js',
      contributes: ['ui-panel'],
    })
    const plan = planPluginMount(cfg)
    expect(plan.some((p) => p.kind === 'skip' && p.reason.includes('missing entryPoint'))).toBe(true)
  })
})
