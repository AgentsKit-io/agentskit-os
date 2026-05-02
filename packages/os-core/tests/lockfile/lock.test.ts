import { describe, expect, it } from 'vitest'
import {
  LOCKFILE_VERSION,
  canonicalJson,
  detectLockDrift,
  parseLockfile,
  safeParseLockfile,
  sha256OfCanonical,
  type Lockfile,
} from '../../src/lockfile/lock.js'

const SHA256 = 'sha256:' + 'a'.repeat(64)
const SHA256B = 'sha256:' + 'b'.repeat(64)
const SHA512 = 'sha512:' + '0'.repeat(128)

const validLock: Lockfile = {
  lockfileVersion: LOCKFILE_VERSION,
  generatedAt: '2026-05-01T12:00:00.000Z',
  generatedBy: 'agentskit-os/0.1.0',
  workspace: {
    id: 'team-a',
    configHash: SHA256,
    configPath: 'agentskit-os.config.yaml',
  },
  plugins: [
    {
      id: 'gh-bot',
      version: '1.4.2',
      source: 'marketplace:gh-bot',
      integrity: SHA512,
      resolvedAt: '2026-05-01T12:00:00.000Z',
      contributes: ['tool', 'trigger'],
      permissions: ['net:fetch:api.github.com:invoke'],
    },
  ],
  agents: [],
  flows: [],
  providers: [],
  tools: [],
  templates: [],
  schemas: { osCore: '0.1.0', workspaceConfig: 1 },
  tags: [],
}

describe('Lockfile schema', () => {
  it('parses minimal lockfile', () => {
    const l = parseLockfile(validLock)
    expect(l.lockfileVersion).toBe(1)
    expect(l.plugins).toHaveLength(1)
  })

  it('rejects bad sha256 format', () => {
    expect(
      safeParseLockfile({
        ...validLock,
        workspace: { ...validLock.workspace, configHash: 'sha256:short' },
      }).success,
    ).toBe(false)
  })

  it('rejects sha512 short', () => {
    expect(
      safeParseLockfile({
        ...validLock,
        plugins: [{ ...validLock.plugins[0]!, integrity: 'sha512:short' }],
      }).success,
    ).toBe(false)
  })

  it('rejects unsupported lockfileVersion', () => {
    expect(safeParseLockfile({ ...validLock, lockfileVersion: 99 }).success).toBe(false)
  })

  it('rejects bad SemVer in plugin version', () => {
    expect(
      safeParseLockfile({
        ...validLock,
        plugins: [{ ...validLock.plugins[0]!, version: '1.4' }],
      }).success,
    ).toBe(false)
  })

  it('rejects empty plugin contributes', () => {
    expect(
      safeParseLockfile({
        ...validLock,
        plugins: [{ ...validLock.plugins[0]!, contributes: [] }],
      }).success,
    ).toBe(false)
  })

  it('rejects bad bottom-level workspaceConfig version', () => {
    expect(
      safeParseLockfile({ ...validLock, schemas: { osCore: '0.1.0', workspaceConfig: 0 } }).success,
    ).toBe(false)
  })

  it('throws on parseLockfile with invalid input', () => {
    expect(() => parseLockfile({})).toThrow()
  })
})

describe('canonicalJson', () => {
  it('sorts keys deterministically', () => {
    const a = canonicalJson({ b: 2, a: 1 })
    const b = canonicalJson({ a: 1, b: 2 })
    expect(a).toBe(b)
    expect(a).toBe('{"a":1,"b":2}')
  })

  it('walks nested objects + arrays', () => {
    const out = canonicalJson({ x: [{ z: 3, y: 2 }] })
    expect(out).toBe('{"x":[{"y":2,"z":3}]}')
  })
})

describe('sha256OfCanonical', () => {
  it('different content yields different hashes', async () => {
    const h1 = await sha256OfCanonical({ a: 1 })
    const h2 = await sha256OfCanonical({ a: 2 })
    expect(h1).not.toBe(h2)
  })

  it('same content yields same hash regardless of key order', async () => {
    const h1 = await sha256OfCanonical({ a: 1, b: 2 })
    const h2 = await sha256OfCanonical({ b: 2, a: 1 })
    expect(h1).toBe(h2)
  })

  it('matches sha256:<hex64> format', async () => {
    const h = await sha256OfCanonical({})
    expect(h).toMatch(/^sha256:[0-9a-f]{64}$/)
  })
})

describe('detectLockDrift', () => {
  it('clean state reports no issues', () => {
    const issues = detectLockDrift({
      lock: validLock,
      currentConfigHash: SHA256,
      installedPlugins: [{ id: 'gh-bot', version: '1.4.2' }],
    })
    expect(issues).toEqual([])
  })

  it('detects config hash mismatch', () => {
    const issues = detectLockDrift({
      lock: validLock,
      currentConfigHash: SHA256B,
      installedPlugins: [{ id: 'gh-bot', version: '1.4.2' }],
    })
    expect(issues[0]?.code).toBe('config_hash_mismatch')
  })

  it('detects plugin version mismatch', () => {
    const issues = detectLockDrift({
      lock: validLock,
      currentConfigHash: SHA256,
      installedPlugins: [{ id: 'gh-bot', version: '1.4.3' }],
    })
    expect(issues[0]?.code).toBe('plugin_version_mismatch')
  })

  it('detects plugin missing in workspace', () => {
    const issues = detectLockDrift({
      lock: validLock,
      currentConfigHash: SHA256,
      installedPlugins: [],
    })
    expect(issues.find((i) => i.code === 'plugin_missing_in_workspace')).toBeDefined()
  })

  it('detects plugin missing in lock', () => {
    const issues = detectLockDrift({
      lock: validLock,
      currentConfigHash: SHA256,
      installedPlugins: [
        { id: 'gh-bot', version: '1.4.2' },
        { id: 'new-plugin', version: '1.0.0' },
      ],
    })
    expect(issues.find((i) => i.code === 'plugin_missing_in_lock')).toBeDefined()
  })

  it('detects agent content drift', () => {
    const lockWithAgent: Lockfile = {
      ...validLock,
      agents: [
        {
          id: 'researcher',
          version: '0.3.0',
          contentHash: SHA256,
          model: { provider: 'anthropic', name: 'claude', pinnedVersion: 'snap-1' },
        },
      ],
    }
    const issues = detectLockDrift({
      lock: lockWithAgent,
      currentConfigHash: SHA256,
      installedPlugins: [{ id: 'gh-bot', version: '1.4.2' }],
      currentAgentHashes: new Map([['researcher', SHA256B]]),
    })
    expect(issues.find((i) => i.code === 'agent_content_drift')).toBeDefined()
  })

  it('detects flow content drift', () => {
    const lockWithFlow: Lockfile = {
      ...validLock,
      flows: [
        {
          id: 'pr-review',
          version: '0.2.1',
          contentHash: SHA256,
          nodes: [{ id: 'fetch', kind: 'tool', toolRef: 'gh.read', toolVersion: '1.0.0' }],
        },
      ],
    }
    const issues = detectLockDrift({
      lock: lockWithFlow,
      currentConfigHash: SHA256,
      installedPlugins: [{ id: 'gh-bot', version: '1.4.2' }],
      currentFlowHashes: new Map([['pr-review', SHA256B]]),
    })
    expect(issues.find((i) => i.code === 'flow_content_drift')).toBeDefined()
  })
})
