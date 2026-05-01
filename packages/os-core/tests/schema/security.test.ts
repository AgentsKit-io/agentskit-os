import { describe, expect, it } from 'vitest'
import { parseSecurityConfig, safeParseSecurityConfig } from '../../src/schema/security.js'

describe('SecurityConfig', () => {
  it('parses with full defaults from empty object', () => {
    const s = parseSecurityConfig({})
    expect(s.firewall.enabled).toBe(true)
    expect(s.piiRedaction.mode).toBe('mask')
    expect(s.sandbox.backend).toBe('e2b')
    expect(s.sandbox.network).toBe('none')
    expect(s.auditLog.signing).toBe('ed25519')
    expect(s.requireSignedPlugins).toBe(false)
  })

  it('overrides nested config', () => {
    const s = parseSecurityConfig({
      firewall: { enabled: false, blocklist: ['ignore previous'] },
      piiRedaction: { mode: 'remove', categories: ['ssn'] },
      sandbox: { backend: 'docker', network: 'restricted', memoryLimitMb: 1024 },
      auditLog: { signing: 'hmac-sha256', retentionDays: 90 },
      requireSignedPlugins: true,
    })
    expect(s.firewall.enabled).toBe(false)
    expect(s.piiRedaction.mode).toBe('remove')
    expect(s.sandbox.backend).toBe('docker')
  })

  it('rejects unknown PII category', () => {
    expect(
      safeParseSecurityConfig({ piiRedaction: { categories: ['biometric'] } }).success,
    ).toBe(false)
  })

  it('rejects empty PII categories', () => {
    expect(safeParseSecurityConfig({ piiRedaction: { categories: [] } }).success).toBe(false)
  })

  it('rejects sandbox timeout out of range', () => {
    expect(safeParseSecurityConfig({ sandbox: { timeoutMs: 600_001 } }).success).toBe(false)
  })

  it('rejects unknown sandbox backend', () => {
    expect(safeParseSecurityConfig({ sandbox: { backend: 'firecracker' } }).success).toBe(false)
  })

  it('rejects unknown audit-log signing scheme', () => {
    expect(safeParseSecurityConfig({ auditLog: { signing: 'rsa' } }).success).toBe(false)
  })

  it('rejects retentionDays < 1', () => {
    expect(safeParseSecurityConfig({ auditLog: { retentionDays: 0 } }).success).toBe(false)
  })
})
