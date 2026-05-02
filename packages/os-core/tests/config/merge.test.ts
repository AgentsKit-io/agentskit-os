import { describe, expect, it } from 'vitest'
import {
  CONFIG_LAYERS,
  buildProvenance,
  mergeLayers,
} from '../../src/config/merge.js'

describe('CONFIG_LAYERS order', () => {
  it('matches ADR-0003 precedence', () => {
    expect(CONFIG_LAYERS).toEqual(['defaults', 'global', 'workspace', 'env', 'runtime'])
  })
})

describe('mergeLayers', () => {
  it('returns empty object when no inputs', () => {
    expect(mergeLayers({})).toEqual({})
  })

  it('returns single layer unchanged', () => {
    expect(mergeLayers({ defaults: { a: 1 } as any })).toEqual({ a: 1 })
  })

  it('higher layers override lower', () => {
    const out = mergeLayers<{ a: number; b: number }>({
      defaults: { a: 1, b: 2 },
      runtime: { a: 99 },
    })
    expect(out).toEqual({ a: 99, b: 2 })
  })

  it('deeply merges plain objects', () => {
    const out = mergeLayers<{ x: { y: { z: number; w: number } } }>({
      defaults: { x: { y: { z: 1, w: 1 } } },
      workspace: { x: { y: { z: 2 } } },
    })
    expect(out).toEqual({ x: { y: { z: 2, w: 1 } } })
  })

  it('arrays replace, not concatenate', () => {
    const out = mergeLayers<{ tags: string[] }>({
      defaults: { tags: ['a', 'b'] },
      runtime: { tags: ['c'] },
    })
    expect(out).toEqual({ tags: ['c'] })
  })

  it('respects layer precedence end-to-end', () => {
    const out = mergeLayers<{ k: string }>({
      defaults: { k: 'd' },
      global: { k: 'g' },
      workspace: { k: 'w' },
      env: { k: 'e' },
      runtime: { k: 'r' },
    })
    expect(out.k).toBe('r')
  })

  it('skips undefined layer values', () => {
    const out = mergeLayers<{ k: string }>({
      defaults: { k: 'd' },
      runtime: undefined,
    })
    expect(out).toEqual({ k: 'd' })
  })

  it('replaces non-object with object cleanly', () => {
    const out = mergeLayers<{ x: { y: number } | number }>({
      defaults: { x: 5 } as any,
      runtime: { x: { y: 1 } } as any,
    })
    expect(out).toEqual({ x: { y: 1 } })
  })
})

describe('buildProvenance', () => {
  it('reports the highest-priority layer per leaf', () => {
    const prov = buildProvenance({
      defaults: { a: 1, b: 1, c: 1 } as any,
      workspace: { b: 2 } as any,
      runtime: { a: 9 } as any,
    })
    expect(prov.get('a')?.layer).toBe('runtime')
    expect(prov.get('b')?.layer).toBe('workspace')
    expect(prov.get('c')?.layer).toBe('defaults')
  })

  it('walks deep paths', () => {
    const prov = buildProvenance({
      defaults: { x: { y: 1 } } as any,
      workspace: { x: { y: 2, z: 3 } } as any,
    })
    expect(prov.get('x.y')?.layer).toBe('workspace')
    expect(prov.get('x.z')?.layer).toBe('workspace')
  })

  it('treats arrays as leaves (replace semantics)', () => {
    const prov = buildProvenance({
      defaults: { tags: ['a'] } as any,
      runtime: { tags: ['b'] } as any,
    })
    expect(prov.get('tags')?.layer).toBe('runtime')
    expect(prov.get('tags.0')).toBeUndefined()
  })

  it('returns empty map when no inputs', () => {
    expect(buildProvenance({}).size).toBe(0)
  })
})
