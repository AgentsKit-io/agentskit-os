import { safeParseConfigRoot } from '@agentskit/os-core/schema/config-root'
import {
  parseRunContext,
  RUN_MODES,
  type RunMode,
} from '@agentskit/os-core'
import { defaultStubHandlers, runFlow } from '@agentskit/os-flow'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'
import { loadConfigFile } from '../loader.js'

const help = `agentskit-os run <config-path> --flow <flow-id> [--mode <run-mode>]

Executes a flow from an AgentsKitOS config file.

Flags:
  --flow <id>       flow id to execute (required)
  --mode <mode>     run mode (real|preview|dry_run|replay|simulate|deterministic) — default: dry_run
  --workspace <id>  override workspace id; defaults to config workspace
  --quiet           suppress per-node event output

Exit codes:
  0  flow completed (or skipped under stub modes)
  1  flow failed (handler error or graph audit failure)
  2  usage error
  3  read error
  4  paused (HITL or budget) — caller resumes externally
`

const RUN_MODE_SET = new Set(RUN_MODES as readonly string[])

type Args = {
  configPath?: string
  flowId?: string
  mode: RunMode
  workspace?: string
  quiet: boolean
  usage?: string
}

const parseArgs = (argv: readonly string[]): Args => {
  const out: Args = { mode: 'dry_run', quiet: false }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    if (a === '--quiet') {
      out.quiet = true
      i++
      continue
    }
    if (a === '--flow' || a === '--mode' || a === '--workspace') {
      const v = argv[i + 1]
      if (!v || v.startsWith('--')) return { ...out, usage: `${a} requires a value` }
      if (a === '--flow') out.flowId = v
      else if (a === '--mode') {
        if (!RUN_MODE_SET.has(v)) {
          return { ...out, usage: `--mode "${v}" not in ${[...RUN_MODE_SET].join('|')}` }
        }
        out.mode = v as RunMode
      } else out.workspace = v
      i += 2
      continue
    }
    if (a?.startsWith('--')) return { ...out, usage: `unknown flag "${a}"` }
    if (out.configPath !== undefined) return { ...out, usage: 'only one positional <config-path> allowed' }
    if (a !== undefined) out.configPath = a
    i++
  }
  return out
}

const newRunId = (): string => {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 8)
  return `run_${t}_${r}`
}

export const run: CliCommand = {
  name: 'run',
  summary: 'Execute a flow from an AgentsKitOS config (default: dry_run)',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const args = parseArgs(argv)
    if (args.usage === 'help') return { code: 2, stdout: '', stderr: help }
    if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${help}` }
    if (!args.configPath) return { code: 2, stdout: '', stderr: help }
    if (!args.flowId) return { code: 2, stdout: '', stderr: `error: --flow <id> is required\n\n${help}` }

    const loaded = await loadConfigFile(io, args.configPath)
    if (!loaded.ok) return { code: loaded.code, stdout: '', stderr: loaded.message }

    const parsed = safeParseConfigRoot(loaded.value)
    if (!parsed.success) {
      const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      return {
        code: 1,
        stdout: '',
        stderr: `error: invalid config:\n${lines.join('\n')}\n`,
      }
    }

    const flow = parsed.data.flows.find((f) => f.id === args.flowId)
    if (!flow) {
      return {
        code: 2,
        stdout: '',
        stderr: `error: flow "${args.flowId}" not found in config (have: ${parsed.data.flows.map((f) => f.id).join(', ') || '<none>'})\n`,
      }
    }

    const ctx = parseRunContext({
      runMode: args.mode,
      workspaceId: args.workspace ?? parsed.data.workspace.id,
      runId: newRunId(),
      startedAt: new Date().toISOString(),
    })

    const stubReason: 'preview' | 'replay' | 'dry_run' | 'simulate' =
      args.mode === 'dry_run' || args.mode === 'preview' || args.mode === 'replay' || args.mode === 'simulate'
        ? args.mode
        : 'dry_run'
    const handlers = defaultStubHandlers(stubReason)

    const events: string[] = []
    const onEvent = args.quiet
      ? () => undefined
      : (e: { kind: 'node:start'; nodeId: string } | { kind: 'node:end'; nodeId: string; outcome: { kind: string } }) => {
          if (e.kind === 'node:start') events.push(`→ ${e.nodeId}`)
          else events.push(`  ${e.nodeId}: ${e.outcome.kind}`)
        }
    const result = await runFlow(flow, { handlers, ctx, onEvent })

    const header = `run ${ctx.runId} flow=${flow.id} mode=${args.mode} workspace=${ctx.workspaceId}`
    const trace = events.length > 0 ? `\n${events.join('\n')}\n` : ''
    const summary = `\nstatus: ${result.status}${result.stoppedAt ? ` (stopped at ${result.stoppedAt})` : ''}${result.reason ? ` reason=${result.reason}` : ''}\nexecuted: ${result.executedOrder.length} node(s)\n`

    if (result.status === 'failed') {
      return { code: 1, stdout: '', stderr: `${header}${trace}${summary}` }
    }
    if (result.status === 'paused') {
      return { code: 4, stdout: `${header}${trace}${summary}`, stderr: '' }
    }
    return { code: 0, stdout: `${header}${trace}${summary}`, stderr: '' }
  },
}
