/**
 * Unit tests for Zod schemas in dashboards/types.ts.
 *
 * Covers:
 *   - WidgetIdSchema rejects empty strings
 *   - WidgetSchema validates correct objects
 *   - WidgetSchema rejects invalid geometry
 *   - DashboardSchema applies defaults for gridCols / gridRowHeight
 *   - DashboardSetSchema parses full structure
 */

import { describe, it, expect } from 'vitest'
import {
  WidgetIdSchema,
  WidgetSchema,
  DashboardSchema,
  DashboardSetSchema,
} from '../types'

describe('WidgetIdSchema', () => {
  it('accepts a non-empty string', () => {
    expect(WidgetIdSchema.safeParse('abc').success).toBe(true)
  })

  it('rejects an empty string', () => {
    expect(WidgetIdSchema.safeParse('').success).toBe(false)
  })

  it('rejects non-string values', () => {
    expect(WidgetIdSchema.safeParse(42).success).toBe(false)
    expect(WidgetIdSchema.safeParse(null).success).toBe(false)
  })
})

describe('WidgetSchema', () => {
  const validWidget = {
    id: 'w1',
    kind: 'stats-summary',
    x: 0,
    y: 0,
    w: 4,
    h: 2,
  }

  it('parses a valid widget', () => {
    const result = WidgetSchema.safeParse(validWidget)
    expect(result.success).toBe(true)
  })

  it('accepts optional props', () => {
    const result = WidgetSchema.safeParse({ ...validWidget, props: { foo: 'bar' } })
    expect(result.success).toBe(true)
  })

  it('rejects w < 1', () => {
    expect(WidgetSchema.safeParse({ ...validWidget, w: 0 }).success).toBe(false)
  })

  it('rejects h < 1', () => {
    expect(WidgetSchema.safeParse({ ...validWidget, h: 0 }).success).toBe(false)
  })

  it('rejects negative x', () => {
    expect(WidgetSchema.safeParse({ ...validWidget, x: -1 }).success).toBe(false)
  })

  it('rejects non-integer values', () => {
    expect(WidgetSchema.safeParse({ ...validWidget, x: 1.5 }).success).toBe(false)
  })
})

describe('DashboardSchema', () => {
  it('applies default gridCols of 12', () => {
    const result = DashboardSchema.safeParse({
      id: 'd1',
      name: 'Test',
      widgets: [],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.gridCols).toBe(12)
    }
  })

  it('applies default gridRowHeight of 80', () => {
    const result = DashboardSchema.safeParse({
      id: 'd1',
      name: 'Test',
      widgets: [],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.gridRowHeight).toBe(80)
    }
  })

  it('accepts explicit gridCols and gridRowHeight', () => {
    const result = DashboardSchema.safeParse({
      id: 'd1',
      name: 'Test',
      widgets: [],
      gridCols: 6,
      gridRowHeight: 100,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.gridCols).toBe(6)
      expect(result.data.gridRowHeight).toBe(100)
    }
  })

  it('rejects empty name', () => {
    expect(
      DashboardSchema.safeParse({ id: 'd1', name: '', widgets: [] }).success,
    ).toBe(false)
  })

  it('rejects gridCols < 1', () => {
    expect(
      DashboardSchema.safeParse({
        id: 'd1',
        name: 'Test',
        widgets: [],
        gridCols: 0,
      }).success,
    ).toBe(false)
  })
})

describe('DashboardSetSchema', () => {
  const validSet = {
    dashboards: [
      {
        id: 'd1',
        name: 'Overview',
        widgets: [{ id: 'w1', kind: 'stats-summary', x: 0, y: 0, w: 4, h: 2 }],
      },
    ],
    activeId: 'd1',
  }

  it('parses a valid DashboardSet', () => {
    expect(DashboardSetSchema.safeParse(validSet).success).toBe(true)
  })

  it('rejects if dashboards is not an array', () => {
    expect(DashboardSetSchema.safeParse({ ...validSet, dashboards: null }).success).toBe(
      false,
    )
  })

  it('rejects if activeId is missing', () => {
    expect(
      DashboardSetSchema.safeParse({ dashboards: validSet.dashboards }).success,
    ).toBe(false)
  })
})
