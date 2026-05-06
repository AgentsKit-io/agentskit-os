/**
 * Tests for plugin contribution Zod schemas.
 *
 * Covers:
 *   - PluginContribution base shape (valid + invalid)
 *   - PluginDashboardContribution (valid + invalid layout)
 *   - PluginWidgetContribution (valid + invalid defaultSize)
 */

import { describe, it, expect } from 'vitest'
import {
  PluginContribution,
  PluginDashboardContribution,
  PluginWidgetContribution,
} from '../contribution-types'

// ---------------------------------------------------------------------------
// PluginContribution
// ---------------------------------------------------------------------------

describe('PluginContribution', () => {
  it('parses a valid base contribution', () => {
    const result = PluginContribution.safeParse({
      id: 'my-contribution',
      pluginId: 'my-plugin',
      version: '1.2.3',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing id', () => {
    const result = PluginContribution.safeParse({
      pluginId: 'my-plugin',
      version: '1.2.3',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid semver version', () => {
    const result = PluginContribution.safeParse({
      id: 'x',
      pluginId: 'y',
      version: 'not-semver',
    })
    expect(result.success).toBe(false)
  })

  it('accepts semver with pre-release tag', () => {
    const result = PluginContribution.safeParse({
      id: 'x',
      pluginId: 'y',
      version: '0.1.0-alpha.1',
    })
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// PluginDashboardContribution
// ---------------------------------------------------------------------------

describe('PluginDashboardContribution', () => {
  const validDashboard = {
    id: 'dash-1',
    pluginId: 'demo-plugin',
    version: '1.0.0',
    layout: {
      name: 'My Dashboard',
      description: 'A test dashboard.',
      gridCols: 12,
      gridRowHeight: 80,
      widgets: [{ kind: 'stats-summary', x: 0, y: 0, w: 12, h: 2 }],
    },
  }

  it('parses a valid dashboard contribution', () => {
    const result = PluginDashboardContribution.safeParse(validDashboard)
    expect(result.success).toBe(true)
  })

  it('uses default gridCols and gridRowHeight when omitted', () => {
    const result = PluginDashboardContribution.safeParse({
      ...validDashboard,
      layout: {
        name: 'Minimal',
        widgets: [],
      },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.layout.gridCols).toBe(12)
      expect(result.data.layout.gridRowHeight).toBe(80)
    }
  })

  it('rejects a dashboard with missing layout.name', () => {
    const result = PluginDashboardContribution.safeParse({
      ...validDashboard,
      layout: { widgets: [] },
    })
    expect(result.success).toBe(false)
  })

  it('rejects a widget slot with negative x', () => {
    const result = PluginDashboardContribution.safeParse({
      ...validDashboard,
      layout: {
        ...validDashboard.layout,
        widgets: [{ kind: 'foo', x: -1, y: 0, w: 4, h: 2 }],
      },
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// PluginWidgetContribution
// ---------------------------------------------------------------------------

describe('PluginWidgetContribution', () => {
  const validWidget = {
    id: 'hello-widget',
    pluginId: 'demo-plugin',
    version: '1.0.0',
    kind: 'plugin:demo-plugin:hello-widget',
    label: 'Hello Widget',
    defaultSize: [4, 2] as [number, number],
  }

  it('parses a valid widget contribution', () => {
    const result = PluginWidgetContribution.safeParse(validWidget)
    expect(result.success).toBe(true)
  })

  it('accepts optional renderSchema', () => {
    const result = PluginWidgetContribution.safeParse({
      ...validWidget,
      renderSchema: { message: { type: 'string' } },
    })
    expect(result.success).toBe(true)
  })

  it('rejects a defaultSize tuple with zero width', () => {
    const result = PluginWidgetContribution.safeParse({
      ...validWidget,
      defaultSize: [0, 2],
    })
    expect(result.success).toBe(false)
  })

  it('rejects when label is empty', () => {
    const result = PluginWidgetContribution.safeParse({
      ...validWidget,
      label: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects when kind is empty', () => {
    const result = PluginWidgetContribution.safeParse({
      ...validWidget,
      kind: '',
    })
    expect(result.success).toBe(false)
  })
})
