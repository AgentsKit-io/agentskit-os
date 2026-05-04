import { resolve } from 'node:path'
import { Command } from 'commander'
import { safeParseConfigRoot } from '@agentskit/os-core/schema/config-root'
import {
  parseRunContext,
  RUN_MODES,
  type RunMode,
} from '@agentskit/os-core'
import type { AgentConfig, ModelPricing, WorkspaceLimits } from '@agentskit/os-core'
import {
  defaultStubHandlers,
  estimateFlowCost,
  resumeFlow,
  runFlow,
  type AgentMap,
  type CheckpointStore,
  type FlowCostEstimate,
  type PriceMap,
  type RunOptions,
} from '@agentskit/os-flow'
import { FileCheckpointStore } from '@agentskit/os-storage'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'
import { loadConfigFile } from '../loader.js'

const help = `agentskit-os run <config-path> --flow <flow-id> [...flags]

Executes a flow from an AgentsKitOS config file.

Flags:
  --flow <id>         flow id to execute (required)
  --mode <mode>       run mode (real|preview|dry_run|replay|simulate|deterministic) — default: dry_run
  --workspace <id>    override workspace id; defaults to config workspace
  --store <dir>       enable durable mode — checkpoints to FileCheckpointStore at <dir>
  --resume <runId>    resume an existing run from checkpoints (requires --store)
  --estimate          print cost estimate and exit without executing
  --force             skip WorkspaceLimits budget check (audited)
  --quiet             suppress per-node event output

Exit codes:
  0  flow completed (or skipped under stub modes)
  1  flow failed (handler error or graph audit failure)
  2  usage error
  3  read error
  4  paused (HITL or budget) — caller resumes externally
  5  budget exceeded — estimate exceeds WorkspaceLimits (use --force to override)
`

const RUN_MODE_SET = new Set(RUN_MODES as readonly string[])

type CliRunEvent =
  | Parameters<NonNullable<RunOptions['onEvent']>>[0]
  | { kind: 'node:resumed'; nodeId: string; outcome: { kind: string } }

type Args = {
  configPath: string
  flowId: string
  mode: RunMode
  workspace?: string
  store?: string
  resume?: string
  quiet: boolean
  estimate: boolean
  force: boolean
}

const newRunId = (): string => {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 8)
  return `run_${t}_${r}`
}

const USD_DECIMALS = 6

const formatUsd = (usd: number): string => usd.toFixed(USD_DECIMALS)

const pad = (s: string, width: number): string => s.padEnd(width)

const formatEstimateTable = (est: FlowCostEstimate): string => {
  const COL_NODE = 24
  const COL_AGENTS = 32
  const COL_TOKENS = 10
  const COL_USD = 14

  const header =
    pad('Node', COL_NODE) +
    pad('Agents', COL_AGENTS) +
    pad('Tokens', COL_TOKENS) +
    pad('Est. USD', COL_USD)

  const sep = '-'.repeat(COL_NODE + COL_AGENTS + COL_TOKENS + COL_USD)

  const rows = est.perNode.map((n) => {
    const agents = n.agentIds.length > 0 ? n.agentIds.join(', ') : '—'
    return (
      pad(n.nodeId, COL_NODE) +
      pad(agents.slice(0, COL_AGENTS - 1), COL_AGENTS) +
      pad(String(n.tokens), COL_TOKENS) +
      pad(`$${formatUsd(n.usd)}`, COL_USD)
    )
  })

  const totalRow =
    pad('TOTAL', COL_NODE) +
    pad('', COL_AGENTS) +
    pad(String(est.totalTokens), COL_TOKENS) +
    pad(`$${formatUsd(est.totalUsd)}`, COL_USD)

  return [header, sep, ...rows, sep, totalRow].join('\n')
}

type BudgetViolation =
  | { kind: 'ok' }
  | { kind: 'exceeded'; field: 'tokensPerRun' | 'usdPerRun'; limit: number; estimate: number }

const checkLimits = (
  est: FlowCostEstimate,
  limits: WorkspaceLimits,
): BudgetViolation => {
  if (limits.tokensPerRun !== undefined && est.totalTokens > limits.tokensPerRun) {
    return { kind: 'exceeded', field: 'tokensPerRun', limit: limits.tokensPerRun, estimate: est.totalTokens }
  }
  if (limits.usdPerRun !== undefined && est.totalUsd > limits.usdPerRun) {
    return { kind: 'exceeded', field: 'usdPerRun', limit: limits.usdPerRun, estimate: est.totalUsd }
  }
  return { kind: 'ok' }
}

