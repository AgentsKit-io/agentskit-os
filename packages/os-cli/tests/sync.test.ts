import { describe, expect, it, vi } from 'vitest'
import { route } from '../src/router.js'
import { runSync, computeDrift, type Synchronizer, type InstalledPackage } from '../src/commands/sync.js'
import { fakeIo } from './_fake-io.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid lockfile YAML with one plugin entry. */
const makeLockfileYaml = (plugins: Array<{ id: string; version: string }> = []) => {
  const pluginEntries = plugins
    .map(
      (p) => `
  - id: ${p.id}
    version: ${p.version}
    source: npm:@agentskit/${p.id}
    integrity: sha512:${'a'.repeat(128)}
    resolvedAt: "2024-01-01T00:00:00Z"
    contributes:
      - tool
    permissions: []`,
    )
    .join('')

  return `lockfileVersion: 1
generatedAt: "2024-01-01T00:00:00Z"
generatedBy: agentskit-os/1.0.0
workspace:
  id: test-workspace
  configHash: sha256:${'a'.repeat(64)}
  configPath: /work/agentskit-os.yaml
plugins:${pluginEntries || ' []'}
agents: []
flows: []
providers: []
tools: []
templates: []
schemas:
  osCore: 0.0.0
  workspaceConfig: 1
tags: []
`
}

