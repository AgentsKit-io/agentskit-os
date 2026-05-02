import { describe, expect, it } from 'vitest'
import { hashEvent } from '../src/event-hash.js'
import { fakeEvent } from './_helpers.js'

describe('hashEvent', () => {
  it('produces 64-hex eventHash', async () => {
    const ref = await hashEvent(fakeEvent())
    expect(ref.eventHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('preserves event id', async () => {
    const e = fakeEvent({ id: '01HXYZTPGGJTZ3WBPJN3XKXQ7N' as any })
    const ref = await hashEvent(e as any)
    expect(ref.eventId).toBe('01HXYZTPGGJTZ3WBPJN3XKXQ7N')
  })

  it('different events yield different hashes', async () => {
    const a = await hashEvent(fakeEvent({ data: { x: 1 } as any }))
    const b = await hashEvent(fakeEvent({ data: { x: 2 } as any }))
    expect(a.eventHash).not.toBe(b.eventHash)
  })

  it('same event yields same hash regardless of key order', async () => {
    const e1 = fakeEvent({ data: { a: 1, b: 2 } as any, id: '01HXYZTPGGJTZ3WBPJN3XKXQ7N' as any })
    const e2 = fakeEvent({ data: { b: 2, a: 1 } as any, id: '01HXYZTPGGJTZ3WBPJN3XKXQ7N' as any })
    const h1 = await hashEvent(e1 as any)
    const h2 = await hashEvent(e2 as any)
    expect(h1.eventHash).toBe(h2.eventHash)
  })
})
