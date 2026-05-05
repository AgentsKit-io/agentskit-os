import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Command } from 'commander'
import { runCodingAgentBenchmark } from '@agentskit/os-dev-orchestrator'
import type { CodingTaskKind } from '@agentskit/os-core'
import {
  BUILTIN_CODING_AGENT_IDS,
  createBuiltinCodingAgentProvider,
  isBuiltinCodingAgentId,
  type BuiltinCodingAgentId,
} from '@agentskit/os-coding-agents'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit } from '../types.js'

const TASK_KINDS: readonly CodingTaskKind[] = [
  'edit',
  'fix-bug',
  'add-feature',
  'refactor',
  'add-test',
  'review-pr',
  'free-form',
]

const isTaskKind = (s: string): s is CodingTaskKind =>
  (TASK_KINDS as readonly string[]).includes(s)

type BenchmarkOpts = {
  providers: string
  prompt: string
  repoRoot: string
  kind: string
  apply: boolean
  isolateWorktrees: boolean
  timeoutMs: string
  json?: boolean
  persist?: string
}

const parseProviders = (csv: string): string[] =>
  csv
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

const buildProgram = (): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('coding-agent benchmark')
    .description(
      'Run the same coding task across built-in providers (#366). Default: dry-run in repo root; use --isolate-worktrees for per-provider git worktrees (requires a git repo).',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .requiredOption(
      '--providers <csv>',
      `comma-separated built-in ids (${BUILTIN_CODING_AGENT_IDS.join(', ')})`,
    )
    .requiredOption('--prompt <text>', 'task instruction passed to each provider')
    .option('--repo-root <path>', 'git repository root', process.cwd())
    .option(
      '--kind <kind>',
      `CodingTaskKind (${TASK_KINDS.join(', ')})`,
      'free-form',
    )
    .option('--apply', 'disable dry-run and allow write scope (use with care)', false)
    .option(
      '--isolate-worktrees',
      'create a detached worktree per provider under the system temp dir',
      false,
    )
    .option('--timeout-ms <ms>', 'per-provider task timeout in milliseconds', '120000')
    .option('--json', 'print CodingBenchmarkReport as JSON', false)
    .option('--persist <path>', 'write JSON report to file (same payload as --json)', undefined)
    .action(async (opts: BenchmarkOpts) => {
      const ids = parseProviders(opts.providers)
      const narrowed: BuiltinCodingAgentId[] = []
      for (const id of ids) {
        if (!isBuiltinCodingAgentId(id)) {
          program.error(`unknown provider "${id}"`, { exitCode: 2 })
          return
        }
        narrowed.push(id)
      }
      if (!isTaskKind(opts.kind)) {
        program.error(`unknown --kind "${opts.kind}"`, { exitCode: 2 })
        return
      }

      const dryRun = opts.apply !== true
      const timeoutMs = Number.parseInt(opts.timeoutMs, 10)
      if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
        program.error(`invalid --timeout-ms "${opts.timeoutMs}"`, { exitCode: 2 })
        return
      }
      const providers = narrowed.map((id) => createBuiltinCodingAgentProvider(id))
      const report = await runCodingAgentBenchmark({
        repoRoot: resolve(opts.repoRoot),
        providers,
        kind: opts.kind,
        prompt: opts.prompt,
        dryRun,
        isolateWorktrees: opts.isolateWorktrees === true,
        timeoutMs,
      })

      const jsonOut = `${JSON.stringify(report, null, 2)}\n`
      if (opts.persist !== undefined && opts.persist !== '') {
        await writeFile(resolve(opts.persist), jsonOut, 'utf8')
      }

      if (opts.json || (opts.persist !== undefined && opts.persist !== '')) {
        const ok = report.rows.every(
          (r: (typeof report.rows)[number]) => r.status === 'ok' || r.status === 'partial',
        )
        result.current = ok
          ? { code: 0, stdout: jsonOut, stderr: '' }
          : { code: 1, stdout: '', stderr: jsonOut }
        return
      }

      const lines = report.rows.map((r: (typeof report.rows)[number]) =>
        `${r.providerId.padEnd(14)} status=${r.status} score=${r.completenessScore} files=${r.fileEditCount} ` +
        `dur=${r.durationMs ?? 'n/a'}ms ${r.setupError ? `SETUP:${r.setupError}` : r.summary}`,
      )
      const text = [
        `repo: ${report.repoRoot}`,
        `kind: ${report.kind}  dryRun: ${report.dryRun}  isolateWorktrees: ${report.isolateWorktrees}`,
        '',
        ...lines,
        '',
      ].join('\n')
      const ok = report.rows.every(
        (r: (typeof report.rows)[number]) => r.status === 'ok' || r.status === 'partial',
      )
      result.current = ok
        ? { code: 0, stdout: text, stderr: '' }
        : { code: 1, stdout: '', stderr: text }
    })

  return { program, result }
}

export const codingAgentBenchmark: CliCommand = {
  name: 'coding-agent benchmark',
  summary: 'Run the same task across built-in coding-agent providers (comparison)',
  run: async (argv): Promise<CliExit> => {
    const { program, result } = buildProgram()
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
