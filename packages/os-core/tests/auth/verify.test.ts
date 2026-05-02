import { describe, expect, it } from 'vitest'
import type { AuthContext, Capability } from '../../src/auth/capability.js'
import { verifyCapability } from '../../src/auth/verify.js'

const issuer = { kind: 'user', id: 'usr_1', workspaceId: 'team-a' } as const

const cap = (over: Partial<Capability>): Capability =>
  ({
    id: over.id ?? 'cap_1',
    resource: over.resource ?? 'tool:web-search',
    actions: over.actions ?? ['invoke'],
    delegatable: false,
    issuer: issuer as any,
    ...over,
  }) as Capability

const ctx = (caps: Capability[]): AuthContext =>
  ({ principal: issuer as any, capabilities: caps }) as AuthContext

describe('verifyCapability', () => {
  it('allows exact resource + action match', () => {
    const d = verifyCapability(ctx([cap({})]), 'invoke', 'tool:web-search')
    expect(d.kind).toBe('allow')
  })

  it('denies unknown action', () => {
    const d = verifyCapability(ctx([cap({})]), 'delete', 'tool:web-search')
    expect(d.kind).toBe('deny')
  })

  it('denies unknown resource', () => {
    const d = verifyCapability(ctx([cap({})]), 'invoke', 'tool:other')
    expect(d.kind).toBe('deny')
  })

  it('matches segment-wildcard', () => {
    const d = verifyCapability(ctx([cap({ resource: 'flow:*' })]), 'invoke', 'flow:pr-review')
    expect(d.kind).toBe('allow')
  })

  it('matches deep wildcard with trailing star', () => {
    const d = verifyCapability(
      ctx([cap({ resource: 'flow:*' })]),
      'invoke',
      'flow:pr-review:node:n1',
    )
    expect(d.kind).toBe('allow')
  })

  it('does not match across mismatched prefix', () => {
    const d = verifyCapability(ctx([cap({ resource: 'flow:*' })]), 'invoke', 'tool:foo')
    expect(d.kind).toBe('deny')
  })

  it('denies expired capability when only expired matches', () => {
    const expired = cap({
      constraints: { expiresAt: '2000-01-01T00:00:00.000Z' },
    })
    const d = verifyCapability(ctx([expired]), 'invoke', 'tool:web-search')
    expect(d.kind).toBe('deny')
    if (d.kind === 'deny') expect(d.reason).toContain('expired')
  })

  it('prefers a non-expired matching cap when multiple match', () => {
    const expired = cap({ id: 'old', constraints: { expiresAt: '2000-01-01T00:00:00.000Z' } })
    const valid = cap({ id: 'fresh' })
    const d = verifyCapability(ctx([expired, valid]), 'invoke', 'tool:web-search')
    expect(d.kind).toBe('allow')
    if (d.kind === 'allow') expect(d.capability.id).toBe('fresh')
  })

  it('respects injected `now` for expiry', () => {
    const future = cap({ constraints: { expiresAt: '2030-01-01T00:00:00.000Z' } })
    const d1 = verifyCapability(ctx([future]), 'invoke', 'tool:web-search', new Date('2030-06-01T00:00:00.000Z'))
    expect(d1.kind).toBe('deny')
    const d2 = verifyCapability(ctx([future]), 'invoke', 'tool:web-search', new Date('2026-01-01T00:00:00.000Z'))
    expect(d2.kind).toBe('allow')
  })

  it('denies empty capability list', () => {
    const d = verifyCapability(ctx([]), 'invoke', 'tool:web-search')
    expect(d.kind).toBe('deny')
  })

  it('denies wildcard mid-segment when remaining segments differ', () => {
    const d = verifyCapability(
      ctx([cap({ resource: 'flow:*:node' })]),
      'invoke',
      'flow:pr-review:other',
    )
    expect(d.kind).toBe('deny')
  })
})
