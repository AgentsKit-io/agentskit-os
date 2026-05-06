import { describe, expect, it } from 'vitest'
import {
  createSandboxRegistry,
  type SandboxBackend,
} from '../../src/index.js'

const docker: SandboxBackend = {
  kind: 'docker',
  displayName: 'Docker',
  capabilities: ['fs_isolation', 'network_egress_off', 'memory_limit', 'cpu_limit', 'timeout'],
  validate: (spec) => (spec.command.length === 0 ? ['command must be non-empty'] : []),
  run: async () => ({ exitCode: 0, stdout: '', stderr: '', durationMs: 0 }),
}

const wc: SandboxBackend = {
  kind: 'webcontainer',
  displayName: 'WebContainer',
  capabilities: ['fs_isolation', 'timeout'],
  validate: () => [],
  run: async () => ({ exitCode: 0, stdout: '', stderr: '', durationMs: 0 }),
}

describe('sandbox registry (#190)', () => {
  it('register + list', () => {
    const r = createSandboxRegistry()
    expect(r.register(docker).kind).toBe('registered')
    expect(r.register(wc).kind).toBe('registered')
    expect(r.list().map((b) => b.kind).sort()).toEqual(['docker', 'webcontainer'])
  })

  it('reports conflict on duplicate kind', () => {
    const r = createSandboxRegistry()
    r.register(docker)
    expect(r.register({ ...docker, displayName: 'Other' }).kind).toBe('conflict')
  })

  it('pick returns first backend covering required capabilities', () => {
    const r = createSandboxRegistry()
    r.register(wc)
    r.register(docker)
    const picked = r.pick(['network_egress_off', 'memory_limit'])
    expect(picked?.kind).toBe('docker')
  })

  it('pick returns undefined when no backend covers', () => {
    const r = createSandboxRegistry()
    r.register(wc)
    expect(r.pick(['network_egress_off'])).toBeUndefined()
  })

  it('validate rejects empty command', () => {
    expect(docker.validate({ command: [], network: 'none', limits: {} })).toContain('command must be non-empty')
  })
})
