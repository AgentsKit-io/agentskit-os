import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { Command } from 'commander'
import { createDefaultRunId, type CodingTaskKind } from '@agentskit/os-core'
import {
  buildCodingTaskReportFromDelegation,
  renderCodingTaskReportMarkdown,
  runDelegatedCodingTask,
  serializeCodingTaskReportJson,
  toCodingTaskDashboardPayload,
  type DelegationSubTaskRow,
} from '@agentskit/os-dev-orchestrator'
import {
  BUILTIN_CODING_AGENT_IDS,
  createBuiltinCodingAgentProvider,
  isBuiltinCodingAgentId,
  type BuiltinCodingAgentId,
} from '@agentskit/os-coding-agents'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit } from '../types.js'
import { putReportLink } from './coding-agent-report-links.js'

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

const collect = (value: string, previous: string[]): string[] => [...previous, value]

/** Each value is `provider:prompt` (first `:` splits provider id from the rest). */
const parseShard = (raw: string): { provider: BuiltinCodingAgentId; prompt: string } | null => {
  const idx = raw.indexOf(':')
  if (idx <= 0 || idx === raw.length - 1) return null
  const provider = raw.slice(0, idx).trim()
  const prompt = raw.slice(idx + 1).trim()
  if (!isBuiltinCodingAgentId(provider)) return null
  return { provider, prompt }
}

type DelegateOpts = {
  coordinatorPrompt: string
  sub: string[]
  repoRoot: string
  kind: string
  apply: boolean
  isolateWorktrees: boolean
  parallel: boolean
  json?: boolean
  artifactDir?: string
  captureRunArtifacts?: string
  artifactTraceId?: string
  traceUrl?: string
  prUrl?: string
  secretsFile?: string
}

