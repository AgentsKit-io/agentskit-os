// HeadlessRunner — first-class headless agent runner.
// Bridges a workspace config + injected adapters to os-flow execution.
// Composes existing primitives; does NOT reimplement them.

import type { FlowConfig, RunContext, WorkspaceConfig } from '@agentskit/os-core'
import { createDefaultRunId, isStubRunMode, parseRunContext } from '@agentskit/os-core'
import type { RunResult, RunOptions, CheckpointFn } from '@agentskit/os-flow'
import { runFlow as flowRunFlow, defaultStubHandlers } from '@agentskit/os-flow'
import type { AdapterRegistry, AgentLookup } from '@agentskit/os-runtime'
import { buildLiveHandlers } from '@agentskit/os-runtime'
import type { AuditEmitter } from '@agentskit/os-audit'
import type { SandboxRegistry } from '@agentskit/os-sandbox'
import type { RunMode } from '@agentskit/os-core'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type WorkspaceRunRequest = {
  readonly flowId: string
  readonly input?: unknown
  readonly mode?: RunMode
  readonly signal?: AbortSignal
}

export type WorkspaceRunResult = RunResult & {
  readonly flowId: string
  readonly runId: string
  readonly workspaceId: string
  readonly mode: RunMode
}

export type HeadlessRunnerOptions = {
  /** Workspace config — identifies workspace (id, limits). */
  readonly config: WorkspaceConfig
  /**
   * Flow registry — maps flow id → FlowConfig.
   * Use a Map or plain object; flows not in registry will throw at runFlow() time.
   */
  readonly flows?: ReadonlyMap<string, FlowConfig> | Readonly<Record<string, FlowConfig>>
  /**
   * Adapter registry for llm / tool / human / memory.
   * Use os-runtime-agentskit's createAgentskitRegistry, or supply your own.
   */
  readonly adapters: AdapterRegistry
  /**
   * Optional agent lookup function. If not provided, a no-op lookup is used
   * (agent nodes will fail unless a custom llm adapter handles them directly).
   */
  readonly lookupAgent?: AgentLookup
  /** Optional sandbox registry — reserved for future policy enforcement. */
  readonly sandbox?: SandboxRegistry
  /** Optional audit emitter — flushed on dispose(). */
  readonly audit?: AuditEmitter
  /**
   * Optional observability sink called after each flow event.
   * Receives the same event shape as RunOptions.onEvent.
   */
  readonly observability?: RunOptions['onEvent']
  /** Override for generating run IDs. Defaults to timestamp+random. */
  readonly newRunId?: () => string
}

export type FlowRunOpts = {
  readonly input?: unknown
  readonly mode?: RunMode
  readonly signal?: AbortSignal
  readonly checkpoint?: CheckpointFn
}

