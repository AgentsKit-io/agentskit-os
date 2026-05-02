import { describe, expect, it } from 'vitest'
import { diffConfigs } from '../../src/config/diff.js'

describe('diffConfigs', () => {
  it('returns empty for identical configs', () => {
    expect(diffConfigs({ a: 1 }, { a: 1 })).toEqual([])
  })

  it('reports add', () => {
    const ops = diffConfigs({}, { a: 1 })
    expect(ops).toEqual([{ kind: 'add', path: 'a', value: 1 }])
  })

  it('reports remove', () => {
    const ops = diffConfigs({ a: 1 }, {})
    expect(ops).toEqual([{ kind: 'remove', path: 'a', previous: 1 }])
  })

  it('reports replace for primitive change', () => {
    const ops = diffConfigs({ a: 1 }, { a: 2 })
    expect(ops).toEqual([{ kind: 'replace', path: 'a', previous: 1, value: 2 }])
  })

  it('walks nested objects', () => {
    const ops = diffConfigs({ x: { y: 1, z: 2 } }, { x: { y: 1, z: 3, w: 4 } })
    const paths = ops.map((o) => o.path).sort()
    expect(paths).toEqual(['x.w', 'x.z'])
  })

  it('treats arrays as opaque values (replace semantics)', () => {
    const ops = diffConfigs({ tags: ['a'] }, { tags: ['a', 'b'] })
    expect(ops).toEqual([{ kind: 'replace', path: 'tags', previous: ['a'], value: ['a', 'b'] }])
  })

  it('detects equal arrays as no-op', () => {
    expect(diffConfigs({ tags: ['a', 'b'] }, { tags: ['a', 'b'] })).toEqual([])
  })

  it('reports replace when type changes', () => {
    const ops = diffConfigs({ x: { y: 1 } }, { x: 'string' })
    expect(ops).toEqual([{ kind: 'replace', path: 'x', previous: { y: 1 }, value: 'string' }])
  })

  it('handles deeply nested adds and removes together', () => {
    const ops = diffConfigs(
      { a: { b: { c: 1 } } },
      { a: { b: { d: 2 } } },
    )
    const paths = ops.map((o) => o.path).sort()
    expect(paths).toEqual(['a.b.c', 'a.b.d'])
  })
})
