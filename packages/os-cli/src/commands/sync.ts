import { resolve, join } from 'node:path'
import { Command } from 'commander'
import { parse as parseYaml } from 'yaml'
import { parseLockfile, type Lockfile, type PluginLock } from '@agentskit/os-core/lockfile/lock'
import { runCommander } from '../cli/commander-dispatch.js'
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

type SyncScope = 'all' | 'plugins-only' | 'core-only'

type Args = {
  apply: boolean
  check: boolean
  scope: SyncScope
  lockPath?: string
}

export type SyncOpts = {
  synchronizer?: Synchronizer
}

const executeSync = async (args: Args, io: CliIo, opts: SyncOpts): Promise<CliExit> => {
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

const buildSyncProgram = (io: CliIo, syncOpts: SyncOpts): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('sync')
    .description(
      'agentskit-os sync — Check or apply version drift between agentskit-os.lock and installed packages.',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .option('--apply', 'install/upgrade packages to match the lockfile, then re-verify', false)
    .option('--check', 'drift-only check (same default behavior when not applying)', false)
    .option('--plugins-only', 'only plugin entries', false)
    .option('--core-only', 'only core entries', false)
    .option('--lock <path>', 'override lockfile path (default ./agentskit-os.lock)')
    .action(async function (this: Command, commanderOpts: {
      apply?: boolean
      check?: boolean
      pluginsOnly?: boolean
      coreOnly?: boolean
      lock?: string
    }) {
      if (commanderOpts.pluginsOnly && commanderOpts.coreOnly) {
        this.error('error: --plugins-only and --core-only are mutually exclusive', { exitCode: 2 })
      }
      let scope: SyncScope = 'all'
      if (commanderOpts.pluginsOnly) scope = 'plugins-only'
      else if (commanderOpts.coreOnly) scope = 'core-only'
      const args: Args = {
        apply: commanderOpts.apply === true,
        check: commanderOpts.check === true,
        scope,
        ...(commanderOpts.lock !== undefined ? { lockPath: commanderOpts.lock } : {}),
      }
      result.current = await executeSync(args, io, syncOpts)
    })
  return { program, result }
}

export const runSync = async (
  argv: readonly string[],
  io: CliIo,
  opts: SyncOpts = {},
): Promise<CliExit> => {
  const { program, result } = buildSyncProgram(io, opts)
  const parsed = await runCommander(program, argv)
  if (parsed.code !== 0) {
    return parsed
  }
  return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
}

export const sync: CliCommand = {
  name: 'sync',
  summary: 'Check or apply version drift between lockfile and installed packages',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => runSync(argv, io),
}
