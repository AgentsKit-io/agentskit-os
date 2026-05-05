import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { Command } from 'commander'
import { simulateIssueToPrDryRun } from '@agentskit/os-dev-orchestrator'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit } from '../types.js'

type IssuePrOpts = {
  issue: string
  repo: string
  providers?: string
  json?: boolean
  persist?: string
}

const parseProviders = (csv: string | undefined): readonly string[] | undefined => {
  if (csv === undefined || csv.trim() === '') return undefined
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

const buildProgram = (): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('dev issue-pr')
    .description(
      'Dry-run trace for the issue → PR pipeline template (#364). Does not call GitHub remotes or real coding-agent CLIs.',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .requiredOption('--issue <ref>', 'GitHub issue URL or `owner/repo#123`')
    .option('--repo <path>', 'local repository root', process.cwd())
    .option('--providers <csv>', 'planned coding-agent provider ids (e.g. codex,claude-code)')
    .option('--json', 'print IssueToPrDryRunReport as JSON', false)
    .option('--persist <path>', 'write JSON report to this path (implies --json body)', undefined)
    .action(async (opts: IssuePrOpts) => {
      const repoRoot = resolve(opts.repo)
      const planned = parseProviders(opts.providers)
      const report = simulateIssueToPrDryRun({
        issueRef: opts.issue,
        repoRoot,
        ...(planned !== undefined ? { providers: planned } : {}),
      })
      const out = `${JSON.stringify(report, null, 2)}\n`
      if (opts.persist !== undefined && opts.persist !== '') {
        await writeFile(resolve(opts.persist), out, 'utf8')
      }
      if (opts.json || (opts.persist !== undefined && opts.persist !== '')) {
        result.current = { code: 0, stdout: out, stderr: '' }
        return
      }
      const lines = report.events.map((e) => `[${e.phase}] ${e.detail}`)
      result.current = {
        code: 0,
        stdout: [`issue: ${report.issueRef}`, `repo: ${report.repoRoot}`, '', ...lines, ''].join('\n'),
        stderr: '',
      }
    })

  return { program, result }
}

export const devIssuePr: CliCommand = {
  name: 'dev issue-pr',
  summary: 'Simulate issue→PR pipeline dry-run trace (no remotes)',
  run: async (argv): Promise<CliExit> => {
    const { program, result } = buildProgram()
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
