import { describe, expect, it } from 'vitest'
import { buildTopologyPlan } from '../../src/index.js'

describe('buildTopologyPlan (#93)', () => {
  it('star: hub fans out to spokes and back on success', () => {
    const plan = buildTopologyPlan('star', ['hub', 'a', 'b'])
    expect(plan.entry).toBe('hub')
    expect(plan.edges).toContainEqual({ from: 'hub', to: 'a', on: 'always' })
    expect(plan.edges).toContainEqual({ from: 'a', to: 'hub', on: 'success' })
  })

  it('ring: each agent points to the next; last wraps to first', () => {
    const plan = buildTopologyPlan('ring', ['a', 'b', 'c'])
    expect(plan.edges).toContainEqual({ from: 'a', to: 'b', on: 'success' })
    expect(plan.edges).toContainEqual({ from: 'c', to: 'a', on: 'success' })
  })

  it('mesh: every agent talks to every other agent', () => {
    const plan = buildTopologyPlan('mesh', ['a', 'b', 'c'])
    expect(plan.edges).toHaveLength(6)
  })

  it('pipeline: linear edges only', () => {
    const plan = buildTopologyPlan('pipeline', ['a', 'b', 'c'])
    expect(plan.edges).toHaveLength(2)
    expect(plan.edges[0]).toEqual({ from: 'a', to: 'b', on: 'success' })
  })

  it('throws on empty agent list', () => {
    expect(() => buildTopologyPlan('ring', [])).toThrow(/at least one/)
  })
})
