import { resolve, join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { parseLockfile, type Lockfile, type PluginLock } from '@agentskit/os-core/lockfile/lock'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

// ---------------------------------------------------------------------------
// Synchronizer interface — injected so tests can fake the package manager.
// ---------------------------------------------------------------------------

export type InstalledPackage = {
  readonly id: string
  readonly version: string
  readonly kind: 'plugin' | 'core'
}

export type Synchronizer = {
  /** Return the currently-installed packages known to the workspace. */
  listInstalled(): Promise<readonly InstalledPackage[]>
  /** Install/upgrade the given packages to bring workspace into compliance. */
  install(pkgs: readonly InstalledPackage[]): Promise<void>
}

// ---------------------------------------------------------------------------
// Drift model
// ---------------------------------------------------------------------------

export type SyncDrift =
  | { code: 'os.cli.sync_drift'; id: string; kind: 'plugin' | 'core'; expected: string; actual: string | undefined }
  | { code: 'os.cli.sync_extra'; id: string; kind: 'plugin' | 'core'; actual: string }

// ---------------------------------------------------------------------------
// Pure drift computation — no IO.
// ---------------------------------------------------------------------------

export const computeDrift = (
  locked: readonly PluginLock[],
  installed: readonly InstalledPackage[],
  scope: 'all' | 'plugins-only' | 'core-only',
): readonly SyncDrift[] => {
  const issues: SyncDrift[] = []
  const installedMap = new Map(installed.map((p) => [p.id, p]))

  for (const plugin of locked) {
    if (scope === 'core-only') continue
    const inst = installedMap.get(plugin.id)
    if (!inst || inst.version !== plugin.version) {
      issues.push({
        code: 'os.cli.sync_drift',
        id: plugin.id,
        kind: 'plugin',
        expected: plugin.version,
        actual: inst?.version,
      })
    }
  }

  // Report installed plugins not in lockfile
  const lockedIds = new Set(locked.map((p) => p.id))
  for (const inst of installed) {
    if (inst.kind === 'core' && scope === 'plugins-only') continue
    if (inst.kind === 'plugin' && scope === 'core-only') continue
    if (inst.kind === 'plugin' && !lockedIds.has(inst.id)) {
      issues.push({
        code: 'os.cli.sync_extra',
        id: inst.id,
        kind: 'plugin',
        actual: inst.version,
      })
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// Default real Synchronizer — thin shell-out to pnpm (uses execFile, not exec).
// ---------------------------------------------------------------------------

export const pnpmSynchronizer: Synchronizer = {
  async listInstalled(): Promise<readonly InstalledPackage[]> {
    // Real implementation would parse `pnpm list --json`.
    // Returns empty by default — callers inject their own synchronizer for real use.
    return []
  },
  async install(pkgs: readonly InstalledPackage[]): Promise<void> {
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const execFileAsync = promisify(execFile)
    // Each package spec is passed as a separate argument — no shell interpolation.
    const specs = pkgs.map((p) => `${p.id}@${p.version}`)
    await execFileAsync('pnpm', ['install', ...specs])
  },
}

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

const help = `agentskit-os sync [--check] [--apply] [--plugins-only | --core-only] [--lock <path>]

Keep core/plugins in sync with the workspace lockfile (agentskit-os.lock).

Flags:
  --check          Report drift only, exit non-zero if out of sync (default)
  --apply          Install/upgrade packages to match the lockfile, then re-verify
  --plugins-only   Only check/sync plugin entries
  --core-only      Only check/sync core package entries
  --lock <path>    Override lockfile path (default: <cwd>/agentskit-os.lock)

Exit codes:
  0  in sync
  1  drift detected / sync error
  2  usage error
`

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

type SyncScope = 'all' | 'plugins-only' | 'core-only'

type Args = {
  apply: boolean
  check: boolean
  scope: SyncScope
  lockPath?: string
  usage?: string
}

const parseArgs = (argv: readonly string[]): Args => {
  const out: Args = { apply: false, check: false, scope: 'all' }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    if (a === '--apply') { out.apply = true; i++; continue }
    if (a === '--check') { out.check = true; i++; continue }
    if (a === '--plugins-only') {
      if (out.scope === 'core-only') return { ...out, usage: '--plugins-only and --core-only are mutually exclusive' }
      out.scope = 'plugins-only'
      i++
      continue
    }
    if (a === '--core-only') {
      if (out.scope === 'plugins-only') return { ...out, usage: '--plugins-only and --core-only are mutually exclusive' }
      out.scope = 'core-only'
      i++
      continue
    }
    if (a === '--lock') {
      const v = argv[i + 1]
      if (!v || v.startsWith('--')) return { ...out, usage: '--lock requires a path' }
      out.lockPath = v
      i += 2
      continue
    }
    if (a?.startsWith('--')) return { ...out, usage: `unknown flag "${a}"` }
    return { ...out, usage: `unexpected argument "${a}"` }
  }
  return out
}

// ---------------------------------------------------------------------------
// runSync — exported for direct use and tests.
// ---------------------------------------------------------------------------

export type SyncOpts = {
  synchronizer?: Synchronizer
}

export const runSync = async (
  argv: readonly string[],
  io: CliIo,
  opts: SyncOpts = {},
): Promise<CliExit> => {
  const args = parseArgs(argv)
  if (args.usage === 'help') return { code: 2, stdout: '', stderr: help }
  if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${help}` }

  const lockPath = args.lockPath
    ? resolve(io.cwd(), args.lockPath)
    : join(io.cwd(), 'agentskit-os.lock')

  const synchronizer = opts.synchronizer ?? pnpmSynchronizer

  // --- Read lockfile ---
  const exists = await io.exists(lockPath)
  if (!exists) {
    return {
      code: 1,
      stdout: '',
      stderr: `error [os.cli.sync_missing_lockfile]: lockfile not found at ${lockPath}\nRun \`agentskit-os lock <config>\` to generate it.\n`,
    }
  }

  let raw: string
  try {
    raw = await io.readFile(lockPath)
  } catch (err) {
    return {
      code: 1,
      stdout: '',
      stderr: `error [os.cli.sync_missing_lockfile]: cannot read lockfile: ${(err as Error).message}\n`,
    }
  }

  let lockfile: Lockfile
  try {
    const parsed = parseYaml(raw)
    lockfile = parseLockfile(parsed)
  } catch (err) {
    return {
      code: 1,
      stdout: '',
      stderr: `error [os.cli.sync_missing_lockfile]: malformed lockfile: ${(err as Error).message}\n`,
    }
  }

  // --- List installed ---
  let installed: readonly InstalledPackage[]
  try {
    installed = await synchronizer.listInstalled()
  } catch (err) {
    return {
      code: 1,
      stdout: '',
      stderr: `error [os.cli.sync_install_failed]: failed to list installed packages: ${(err as Error).message}\n`,
    }
  }

  // --- Compute drift ---
  const drift = computeDrift(lockfile.plugins, installed, args.scope)

  if (args.apply) {
    // Build the list of packages that need installation/upgrade
    const toInstall: InstalledPackage[] = []
    for (const d of drift) {
      if (d.code === 'os.cli.sync_drift') {
        toInstall.push({ id: d.id, version: d.expected, kind: d.kind })
      }
    }

    if (toInstall.length > 0) {
      try {
        await synchronizer.install(toInstall)
      } catch (err) {
        return {
          code: 1,
          stdout: '',
          stderr: `error [os.cli.sync_install_failed]: install failed: ${(err as Error).message}\n`,
        }
      }
    }

    // Re-verify after install
    let reinstalled: readonly InstalledPackage[]
    try {
      reinstalled = await synchronizer.listInstalled()
    } catch (err) {
      return {
        code: 1,
        stdout: '',
        stderr: `error [os.cli.sync_install_failed]: re-verify failed: ${(err as Error).message}\n`,
      }
    }

    const remaining = computeDrift(lockfile.plugins, reinstalled, args.scope)
    if (remaining.length > 0) {
      const lines = remaining.map((d) => {
        if (d.code === 'os.cli.sync_drift') {
          return `  - ${d.id} (${d.kind}): expected ${d.expected}, found ${d.actual ?? 'missing'}`
        }
        return `  - ${d.id} (${d.kind}): installed @ ${d.actual} but not in lockfile`
      })
      return {
        code: 1,
        stdout: '',
        stderr: `error [os.cli.sync_install_failed]: sync failed — ${remaining.length} issue(s) remain after install:\n${lines.join('\n')}\n`,
      }
    }

    const applied = toInstall.length
    return {
      code: 0,
      stdout: `ok: applied ${applied} change(s), workspace is now in sync with ${lockPath}\n`,
      stderr: '',
    }
  }

  // --check / default path
  if (drift.length === 0) {
    return {
      code: 0,
      stdout: `ok: workspace is in sync with ${lockPath} (${lockfile.plugins.length} plugin(s) checked)\n`,
      stderr: '',
    }
  }

  const lines = drift.map((d) => {
    if (d.code === 'os.cli.sync_drift') {
      return `  - ${d.id} (${d.kind}): expected ${d.expected}, found ${d.actual ?? 'missing'}`
    }
    return `  - ${d.id} (${d.kind}): installed @ ${d.actual} but not in lockfile`
  })
  return {
    code: 1,
    stdout: '',
    stderr: `error [os.cli.sync_drift]: ${drift.length} drift issue(s) detected:\n${lines.join('\n')}\n\nRun with --apply to fix.\n`,
  }
}

// ---------------------------------------------------------------------------
// CliCommand export
// ---------------------------------------------------------------------------

export const sync: CliCommand = {
  name: 'sync',
  summary: 'Check or apply version drift between lockfile and installed packages',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => runSync(argv, io),
}