/** Fake synchronizer builder. */
const fakeSynchronizer = (
  installed: InstalledPackage[],
  installFn?: (pkgs: readonly InstalledPackage[]) => Promise<void>,
): Synchronizer & { installCalls: InstalledPackage[][] } => {
  const installCalls: InstalledPackage[][] = []
  return {
    installCalls,
    async listInstalled() {
      return installed
    },
    async install(pkgs) {
      installCalls.push([...pkgs])
      if (installFn) await installFn(pkgs)
      // Default: update installed list to reflect the install
      for (const p of pkgs) {
        const idx = installed.findIndex((i) => i.id === p.id)
        if (idx >= 0) {
          installed[idx] = p
        } else {
          installed.push(p)
        }
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Unit tests for computeDrift
// ---------------------------------------------------------------------------

describe('computeDrift', () => {
  const lockfilePlugins = [
    {
      id: 'web-search',
      version: '1.0.0',
      source: 'npm:x',
      integrity: `sha512:${'a'.repeat(128)}`,
      resolvedAt: '2024-01-01T00:00:00Z',
      contributes: ['tool'],
      permissions: [],
    },
    {
      id: 'summarizer',
      version: '2.0.0',
      source: 'npm:y',
      integrity: `sha512:${'b'.repeat(128)}`,
      resolvedAt: '2024-01-01T00:00:00Z',
      contributes: ['tool'],
      permissions: [],
    },
  ]

  it('returns empty when all match', () => {
    const installed: InstalledPackage[] = [
      { id: 'web-search', version: '1.0.0', kind: 'plugin' },
      { id: 'summarizer', version: '2.0.0', kind: 'plugin' },
    ]
    expect(computeDrift(lockfilePlugins, installed, 'all')).toHaveLength(0)
  })

  it('reports drift when version mismatches', () => {
    const installed: InstalledPackage[] = [
      { id: 'web-search', version: '0.9.0', kind: 'plugin' },
      { id: 'summarizer', version: '2.0.0', kind: 'plugin' },
    ]
    const result = computeDrift(lockfilePlugins, installed, 'all')
    expect(result).toHaveLength(1)
    expect(result[0]?.code).toBe('os.cli.sync_drift')
    if (result[0]?.code === 'os.cli.sync_drift') {
      expect(result[0].id).toBe('web-search')
      expect(result[0].expected).toBe('1.0.0')
      expect(result[0].actual).toBe('0.9.0')
    }
  })

  it('reports drift when plugin is missing', () => {
    const installed: InstalledPackage[] = [
      { id: 'summarizer', version: '2.0.0', kind: 'plugin' },
    ]
    const result = computeDrift(lockfilePlugins, installed, 'all')
    expect(result).toHaveLength(1)
    expect(result[0]?.code).toBe('os.cli.sync_drift')
    if (result[0]?.code === 'os.cli.sync_drift') {
      expect(result[0].id).toBe('web-search')
      expect(result[0].actual).toBeUndefined()
    }
  })

  it('reports extra plugin not in lockfile', () => {
    const installed: InstalledPackage[] = [
      { id: 'web-search', version: '1.0.0', kind: 'plugin' },
      { id: 'summarizer', version: '2.0.0', kind: 'plugin' },
      { id: 'extra-plugin', version: '3.0.0', kind: 'plugin' },
    ]
    const result = computeDrift(lockfilePlugins, installed, 'all')
    expect(result).toHaveLength(1)
    expect(result[0]?.code).toBe('os.cli.sync_extra')
  })

  it('--plugins-only skips core entries', () => {
    const installed: InstalledPackage[] = [
      { id: 'web-search', version: '1.0.0', kind: 'plugin' },
      { id: 'summarizer', version: '2.0.0', kind: 'plugin' },
      { id: 'os-runtime', version: '1.0.0', kind: 'core' },
    ]
    const result = computeDrift(lockfilePlugins, installed, 'plugins-only')
    // core entry should not trigger 'extra' report
    expect(result.every((d) => d.id !== 'os-runtime')).toBe(true)
  })

  it('--core-only skips plugin locked entries', () => {
    const installed: InstalledPackage[] = []
    // With core-only, locked plugins are skipped, so no drift
    const result = computeDrift(lockfilePlugins, installed, 'core-only')
    expect(result).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// runSync integration tests
// ---------------------------------------------------------------------------

describe('runSync — in-sync workspace', () => {
  it('exits 0 when workspace matches lockfile', async () => {
    const lockYaml = makeLockfileYaml([{ id: 'web-search', version: '1.0.0' }])
    const io = fakeIo({ '/work/agentskit-os.lock': lockYaml })
    const sync = fakeSynchronizer([{ id: 'web-search', version: '1.0.0', kind: 'plugin' }])
    const r = await runSync([], io, { synchronizer: sync })
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('in sync')
  })

  it('--check exits 0 when in sync', async () => {
    const lockYaml = makeLockfileYaml([{ id: 'web-search', version: '1.0.0' }])
    const io = fakeIo({ '/work/agentskit-os.lock': lockYaml })
    const sync = fakeSynchronizer([{ id: 'web-search', version: '1.0.0', kind: 'plugin' }])
    const r = await runSync(['--check'], io, { synchronizer: sync })
    expect(r.code).toBe(0)
  })
})

describe('runSync — drift detected', () => {
  it('exits 1 with drift message when version differs', async () => {
    const lockYaml = makeLockfileYaml([{ id: 'web-search', version: '1.0.0' }])
    const io = fakeIo({ '/work/agentskit-os.lock': lockYaml })
    const sync = fakeSynchronizer([{ id: 'web-search', version: '0.9.0', kind: 'plugin' }])
    const r = await runSync([], io, { synchronizer: sync })
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('os.cli.sync_drift')
    expect(r.stderr).toContain('web-search')
  })

  it('exits 1 when plugin is completely missing', async () => {
    const lockYaml = makeLockfileYaml([{ id: 'web-search', version: '1.0.0' }])
    const io = fakeIo({ '/work/agentskit-os.lock': lockYaml })
    const sync = fakeSynchronizer([])
    const r = await runSync([], io, { synchronizer: sync })
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('missing')
  })
})

describe('runSync — --apply', () => {
  it('calls install and exits 0 when drift resolved', async () => {
    const lockYaml = makeLockfileYaml([{ id: 'web-search', version: '1.0.0' }])
    const io = fakeIo({ '/work/agentskit-os.lock': lockYaml })
    const installed: InstalledPackage[] = [{ id: 'web-search', version: '0.9.0', kind: 'plugin' }]
    const sync = fakeSynchronizer(installed)
    const r = await runSync(['--apply'], io, { synchronizer: sync })
    expect(r.code).toBe(0)
    expect(sync.installCalls).toHaveLength(1)
    expect(sync.installCalls[0]?.[0]?.id).toBe('web-search')
    expect(sync.installCalls[0]?.[0]?.version).toBe('1.0.0')
    expect(r.stdout).toContain('applied')
  })

  it('does not call install when already in sync', async () => {
    const lockYaml = makeLockfileYaml([{ id: 'web-search', version: '1.0.0' }])
    const io = fakeIo({ '/work/agentskit-os.lock': lockYaml })
    const sync = fakeSynchronizer([{ id: 'web-search', version: '1.0.0', kind: 'plugin' }])
    const r = await runSync(['--apply'], io, { synchronizer: sync })
    expect(r.code).toBe(0)
    expect(sync.installCalls).toHaveLength(0)
  })

  it('exits 1 when install fails', async () => {
    const lockYaml = makeLockfileYaml([{ id: 'web-search', version: '1.0.0' }])
    const io = fakeIo({ '/work/agentskit-os.lock': lockYaml })
    const sync = fakeSynchronizer(
      [{ id: 'web-search', version: '0.9.0', kind: 'plugin' }],
      async () => {
        throw new Error('pnpm install failed')
      },
    )
    const r = await runSync(['--apply'], io, { synchronizer: sync })
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('os.cli.sync_install_failed')
    expect(r.stderr).toContain('pnpm install failed')
  })

  it('exits 1 if drift remains after install', async () => {
    const lockYaml = makeLockfileYaml([{ id: 'web-search', version: '1.0.0' }])
    const io = fakeIo({ '/work/agentskit-os.lock': lockYaml })
    // install() is a no-op so installed stays at 0.9.0
    const installed: InstalledPackage[] = [{ id: 'web-search', version: '0.9.0', kind: 'plugin' }]
    const sync: Synchronizer & { installCalls: InstalledPackage[][] } = {
      installCalls: [],
      async listInstalled() { return installed },
      async install(pkgs) {
        this.installCalls.push([...pkgs])
        // deliberately do nothing — drift remains
      },
    }
    const r = await runSync(['--apply'], io, { synchronizer: sync })
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('sync failed')
  })
})

describe('runSync — scope filters', () => {
  it('--plugins-only only reports plugin drift', async () => {
    const lockYaml = makeLockfileYaml([{ id: 'web-search', version: '1.0.0' }])
    const io = fakeIo({ '/work/agentskit-os.lock': lockYaml })
    // Missing web-search but with a core entry — plugins-only should detect drift
    const sync = fakeSynchronizer([{ id: 'os-runtime', version: '1.0.0', kind: 'core' }])
    const r = await runSync(['--plugins-only'], io, { synchronizer: sync })
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('web-search')
  })

  it('--core-only skips plugin locked entries (no drift for missing plugin)', async () => {
    const lockYaml = makeLockfileYaml([{ id: 'web-search', version: '1.0.0' }])
    const io = fakeIo({ '/work/agentskit-os.lock': lockYaml })
    // No plugins installed — but core-only mode should skip plugin checks
    const sync = fakeSynchronizer([])
    const r = await runSync(['--core-only'], io, { synchronizer: sync })
    expect(r.code).toBe(0)
  })
})

describe('runSync — missing lockfile', () => {
  it('exits 1 with sync_missing_lockfile when no lockfile found', async () => {
    const io = fakeIo({})
    const sync = fakeSynchronizer([])
    const r = await runSync([], io, { synchronizer: sync })
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('os.cli.sync_missing_lockfile')
  })

  it('--lock <path> uses provided path', async () => {
    const io = fakeIo({ '/work/custom.lock': makeLockfileYaml() })
    const sync = fakeSynchronizer([])
    const r = await runSync(['--lock', 'custom.lock'], io, { synchronizer: sync })
    expect(r.code).toBe(0)
  })
})

describe('runSync — malformed lockfile', () => {
  it('exits 1 with sync_missing_lockfile on parse failure', async () => {
    const io = fakeIo({ '/work/agentskit-os.lock': 'this: is: not: a: lockfile: !!!bad' })
    const sync = fakeSynchronizer([])
    const r = await runSync([], io, { synchronizer: sync })
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('os.cli.sync_missing_lockfile')
  })

  it('exits 1 with sync_missing_lockfile on Zod validation failure', async () => {
    const io = fakeIo({ '/work/agentskit-os.lock': 'lockfileVersion: 999\ngeneratedAt: bad\n' })
    const sync = fakeSynchronizer([])
    const r = await runSync([], io, { synchronizer: sync })
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('os.cli.sync_missing_lockfile')
  })
})

describe('runSync — exit codes', () => {
  it('returns 0 when in sync', async () => {
    const io = fakeIo({ '/work/agentskit-os.lock': makeLockfileYaml() })
    const sync = fakeSynchronizer([])
    const r = await runSync([], io, { synchronizer: sync })
    expect(r.code).toBe(0)
  })

  it('returns 1 when drift found', async () => {
    const lockYaml = makeLockfileYaml([{ id: 'web-search', version: '1.0.0' }])
    const io = fakeIo({ '/work/agentskit-os.lock': lockYaml })
    const sync = fakeSynchronizer([])
    const r = await runSync([], io, { synchronizer: sync })
    expect(r.code).toBe(1)
  })

  it('returns 2 on usage error', async () => {
    const io = fakeIo({})
    const sync = fakeSynchronizer([])
    const r = await runSync(['--unknown-flag'], io, { synchronizer: sync })
    expect(r.code).toBe(2)
  })

  it('returns 2 on --help', async () => {
    const io = fakeIo({})
    const sync = fakeSynchronizer([])
    const r = await runSync(['--help'], io, { synchronizer: sync })
    expect(r.code).toBe(2)
    expect(`${r.stdout}${r.stderr}`).toContain('agentskit-os sync')
  })
})

describe('router integration', () => {
  it('routes agentskit-os sync to the sync command', async () => {
    const io = fakeIo({})
    const r = await route(['sync', '--help'], io)
    expect(r.code).toBe(2)
    expect(`${r.stdout}${r.stderr}`).toContain('agentskit-os sync')
  })

  it('sync appears in help', async () => {
    const r = await route(['--help'])
    expect(r.stdout).toContain('sync')
  })
})
