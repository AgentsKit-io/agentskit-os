import { describe, expect, it } from 'vitest'
import {
  FLOW_TEMPLATE_SEEDS,
  findFlowTemplateSeed,
} from '../src/flow-template-seeds.js'

describe('flow template seeds (#61)', () => {
  it('exposes at least 3 seeds with non-empty flows', () => {
    expect(FLOW_TEMPLATE_SEEDS.length).toBeGreaterThanOrEqual(3)
    for (const s of FLOW_TEMPLATE_SEEDS) {
      expect(s.flow.nodes.length).toBeGreaterThan(0)
    }
  })

  it('every seed has the starter tag', () => {
    for (const s of FLOW_TEMPLATE_SEEDS) {
      expect(s.tags).toContain('starter')
    }
  })

  it('findFlowTemplateSeed lookup is by id', () => {
    expect(findFlowTemplateSeed('blank-agent')?.title).toBe('Blank Agent')
    expect(findFlowTemplateSeed('does-not-exist')).toBeUndefined()
  })
})
