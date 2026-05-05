import { resolve } from 'node:path'
import { Command } from 'commander'
import type { CodingTaskKind } from '@agentskit/os-core'
import { runDelegatedCodingTask, type DelegationSubTaskRow } from '@agentskit/os-dev-orchestrator'
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
  json?: boolean
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
    .option('--json', 'print DelegationReport as JSON', false)
    .action(async (opts: DelegateOpts) => {
      if (opts.sub.length === 0) {
        program.error('at least one --sub provider:prompt is required', { exitCode: 2 })
        return
      }
      if (!isTaskKind(opts.kind)) {
        program.error(`unknown --kind "${opts.kind}"`, { exitCode: 2 })
        return
      }

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
          provider: createBuiltinCodingAgentProvider(parsed.provider),
          prompt: parsed.prompt,
          kind: opts.kind,
          dryRun: opts.apply !== true,
        })
      }

      const report = await runDelegatedCodingTask({
        repoRoot: resolve(opts.repoRoot),
        coordinatorPrompt: opts.coordinatorPrompt,
        shards,
        isolateWorktrees: opts.isolateWorktrees === true,
      })

      if (opts.json) {
        const out = `${JSON.stringify(report, null, 2)}\n`
        result.current =
          report.suggestHumanInbox ||
          report.subtasks.some((s: DelegationSubTaskRow) => s.result.status === 'fail')
            ? { code: 1, stdout: '', stderr: out }
            : { code: 0, stdout: out, stderr: '' }
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
      result.current = bad ? { code: 1, stdout: '', stderr: text } : { code: 0, stdout: text, stderr: '' }
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