const buildProgram = (): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('coding-agent delegate')
    .description(
      'Coordinator-style multi-provider run (#365): each --sub provider:prompt runs sequentially; merge detects overlapping file paths.',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .requiredOption(
      '--sub <provider:prompt>',
      `shard (repeat). provider ∈ {${BUILTIN_CODING_AGENT_IDS.join(', ')}}`,
      collect,
      [],
    )
    .option(
      '--coordinator-prompt <text>',
      'text recorded on the delegation trace root',
      'Coordinate delegated coding shards.',
    )
    .option('--repo-root <path>', 'git repository root', process.cwd())
    .option('--kind <kind>', `CodingTaskKind (${TASK_KINDS.join(', ')})`, 'free-form')
    .option('--apply', 'disable dry-run on shards', false)
    .option('--isolate-worktrees', 'one git worktree per shard', false)
    .option(
      '--parallel',
      'run shard tasks concurrently after worktrees are ready (requires isolateWorktrees or all shards dry-run)',
      false,
    )
    .option('--json', 'print DelegationReport as JSON', false)
    .option(
      '--capture-run-artifacts <path>',
      'write per-shard coding-run-artifact-deleg-*.json bundles under this directory (#367)',
      undefined,
    )
    .option(
      '--artifact-trace-id <id>',
      'trace id stored in each coding run artifact (use with --capture-run-artifacts)',
      undefined,
    )
    .option(
      '--artifact-dir <path>',
      'write coding-task-report.json, coding-task-report.md, coding-task-dashboard.json (#368)',
      undefined,
    )
    .option('--trace-url <url>', 'trace URL embedded in task report artifacts', undefined)
    .option('--pr-url <url>', 'PR URL embedded in task report artifacts', undefined)
    .option(
      '--secrets-file <path>',
      'merge KEY=value lines into env for each shard provider CLI subprocess (#375)',
      undefined,
    )
    .action(async (opts: DelegateOpts) => {
      if (opts.sub.length === 0) {
        program.error('at least one --sub provider:prompt is required', { exitCode: 2 })
        return
      }
      if (!isTaskKind(opts.kind)) {
        program.error(`unknown --kind "${opts.kind}"`, { exitCode: 2 })
        return
      }

      const sf = opts.secretsFile?.trim()
      const vaultOpts = sf !== undefined && sf.length > 0 ? { secretsFile: resolve(sf) } : undefined

      const shards: { id: string; providerId: string; provider: ReturnType<typeof createBuiltinCodingAgentProvider>; prompt: string; kind: CodingTaskKind; dryRun: boolean }[] = []
      for (let i = 0; i < opts.sub.length; i += 1) {
        const parsed = parseShard(opts.sub[i]!)
        if (parsed === null) {
          program.error(`invalid --sub at index ${i}: expected provider:prompt`, { exitCode: 2 })
          return
        }
        shards.push({
          id: `shard-${i}`,
          providerId: parsed.provider,
          provider: createBuiltinCodingAgentProvider(parsed.provider, vaultOpts),
          prompt: parsed.prompt,
          kind: opts.kind,
          dryRun: opts.apply !== true,
        })
      }

      const captureDir = opts.captureRunArtifacts?.trim()
      const traceIdOpt = opts.artifactTraceId?.trim()

      let report: Awaited<ReturnType<typeof runDelegatedCodingTask>>
      try {
        report = await runDelegatedCodingTask({
          repoRoot: resolve(opts.repoRoot),
          coordinatorPrompt: opts.coordinatorPrompt,
          shards,
          isolateWorktrees: opts.isolateWorktrees === true,
          parallel: opts.parallel === true,
          ...(captureDir !== undefined && captureDir.length > 0
            ? {
                artifacts: {
                  outDir: resolve(captureDir),
                  runId: createDefaultRunId(),
                  ...(traceIdOpt !== undefined && traceIdOpt.length > 0 ? { traceId: traceIdOpt } : {}),
                },
              }
            : {}),
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        result.current = { code: 2, stdout: '', stderr: `${msg}\n` }
        return
      }

      if (opts.artifactDir !== undefined && opts.artifactDir.trim().length > 0) {
        const dir = resolve(opts.artifactDir.trim())
        await mkdir(dir, { recursive: true })
        const linkMap: Record<string, string> = {}
        putReportLink(linkMap, 'traceUrl', opts.traceUrl)
        putReportLink(linkMap, 'prUrl', opts.prUrl)
        const dryRun = opts.apply !== true
        const delegationOpts: { links?: Record<string, string> } = {}
        if (Object.keys(linkMap).length > 0) {
          delegationOpts.links = linkMap
        }
        const taskReport = buildCodingTaskReportFromDelegation(
          report,
          {
            kind: opts.kind,
            prompt: opts.coordinatorPrompt,
            dryRun,
            repoRoot: resolve(opts.repoRoot),
            isolateWorktrees: opts.isolateWorktrees === true,
          },
          delegationOpts,
        )
        await writeFile(join(dir, 'coding-task-report.json'), serializeCodingTaskReportJson(taskReport), 'utf8')
        await writeFile(join(dir, 'coding-task-report.md'), renderCodingTaskReportMarkdown(taskReport), 'utf8')
        await writeFile(
          join(dir, 'coding-task-dashboard.json'),
          `${JSON.stringify(toCodingTaskDashboardPayload(taskReport), null, 2)}\n`,
          'utf8',
        )
      }

      if (opts.json) {
        const out = `${JSON.stringify(report, null, 2)}\n`
        const badJson =
          report.suggestHumanInbox ||
          report.subtasks.some((s: DelegationSubTaskRow) => s.result.status === 'fail')
        if (badJson) {
          result.current = { code: 1, stdout: '', stderr: out }
        } else {
          result.current = { code: 0, stdout: out, stderr: '' }
        }
        return
      }

      const lines = [
        report.coordinatorSummary,
        `human inbox: ${report.suggestHumanInbox ? 'yes' : 'no'}`,
        `conflicts: ${report.conflicts.length}`,
        ...report.subtasks.map(
          (s: DelegationSubTaskRow) =>
            `  ${s.specId} ${s.providerId} → ${s.result.status} (${s.result.files.length} files)`,
        ),
      ]
      const text = `${lines.join('\n')}\n`
      const bad =
        report.suggestHumanInbox ||
        report.subtasks.some((s: DelegationSubTaskRow) => s.result.status === 'fail')
      if (bad) {
        result.current = { code: 1, stdout: '', stderr: text }
      } else {
        result.current = { code: 0, stdout: text, stderr: '' }
      }
    })

  return { program, result }
}

export const codingAgentDelegate: CliCommand = {
  name: 'coding-agent delegate',
  summary: 'Multi-provider delegated coding task with merge/conflict signals',
  run: async (argv): Promise<CliExit> => {
    const { program, result } = buildProgram()
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
