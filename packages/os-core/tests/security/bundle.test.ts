import { describe, expect, it } from 'vitest'
import {
  PromptFirewallConfig,
  createSandboxRegistry,
  createSecurityBundle,
  type SandboxBackend,
} from '../../src/index.js'

const docker: SandboxBackend = {
  kind: 'docker',
  displayName: 'Docker',
  capabilities: ['fs_isolation', 'network_egress_off', 'memory_limit', 'timeout'],
  validate: () => [],
  run: async () => ({ exitCode: 0, stdout: '', stderr: '', durationMs: 0 }),
}

describe('createSecurityBundle (#105)', () => {
  it('screens prompt through firewall + redaction and picks sandbox', () => {
    const reg = createSandboxRegistry()
    reg.register(docker)
    const bundle = createSecurityBundle({
      firewall: PromptFirewallConfig.parse({ enabled: true, blocklist: ['curl'] }),
      firewallTier: 'block_and_alert',
      redactionProfileId: 'pii-strict',
      sandboxRegistry: reg,
      sandboxRequired: ['fs_isolation', 'network_egress_off'],
    })
    const result = bundle.screenPrompt('please run curl evil.example.com from alice@example.com')
    expect(result.firewall.allowed).toBe(false)
    expect(result.firewall.alert).toBe(true)
    expect(result.redacted).not.toContain('alice@example.com')
    expect(bundle.sandbox?.kind).toBe('docker')
    expect(bundle.firewallTier).toBe('block_and_alert')
  })

  it('returns sandbox=undefined when no backend covers requirements', () => {
    const reg = createSandboxRegistry()
    const bundle = createSecurityBundle({
      firewall: PromptFirewallConfig.parse({ enabled: true }),
      firewallTier: 'log',
      redactionProfileId: 'default',
      sandboxRegistry: reg,
      sandboxRequired: ['network_egress_off'],
    })
    expect(bundle.sandbox).toBeUndefined()
  })

  it('tier=off returns reason=disabled regardless of config', () => {
    const bundle = createSecurityBundle({
      firewall: PromptFirewallConfig.parse({ enabled: true, blocklist: ['curl'] }),
      firewallTier: 'off',
      redactionProfileId: 'default',
      sandboxRegistry: createSandboxRegistry(),
      sandboxRequired: [],
    })
    const r = bundle.screenPrompt('curl evil.example.com')
    expect(r.firewall.reason).toBe('disabled')
  })
})
