import { describe, expect, it } from 'vitest'
import { buildShareLink, evaluateShareLink } from '../../src/index.js'

const NOW = 1_700_000_000_000
const HOUR = 60 * 60_000

describe('share link (#175)', () => {
  it('passes within TTL window', () => {
    const link = buildShareLink({
      id: 'abc', scope: 'flow', resourceId: 'flow-1', issuedBy: 'rebeca',
      ttlMs: HOUR, clock: () => NOW,
    })
    const v = evaluateShareLink(link, { scope: 'flow', resourceId: 'flow-1' }, { clock: () => NOW + 1000 })
    expect(v.ok).toBe(true)
  })

  it('expires after TTL elapses', () => {
    const link = buildShareLink({
      id: 'a', scope: 'flow', resourceId: 'f', issuedBy: 'r',
      ttlMs: HOUR, clock: () => NOW,
    })
    const v = evaluateShareLink(link, { scope: 'flow', resourceId: 'f' }, { clock: () => NOW + 2 * HOUR })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.reason).toBe('expired')
  })

  it('rejects scope or resource mismatch', () => {
    const link = buildShareLink({
      id: 'a', scope: 'flow', resourceId: 'f', issuedBy: 'r',
      ttlMs: HOUR, clock: () => NOW,
    })
    expect(
      evaluateShareLink(link, { scope: 'agent', resourceId: 'f' }, { clock: () => NOW }),
    ).toMatchObject({ ok: false, reason: 'scope_mismatch' })
    expect(
      evaluateShareLink(link, { scope: 'flow', resourceId: 'wrong' }, { clock: () => NOW }),
    ).toMatchObject({ ok: false, reason: 'resource_mismatch' })
  })

  it('rejects ttl that is zero or > 30 days', () => {
    expect(() => buildShareLink({
      id: 'a', scope: 'flow', resourceId: 'f', issuedBy: 'r', ttlMs: 0,
    })).toThrow()
    expect(() => buildShareLink({
      id: 'a', scope: 'flow', resourceId: 'f', issuedBy: 'r', ttlMs: 60 * 24 * 60 * 60_000,
    })).toThrow(/exceeds/)
  })
})
