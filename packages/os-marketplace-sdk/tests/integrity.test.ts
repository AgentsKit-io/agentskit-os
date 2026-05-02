import { describe, expect, it } from 'vitest'
import {
  canonicalJson,
  sha256OfBytes,
  sha256OfCanonical,
  sha512OfBytes,
  sha512OfCanonical,
  verifyIntegrity,
} from '../src/index.js'

describe('canonicalJson', () => {
  it('sorts keys deterministically', () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}')
  })
  it('walks nested objects + arrays', () => {
    expect(canonicalJson({ x: [{ z: 3, y: 2 }] })).toBe('{"x":[{"y":2,"z":3}]}')
  })
})

describe('sha256OfBytes', () => {
  it('returns sha256:<hex64>', async () => {
    const h = await sha256OfBytes(new TextEncoder().encode('hello'))
    expect(h).toMatch(/^sha256:[0-9a-f]{64}$/)
  })
  it('deterministic for same input', async () => {
    const h1 = await sha256OfBytes(new TextEncoder().encode('hello'))
    const h2 = await sha256OfBytes(new TextEncoder().encode('hello'))
    expect(h1).toBe(h2)
  })
})

describe('sha512OfBytes', () => {
  it('returns sha512:<hex128>', async () => {
    const h = await sha512OfBytes(new TextEncoder().encode('hello'))
    expect(h).toMatch(/^sha512:[0-9a-f]{128}$/)
  })
})

describe('sha256OfCanonical / sha512OfCanonical', () => {
  it('order-invariant for objects', async () => {
    const h1 = await sha256OfCanonical({ a: 1, b: 2 })
    const h2 = await sha256OfCanonical({ b: 2, a: 1 })
    expect(h1).toBe(h2)
  })
  it('different content yields different hash', async () => {
    const a = await sha512OfCanonical({ x: 1 })
    const b = await sha512OfCanonical({ x: 2 })
    expect(a).not.toBe(b)
  })
})

describe('verifyIntegrity', () => {
  it('exact match', () => {
    expect(verifyIntegrity('sha256:abc', 'sha256:abc')).toBe(true)
  })
  it('mismatch', () => {
    expect(verifyIntegrity('sha256:abc', 'sha256:def')).toBe(false)
  })
})
