import { describe, expect, it } from 'vitest'
import { MetaAgentSpec, childRoleMap } from '../../src/index.js'

describe('MetaAgentSpec (#97)', () => {
  it('parses minimal coordinator + children', () => {
    const spec = MetaAgentSpec.parse({
      id: 'meta-router',
      coordinator: 'router',
      children: [
        { agent: 'planner', role: 'planner' },
        { agent: 'coder', role: 'coder', brief: 'Write code only.' },
      ],
    })
    expect(spec.strategy).toBe('auto')
    expect(spec.maxIterations).toBe(8)
    expect(spec.shareScratchpad).toBe(true)
  })

  it('rejects empty children list', () => {
    const r = MetaAgentSpec.safeParse({
      id: 'm',
      coordinator: 'c',
      children: [],
    })
    expect(r.success).toBe(false)
  })

  it('childRoleMap indexes by role', () => {
    const spec = MetaAgentSpec.parse({
      id: 'm',
      coordinator: 'c',
      children: [
        { agent: 'a', role: 'planner' },
        { agent: 'b', role: 'reviewer' },
      ],
    })
    const m = childRoleMap(spec)
    expect(m.get('reviewer')?.agent).toBe('b')
  })
})
