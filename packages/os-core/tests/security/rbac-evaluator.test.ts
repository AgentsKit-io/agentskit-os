import { describe, expect, it } from 'vitest'
import {
  TeamSeat,
  allowedActionsFor,
  evaluateRbac,
} from '../../src/index.js'

const seats = [
  TeamSeat.parse({ email: 'owner@x.com', role: 'owner' }),
  TeamSeat.parse({ email: 'admin@x.com', role: 'admin' }),
  TeamSeat.parse({ email: 'editor@x.com', role: 'editor' }),
  TeamSeat.parse({ email: 'viewer@x.com', role: 'viewer' }),
]

describe('evaluateRbac (#128)', () => {
  it('owner can manage billing', () => {
    expect(evaluateRbac(seats, { email: 'owner@x.com', action: 'billing.manage' }).allowed).toBe(true)
  })

  it('admin cannot manage billing', () => {
    const v = evaluateRbac(seats, { email: 'admin@x.com', action: 'billing.manage' })
    expect(v.allowed).toBe(false)
  })

  it('viewer can read but not write', () => {
    expect(evaluateRbac(seats, { email: 'viewer@x.com', action: 'workspace.read' }).allowed).toBe(true)
    expect(evaluateRbac(seats, { email: 'viewer@x.com', action: 'workspace.write' }).allowed).toBe(false)
  })

  it('seat_not_found fires for unknown email', () => {
    const v = evaluateRbac(seats, { email: 'ghost@x.com', action: 'workspace.read' })
    expect(v.allowed).toBe(false)
    if (!v.allowed) expect(v.reason).toBe('seat_not_found')
  })

  it('allowedActionsFor returns sorted set per role', () => {
    expect(allowedActionsFor('viewer')).toEqual(['workspace.read'])
    expect(allowedActionsFor('owner')).toContain('billing.manage')
  })
})
