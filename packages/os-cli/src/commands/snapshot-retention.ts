import { resolve } from 'node:path'
import { Command } from 'commander'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'
import { planRetention, type SnapshotRef } from '../lib/snapshot-retention.js'

type Args = {
  readonly dir: string
  readonly daily: number
  readonly weekly: number
  readonly monthly: number
}

const help = `agentskit-os snapshot retention --dir <path> [--daily <n>] [--weekly <n>] [--monthly <n>]

Compute a retention plan for snapshot files in a directory.

This command is non-destructive: it prints what would be kept/deleted.
`

const extractTimestamp = (filename: string): string | null => {
  // Accept: snapshot-<iso>.json, snapshot_<iso>.json, <iso>.snapshot.json, etc.
  // NOTE: Avoid `(?:` non-capturing groups — the architecture guardrail's
  // nested-ternary detector keys on `?:` tokens.
  const iso = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z)/)
  if (iso?.[1]) return iso[1]
  const date = filename.match(/(\d{4}-\d{2}-\d{2})/)
  if (date?.[1]) return date[1]
  return null
}

const execute = async (args: Args, io: CliIo): Promise<CliExit> => {
  if (!io.readdir) {
    return { code: 1, stdout: '', stderr: 'error: this command requires io.readdir support\n' }
  }
  const dir = resolve(io.cwd(), args.dir)
  const entries = await io.readdir(dir)

  const refs: SnapshotRef[] = entries.map((name) => ({
    id: name,
    timestamp: extractTimestamp(name) ?? '',
  }))

  const plan = planRetention(refs, { daily: args.daily, weekly: args.weekly, monthly: args.monthly })

  const keep = plan.keep.map((r) => `  - ${r.id}`).join('\n') || '  (none)'
  const del = plan.delete.map((r) => `  - ${r.id}`).join('\n') || '  (none)'
  const skipped = plan.skipped.map((r) => `  - ${r.id}`).join('\n') || '  (none)'

  return {
    code: 0,
    stdout:
      `dir: ${dir}\n` +
      `policy: daily=${args.daily} weekly=${args.weekly} monthly=${args.monthly}\n\n` +
      `KEEP (${plan.keep.length}):\n${keep}\n\n` +
      `DELETE (${plan.delete.length}):\n${del}\n\n` +
      `SKIPPED (unparsable timestamps) (${plan.skipped.length}):\n${skipped}\n`,
    stderr: '',
  }
}

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('snapshot retention')
    .description('agentskit-os snapshot retention — Compute snapshot retention keep/delete plan.')
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .requiredOption('--dir <path>', 'snapshot directory to inspect')
    .option('--daily <n>', 'keep daily snapshots for N distinct days (default: 7)', '7')
    .option('--weekly <n>', 'keep weekly snapshots for N distinct ISO weeks (default: 4)', '4')
    .option('--monthly <n>', 'keep monthly snapshots for N distinct months (default: 12)', '12')
    .action(async function (
      this: Command,
      opts: {
        dir: string | undefined
        daily: string | undefined
        weekly: string | undefined
        monthly: string | undefined
      },
    ) {
      if (!opts.dir) this.error(help, { exitCode: 2 })
      const daily = Number(opts.daily ?? '7')
      const weekly = Number(opts.weekly ?? '4')
      const monthly = Number(opts.monthly ?? '12')
      if (!Number.isFinite(daily) || daily < 0) this.error(help, { exitCode: 2 })
      if (!Number.isFinite(weekly) || weekly < 0) this.error(help, { exitCode: 2 })
      if (!Number.isFinite(monthly) || monthly < 0) this.error(help, { exitCode: 2 })
      result.current = await execute({ dir: opts.dir, daily, weekly, monthly }, io)
    })
  return { program, result }
}

export const runSnapshotRetention = async (argv: readonly string[], io: CliIo): Promise<CliExit> => {
  const { program, result } = buildProgram(io)
  const parsed = await runCommander(program, argv)
  if (parsed.code !== 0) return parsed
  return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
}

export const snapshotRetention: CliCommand = {
  name: 'snapshot retention',
  summary: 'Compute retention keep/delete plan for snapshots directory',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => runSnapshotRetention(argv, io),
}

