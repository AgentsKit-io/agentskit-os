import { describe, expect, it } from 'vitest'
import {
  Action,
  ResourceRef,
  parseCapability,
  safeParseCapability,
  parseAuthContext,
  safeParseAuthContext,
} from '../../src/auth/capability.js'

const issuer = { kind: 'user', id: 'usr_1', workspaceId: 'team-a' }

const validCap = {
  id: 'cap_1',
  resource: 'tool:web-search',
  actions: ['invoke'],
  issuer,
}

describe('Action', () => {
  it.each([['invoke'], ['read'], ['write_secret']])('accepts %s', (v) => {
    expect(Action.safeParse(v).success).toBe(true)
  })
  it.each([['Invoke'], ['has-hyphen'], ['']])('rejects %s', (v) => {
    expect(Action.safeParse(v).success).toBe(false)
  })
})

describe('ResourceRef', () => {
  it.each([['tool:web-search'], ['agent:researcher'], ['flow:pr-review:node:fetch']])(
    'accepts %s',
    (v) => {
      expect(ResourceRef.safeParse(v).success).toBe(true)
    },
  )
  it.each([['toolweb-search'], [':bad'], ['Tool:X']])('rejects %s', (v) => {
    expect(ResourceRef.safeParse(v).success).toBe(false)
  })
})

describe('Capability', () => {
  it('parses minimal capability', () => {
    const c = parseCapability(validCap)
    expect(c.id).toBe('cap_1')
    expect(c.delegatable).toBe(false)
  })

  it('parses with constraints + proof', () => {
    const c = parseCapability({
      ...validCap,
      delegatable: true,
      constraints: {
        rateLimit: { perMin: 30 },
        budget: { usd: 1, tokens: 10_000 },
        expiresAt: '2026-12-31T23:59:59.000Z',
      },
      proof: { algorithm: 'ed25519', publicKey: 'A'.repeat(64), signature: 'B'.repeat(64) },
    })
    expect(c.delegatable).toBe(true)
  })

  it('rejects empty actions', () => {
    expect(safeParseCapability({ ...validCap, actions: [] }).success).toBe(false)
  })

  it('rejects expired-at not ISO', () => {
    expect(
      safeParseCapability({ ...validCap, constraints: { expiresAt: 'soon' } }).success,
    ).toBe(false)
  })

  it('throws on parseCapability with invalid input', () => {
    expect(() => parseCapability({})).toThrow()
  })
})

describe('AuthContext', () => {
  it('parses with capabilities', () => {
    const ctx = parseAuthContext({ principal: issuer, capabilities: [validCap] })
    expect(ctx.capabilities).toHaveLength(1)
  })

  it('rejects too many capabilities', () => {
    const caps = Array.from({ length: 1025 }, (_, i) => ({ ...validCap, id: `cap_${i}` }))
    expect(safeParseAuthContext({ principal: issuer, capabilities: caps }).success).toBe(false)
  })
})
