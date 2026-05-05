import { resolve, join } from 'node:path'
import { Command } from 'commander'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

type Args = {
  readonly dir: string
  readonly cron: string
  readonly daily: number
  readonly weekly: number
  readonly monthly: number
}

const help = `agentskit-os snapshot schedule [--dir <path>] [--cron <expr>] [--daily <n>] [--weekly <n>] [--monthly <n>]

Stores snapshot scheduling + retention policy for a workspace.

Notes:
- This command does NOT install cron/systemd tasks (portable). It writes config and prints a suggested cron line.
- Snapshot creation is handled by your backup/export workflow (see epic O-6).
`

const execute = async (args: Args, io: CliIo): Promise<CliExit> => {
  const baseDir = resolve(io.cwd(), args.dir)
  const cfgDir = join(baseDir, '..')
  const cfgPath = join(cfgDir, 'snapshot-schedule.json')

  await io.mkdir(cfgDir)
  await io.mkdir(baseDir)

  const config = {
    schemaVersion: 1,
    snapshotsDir: baseDir,
    cron: args.cron,
    retention: {
      daily: args.daily,
      weekly: args.weekly,
      monthly: args.monthly,
    },
    updatedAt: new Date().toISOString(),
  }

  await io.writeFile(cfgPath, JSON.stringify(config, null, 2) + '\n')

  const suggested = `${args.cron} agentskit-os snapshot retention --dir ${JSON.stringify(baseDir)} --daily ${args.daily} --weekly ${args.weekly} --monthly ${args.monthly}`

  return {
    code: 0,
    stdout:
      `saved ${cfgPath}\n` +
      `\nSuggested cron entry:\n${suggested}\n`,
    stderr: '',
  }
}

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('snapshot schedule')
    .description('agentskit-os snapshot schedule — Persist snapshot scheduling + retention policy.')
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .option('--dir <path>', 'snapshot directory (default: ./.agentskitos/snapshots)', '.agentskitos/snapshots')
    .option('--cron <expr>', 'cron expression (default: 0 2 * * *)', '0 2 * * *')
    .option('--daily <n>', 'keep daily snapshots for N distinct days (default: 7)', '7')
    .option('--weekly <n>', 'keep weekly snapshots for N distinct ISO weeks (default: 4)', '4')
    .option('--monthly <n>', 'keep monthly snapshots for N distinct months (default: 12)', '12')
    .action(async function (this: Command, opts: {
      dir?: string
      cron?: string
      daily?: string
      weekly?: string
      monthly?: string
    }) {
      const daily = Number(opts.daily ?? '7')
      const weekly = Number(opts.weekly ?? '4')
      const monthly = Number(opts.monthly ?? '12')
      if (!Number.isFinite(daily) || daily < 0) this.error(help, { exitCode: 2 })
      if (!Number.isFinite(weekly) || weekly < 0) this.error(help, { exitCode: 2 })
      if (!Number.isFinite(monthly) || monthly < 0) this.error(help, { exitCode: 2 })
      result.current = await execute(
        {
          dir: opts.dir ?? '.agentskitos/snapshots',
          cron: opts.cron ?? '0 2 * * *',
          daily,
          weekly,
          monthly,
        },
        io,
      )
    })
  return { program, result }
}

export const runSnapshotSchedule = async (
  argv: readonly string[],
  io: CliIo,
): Promise<CliExit> => {
  const { program, result } = buildProgram(io)
  const parsed = await runCommander(program, argv)
  if (parsed.code !== 0) return parsed
  return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
}

export const snapshotSchedule: CliCommand = {
  name: 'snapshot schedule',
  summary: 'Persist snapshot scheduling + retention policy',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => runSnapshotSchedule(argv, io),
}

