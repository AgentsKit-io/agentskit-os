import { describe, expect, it } from 'vitest'
import { parsePrincipal, safeParsePrincipal } from '../../src/auth/principal.js'

describe('Principal discriminated union', () => {
  it('parses user principal', () => {
    const p = parsePrincipal({ kind: 'user', id: 'usr_1', workspaceId: 'team-a' })
    expect((p as any).kind).toBe('user')
  })

  it('parses plugin principal with signature', () => {
    const p = parsePrincipal({
      kind: 'plugin',
      id: 'web-search',
      workspaceId: 'team-a',
      signature: { algorithm: 'ed25519', publicKey: 'A'.repeat(64), signature: 'B'.repeat(64) },
    })
    expect((p as any).kind).toBe('plugin')
  })

  it('parses system principal', () => {
    const p = parsePrincipal({ kind: 'system', id: 'os-core' })
    expect((p as any).kind).toBe('system')
  })

  it('parses trigger principal', () => {
    const p = parsePrincipal({ kind: 'trigger', id: 'cron_daily', workspaceId: 'team-a' })
    expect((p as any).kind).toBe('trigger')
  })

  it('parses service principal', () => {
    const p = parsePrincipal({ kind: 'service', id: 'svc_1', workspaceId: 'team-a' })
    expect((p as any).kind).toBe('service')
  })

  it('rejects plugin missing signature', () => {
    expect(
      safeParsePrincipal({ kind: 'plugin', id: 'x', workspaceId: 'team-a' }).success,
    ).toBe(false)
  })

  it('rejects system principal with unknown id', () => {
    expect(safeParsePrincipal({ kind: 'system', id: 'os-rocket' }).success).toBe(false)
  })

  it('rejects unknown kind', () => {
    expect(safeParsePrincipal({ kind: 'alien', id: 'x' }).success).toBe(false)
  })

  it('throws on parsePrincipal with invalid input', () => {
    expect(() => parsePrincipal({})).toThrow()
  })
})