export type HeadlessRunner = {
  /**
   * Run a flow. Accepts either a flow id (looked up from options.flows) or
   * a FlowConfig directly. Uses live handlers for real/deterministic modes;
   * falls back to stub handlers for dry_run/simulate/replay/preview.
   */
  runFlow(flow: string | FlowConfig, opts?: FlowRunOpts): Promise<WorkspaceRunResult>

  /**
   * Convenience: run a single agent node as a minimal 1-node flow.
   * Returns the raw output value from the agent handler (or throws on failure).
   */
  runAgent(agentId: string, input: unknown, opts?: { mode?: RunMode; signal?: AbortSignal }): Promise<unknown>

  /**
   * Flush audit batches and release any sandbox handles.
   */
  dispose(): Promise<void>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// AgentLookup is synchronous (returns AgentConfig | undefined).
const noopLookupAgent: AgentLookup = () => {
  throw new Error('headless: no lookupAgent provided — agent nodes cannot execute')
}

const buildCtx = (runOpts: {
  runId: string
  workspaceId: string
  mode: RunMode
}): RunContext =>
  parseRunContext({
    runMode: runOpts.mode,
    workspaceId: runOpts.workspaceId,
    runId: runOpts.runId,
    startedAt: new Date().toISOString(),
  })

const resolveFlow = (
  flow: string | FlowConfig,
  registry: ReadonlyMap<string, FlowConfig> | Readonly<Record<string, FlowConfig>> | undefined,
): FlowConfig => {
  if (typeof flow !== 'string') return flow
  if (!registry) throw new Error(`headless: no flow registry provided, cannot look up flow "${flow}"`)
  const resolved =
    registry instanceof Map
      ? registry.get(flow)
      : (registry as Record<string, FlowConfig>)[flow]
  if (!resolved) throw new Error(`headless: flow "${flow}" not found in registry`)
  return resolved
}

// Build RunOptions — avoids passing `undefined` for exactOptionalPropertyTypes.
const buildRunOptions = (
  handlers: RunOptions['handlers'],
  ctx: RunContext,
  runOpts: FlowRunOpts | undefined,
  observability: RunOptions['onEvent'] | undefined,
): RunOptions => ({
  handlers,
  ctx,
  ...(runOpts?.input !== undefined ? { initialInput: runOpts.input } : {}),
  ...(runOpts?.signal !== undefined ? { signal: runOpts.signal } : {}),
  ...(runOpts?.checkpoint !== undefined ? { checkpoint: runOpts.checkpoint } : {}),
  ...(observability !== undefined ? { onEvent: observability } : {}),
})

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createHeadlessRunner = (opts: HeadlessRunnerOptions): HeadlessRunner => {
  const newRunId = opts.newRunId ?? createDefaultRunId
  const lookupAgent = opts.lookupAgent ?? noopLookupAgent
  const workspaceId = opts.config.id

  const buildHandlers = (mode: RunMode): RunOptions['handlers'] => {
    if (isStubRunMode(mode)) {
      return defaultStubHandlers(mode)
    }
    return buildLiveHandlers({ adapters: opts.adapters, lookupAgent })
  }

  return {
    runFlow: async (flow, runOpts) => {
      const mode: RunMode = runOpts?.mode ?? 'dry_run'
      const runId = newRunId()
      const ctx = buildCtx({ runId, workspaceId, mode })
      const handlers = buildHandlers(mode)
      const flowConfig = resolveFlow(flow, opts.flows)

      const result = await flowRunFlow(
        flowConfig,
        buildRunOptions(handlers, ctx, runOpts, opts.observability),
      )

      return {
        ...result,
        flowId: flowConfig.id,
        runId,
        workspaceId,
        mode,
      }
    },

    runAgent: async (agentId, input, agentOpts) => {
      const mode: RunMode = agentOpts?.mode ?? 'dry_run'
      const runId = newRunId()
      const ctx = buildCtx({ runId, workspaceId, mode })
      const handlers = buildHandlers(mode)

      // Build a minimal single-agent FlowConfig.
      // parseFlowConfig requires name and tags but the raw shape accepted by
      // the runner is the inferred Zod type; we construct a valid FlowConfig.
      const minimalFlow: FlowConfig = {
        id: `headless-agent-${agentId}`,
        name: `Headless single-agent run: ${agentId}`,
        tags: [],
        nodes: [{ id: 'agent-node', kind: 'agent', agent: agentId }],
        edges: [],
        entry: 'agent-node',
      }

      const agentRunOpts: FlowRunOpts =
        agentOpts?.signal !== undefined
          ? { input, signal: agentOpts.signal }
          : { input }

      const result = await flowRunFlow(
        minimalFlow,
        buildRunOptions(handlers, ctx, agentRunOpts, opts.observability),
      )

      if (result.status === 'failed') {
        const outcome = result.outcomes.get('agent-node')
        const msg =
          outcome?.kind === 'failed'
            ? outcome.error.message
            : result.reason ?? 'agent run failed'
        throw new Error(`headless.runAgent: ${msg}`)
      }

      const outcome = result.outcomes.get('agent-node')
      if (outcome?.kind === 'ok') return outcome.value
      return undefined
    },

    dispose: async () => {
      if (opts.audit) {
        await opts.audit.flushAll()
      }
      // Sandbox handles are stateless in M1 — no close needed.
    },
  }
}

// ---------------------------------------------------------------------------
// Convenience top-level functions
// ---------------------------------------------------------------------------

/**
 * Run a specific flow from a workspace in a single call.
 * Creates a runner, runs the flow, and disposes.
 */
export const runWorkspace = async (
  opts: HeadlessRunnerOptions & WorkspaceRunRequest,
): Promise<WorkspaceRunResult> => {
  const runner = createHeadlessRunner(opts)
  try {
    const entries = Object.entries({
      ...(opts.input !== undefined ? { input: opts.input } : {}),
      ...(opts.mode !== undefined ? { mode: opts.mode } : {}),
      ...(opts.signal !== undefined ? { signal: opts.signal } : {}),
    }) as [string, unknown][]
    const runOpts = Object.fromEntries(entries) as FlowRunOpts
    return await runner.runFlow(opts.flowId, runOpts)
  } finally {
    await runner.dispose()
  }
}

/**
 * Alias for runWorkspace — matches the surface described in #223.
 */
export const runFlowHeadless = runWorkspace