const executeRun = async (args: Args, io: CliIo): Promise<CliExit> => {
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

  if (args.estimate) {
    const agentMap: AgentMap = new Map<string, AgentConfig>(
      (parsed.data.agents ?? []).map((a) => [a.id, a]),
    )
    const prices: PriceMap = new Map<string, ModelPricing>()
    const est = estimateFlowCost({ flow, agents: agentMap, prices })

    const table = formatEstimateTable(est)
    const header = `cost estimate  flow=${flow.id}  workspace=${args.workspace ?? parsed.data.workspace.id}\n`

    const limits = parsed.data.workspace.limits
    if (limits && !args.force) {
      const check = checkLimits(est, limits)
      if (check.kind === 'exceeded') {
        const msg =
          `error: budget exceeded (os.cli.run_budget_exceeded)\n` +
          `  ${check.field}: estimate=${check.estimate}, limit=${check.limit}\n` +
          `  Use --force to override (audited).\n\n` +
          header +
          table + '\n'
        return { code: 5, stdout: '', stderr: msg }
      }
    }

    const forceNote = args.force && limits ? '\n[--force] WorkspaceLimits check skipped.\n' : ''
    return { code: 0, stdout: header + table + forceNote + '\n', stderr: '' }
  }

  if (parsed.data.workspace.limits && !args.force) {
    const agentMap: AgentMap = new Map<string, AgentConfig>(
      (parsed.data.agents ?? []).map((a) => [a.id, a]),
    )
    const prices: PriceMap = new Map<string, ModelPricing>()
    const est = estimateFlowCost({ flow, agents: agentMap, prices })
    const limits = parsed.data.workspace.limits
    const check = checkLimits(est, limits)
    if (check.kind === 'exceeded') {
      return {
        code: 5,
        stdout: '',
        stderr:
          `error: budget exceeded (os.cli.run_budget_exceeded)\n` +
          `  ${check.field}: estimate=${check.estimate}, limit=${check.limit}\n` +
          `  Use --force to override (audited) or --estimate to inspect.\n`,
      }
    }
  }

  const runId = args.resume ?? newRunId()
  const ctx = parseRunContext({
    runMode: args.mode,
    workspaceId: args.workspace ?? parsed.data.workspace.id,
    runId,
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
    : (e: CliRunEvent) => {
        if (e.kind === 'node:start') events.push(`→ ${e.nodeId}`)
        else if (e.kind === 'node:paused') events.push(`⏸ ${e.nodeId} (${e.reason})`)
        else if (e.kind === 'node:mock-applied') events.push(`↪ ${e.nodeId} (mocked)`)
        else if (e.kind === 'node:resumed') events.push(`✓ ${e.nodeId} (resumed)`)
        else events.push(`  ${e.nodeId}: ${e.outcome.kind}`)
      }

  const durable = args.store !== undefined
  let store: CheckpointStore | undefined
  if (durable) {
    const dir = resolve(io.cwd(), args.store!)
    store = new FileCheckpointStore({ dir })
  }

  const resultStatus: { status: string; stoppedAt?: string; reason?: string; executedOrder: readonly string[] } =
    durable
      ? await resumeFlow(flow, { handlers, ctx, store: store! as CheckpointStore, onEvent })
      : await runFlow(flow, { handlers, ctx, onEvent })

  const header = `run ${ctx.runId} flow=${flow.id} mode=${args.mode} workspace=${ctx.workspaceId}${durable ? ' (durable)' : ''}`
  const trace = events.length > 0 ? `\n${events.join('\n')}\n` : ''
  const summary = `\nstatus: ${resultStatus.status}${resultStatus.stoppedAt ? ` (stopped at ${resultStatus.stoppedAt})` : ''}${resultStatus.reason ? ` reason=${resultStatus.reason}` : ''}\nexecuted: ${resultStatus.executedOrder.length} node(s)\n`

  if (resultStatus.status === 'failed') {
    return { code: 1, stdout: '', stderr: `${header}${trace}${summary}` }
  }
  if (resultStatus.status === 'paused') {
    return { code: 4, stdout: `${header}${trace}${summary}`, stderr: '' }
  }
  return { code: 0, stdout: `${header}${trace}${summary}`, stderr: '' }
}

type RunCliOpts = {
  flow: string
  mode?: string
  workspace?: string
  store?: string
  resume?: string
  estimate?: boolean
  force?: boolean
  quiet?: boolean
}

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('run')
    .description('agentskit-os run — Execute (or resume) a flow from an AgentsKitOS config (default: dry_run).')
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .argument('[configPath]', 'path to agentskit-os.config.yaml')
    .requiredOption('--flow <id>', 'flow id to execute')
    .option('--mode <mode>', `run mode (${[...RUN_MODE_SET].join('|')})`, 'dry_run')
    .option('--workspace <id>', 'override workspace id')
    .option('--store <dir>', 'checkpoint directory for durable mode')
    .option('--resume <runId>', 'resume existing run (requires --store)')
    .option('--estimate', 'print cost estimate and exit', false)
    .option('--force', 'skip WorkspaceLimits budget check', false)
    .option('--quiet', 'suppress per-node event output', false)
    .action(async function (this: Command, configPath: string | undefined, opts: RunCliOpts) {
      if (!configPath) {
        this.error(help, { exitCode: 2 })
      }
      if (opts.resume && !opts.store) {
        this.error(`error: --resume requires --store <dir>\n\n${help}`, { exitCode: 2 })
      }
      const modeStr = opts.mode ?? 'dry_run'
      if (!RUN_MODE_SET.has(modeStr)) {
        this.error(`error: --mode "${modeStr}" not in ${[...RUN_MODE_SET].join('|')}\n\n${help}`, { exitCode: 2 })
      }
      const args: Args = {
        configPath,
        flowId: opts.flow,
        mode: modeStr as RunMode,
        quiet: opts.quiet === true,
        estimate: opts.estimate === true,
        force: opts.force === true,
        ...(opts.workspace !== undefined ? { workspace: opts.workspace } : {}),
        ...(opts.store !== undefined ? { store: opts.store } : {}),
        ...(opts.resume !== undefined ? { resume: opts.resume } : {}),
      }
      result.current = await executeRun(args, io)
    })

  return { program, result }
}

export const run: CliCommand = {
  name: 'run',
  summary: 'Execute (or resume) a flow from an AgentsKitOS config (default: dry_run)',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
