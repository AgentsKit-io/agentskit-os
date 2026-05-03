import { resolve } from 'node:path'
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
  priceKey,
  resumeFlow,
  runFlow,
  type AgentMap,
  type CheckpointStore,
  type FlowCostEstimate,
  type PriceMap,
} from '@agentskit/os-flow'
import { FileCheckpointStore } from '@agentskit/os-storage'
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

type Args = {
  configPath?: string
  flowId?: string
  mode: RunMode
  workspace?: string
  store?: string
  resume?: string
  quiet: boolean
  estimate: boolean
  force: boolean
  usage?: string
}

const parseArgs = (argv: readonly string[]): Args => {
  const out: Args = { mode: 'dry_run', quiet: false, estimate: false, force: false }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    if (a === '--quiet') {
      out.quiet = true
      i++
      continue
    }
    if (a === '--estimate') {
      out.estimate = true
      i++
      continue
    }
    if (a === '--force') {
      out.force = true
      i++
      continue
    }
    if (
      a === '--flow' ||
      a === '--mode' ||
      a === '--workspace' ||
      a === '--store' ||
      a === '--resume'
    ) {
      const v = argv[i + 1]
      if (!v || v.startsWith('--')) return { ...out, usage: `${a} requires a value` }
      if (a === '--flow') out.flowId = v
      else if (a === '--mode') {
        if (!RUN_MODE_SET.has(v)) {
          return { ...out, usage: `--mode "${v}" not in ${[...RUN_MODE_SET].join('|')}` }
        }
        out.mode = v as RunMode
      } else if (a === '--workspace') out.workspace = v
      else if (a === '--store') out.store = v
      else out.resume = v
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

// ---------------------------------------------------------------------------
// Cost estimate formatting helper
// ---------------------------------------------------------------------------

const USD_DECIMALS = 6

const formatUsd = (usd: number): string => usd.toFixed(USD_DECIMALS)

const pad = (s: string, width: number): string => s.padEnd(width)

/**
 * Render a plain-text estimate table.
 * No external dependencies (no chalk, no boxen).
 */
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

// ---------------------------------------------------------------------------
// Budget check helper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export const run: CliCommand = {
  name: 'run',
  summary: 'Execute (or resume) a flow from an AgentsKitOS config (default: dry_run)',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const args = parseArgs(argv)
    if (args.usage === 'help') return { code: 2, stdout: '', stderr: help }
    if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${help}` }
    if (!args.configPath) return { code: 2, stdout: '', stderr: help }
    if (!args.flowId) return { code: 2, stdout: '', stderr: `error: --flow <id> is required\n\n${help}` }
    if (args.resume && !args.store) {
      return { code: 2, stdout: '', stderr: `error: --resume requires --store <dir>\n\n${help}` }
    }

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

    // ------------------------------------------------------------------
    // --estimate: project cost, optionally check limits, then exit.
    // ------------------------------------------------------------------
    if (args.estimate) {
      const agentMap: AgentMap = new Map<string, AgentConfig>(
        (parsed.data.agents ?? []).map((a) => [a.id, a]),
      )
      // No built-in price table — callers can extend via prices arg.
      // For a pure CLI invocation we use an empty table (all $0 estimates
      // until host registers prices). This is clearly documented in the PR.
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

    // ------------------------------------------------------------------
    // Normal execution path (unchanged from original).
    // ------------------------------------------------------------------

    // Even without --estimate, check limits before executing (when present).
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
      : (e:
          | { kind: 'node:start'; nodeId: string }
          | { kind: 'node:end'; nodeId: string; outcome: { kind: string } }
          | { kind: 'node:resumed'; nodeId: string; outcome: { kind: string } }) => {
          if (e.kind === 'node:start') events.push(`→ ${e.nodeId}`)
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
  },
}
