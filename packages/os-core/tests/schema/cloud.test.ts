import { describe, expect, it } from 'vitest'
import { parseCloudSyncConfig, safeParseCloudSyncConfig } from '../../src/schema/cloud.js'

describe('CloudSyncConfig', () => {
  it('parses defaults from empty object', () => {
    const c = parseCloudSyncConfig({})
    expect(c.enabled).toBe(false)
    expect(c.plan).toBe('free')
    expect(c.endpoint).toBe('https://cloud.agentskit.io')
    expect(c.strategy).toBe('manual')
    expect(c.sso.provider).toBe('none')
    expect(c.airGapped).toBe(false)
  })

  it('parses pro team config with seats', () => {
    const c = parseCloudSyncConfig({
      enabled: true,
      plan: 'team',
      apiKey: '${vault:cloud_key}',
      workspaceCloudId: 'ws_abc123',
      strategy: 'auto',
      intervalSeconds: 300,
      seats: [
        { email: 'a@x.com', role: 'admin' },
        { email: 'b@x.com', role: 'editor' },
      ],
    })
    expect(c.seats).toHaveLength(2)
    expect(c.intervalSeconds).toBe(300)
  })

  it('parses enterprise air-gapped with SSO', () => {
    const c = parseCloudSyncConfig({
      plan: 'enterprise',
      airGapped: true,
      sso: { provider: 'okta', domain: 'corp.example.com' },
    })
    expect(c.airGapped).toBe(true)
    expect(c.sso.provider).toBe('okta')
  })

  it('rejects unknown plan', () => {
    expect(safeParseCloudSyncConfig({ plan: 'platinum' }).success).toBe(false)
  })

  it('rejects malformed endpoint', () => {
    expect(safeParseCloudSyncConfig({ endpoint: 'not-url' }).success).toBe(false)
  })

  it('rejects intervalSeconds < 30', () => {
    expect(safeParseCloudSyncConfig({ intervalSeconds: 10 }).success).toBe(false)
  })

  it('rejects invalid email in seat', () => {
    expect(
      safeParseCloudSyncConfig({ seats: [{ email: 'not-email', role: 'admin' }] }).success,
    ).toBe(false)
  })

  it('rejects unknown role', () => {
    expect(
      safeParseCloudSyncConfig({ seats: [{ email: 'a@x.com', role: 'super' }] }).success,
    ).toBe(false)
  })

  it('rejects unknown sync strategy', () => {
    expect(safeParseCloudSyncConfig({ strategy: 'cosmic' }).success).toBe(false)
  })

  it('rejects unknown SSO provider', () => {
    expect(safeParseCloudSyncConfig({ sso: { provider: 'myspace' } }).success).toBe(false)
  })
})
