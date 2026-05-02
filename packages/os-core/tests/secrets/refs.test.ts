import { describe, expect, it } from 'vitest'
import { findVaultRefs, resolveVaultRefs } from '../../src/secrets/refs.js'

describe('findVaultRefs', () => {
  it('returns empty for non-string input', () => {
    expect(findVaultRefs(42)).toEqual([])
    expect(findVaultRefs(null)).toEqual([])
  })

  it('finds single ref', () => {
    expect(findVaultRefs('${vault:openai_key}')).toEqual(['openai_key'])
  })

  it('finds nested refs in objects + arrays + dedupes', () => {
    const refs = findVaultRefs({
      a: '${vault:k1}',
      b: ['${vault:k2}', { c: '${vault:k1}' }],
    })
    expect([...refs].sort()).toEqual(['k1', 'k2'])
  })

  it('ignores malformed refs', () => {
    expect(findVaultRefs('${vault:UPPER}')).toEqual([])
    expect(findVaultRefs('vault:foo')).toEqual([])
  })
})

describe('resolveVaultRefs', () => {
  it('substitutes string values', async () => {
    const r = await resolveVaultRefs('${vault:k}', () => 'secret')
    expect(r.output).toBe('secret')
    expect(r.resolvedKeys).toEqual(['k'])
    expect(r.missingKeys).toEqual([])
  })

  it('substitutes inside larger strings', async () => {
    const r = await resolveVaultRefs('Bearer ${vault:token}!', () => 'abc')
    expect(r.output).toBe('Bearer abc!')
  })

  it('walks objects + arrays', async () => {
    const input = { a: '${vault:k1}', b: ['${vault:k2}', '${vault:k1}'] }
    const r = await resolveVaultRefs(input, (k) => (k === 'k1' ? 'V1' : 'V2'))
    expect(r.output).toEqual({ a: 'V1', b: ['V2', 'V1'] })
    expect([...r.resolvedKeys].sort()).toEqual(['k1', 'k2'])
  })

  it('records missing keys instead of failing', async () => {
    const r = await resolveVaultRefs('${vault:gone}', () => undefined)
    expect(r.output).toBe('${vault:gone}')
    expect(r.missingKeys).toEqual(['gone'])
    expect(r.resolvedKeys).toEqual([])
  })

  it('caches resolver calls', async () => {
    let calls = 0
    const resolver = (k: string) => {
      calls++
      return k
    }
    await resolveVaultRefs(['${vault:k}', '${vault:k}', { x: '${vault:k}' }], resolver)
    expect(calls).toBe(1)
  })

  it('supports async resolver', async () => {
    const r = await resolveVaultRefs('${vault:k}', async () => 'late')
    expect(r.output).toBe('late')
  })

  it('preserves non-string leaves', async () => {
    const r = await resolveVaultRefs({ a: 42, b: true, c: null }, () => 'x')
    expect(r.output).toEqual({ a: 42, b: true, c: null })
  })
})
