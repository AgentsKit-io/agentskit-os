// In-memory FlowConfig executor. Topo-ordered, run-mode aware.
// Pure async — durable storage hooked via checkpoint callback if provided.

import type { FlowConfig, FlowEdge, FlowNode, RunContext, WorkspacePolicyConfig } from '@agentskit/os-core'
import {
  evaluateWorkspacePolicyAtRunStart,
  evaluateWorkspacePolicyBeforeTool,
} from '@agentskit/os-core'
import type { FlowDebugger } from './debugger.js'
import type { NodeHandler, NodeHandlerMap, NodeOutcome } from './handlers.js'
import {
  applyModeStubs,
  validateDeterministicFlow,
  type AgentRegistryEntry,
  type ToolRegistryEntry,
} from './mode-policy.js'
import { buildSnapshotEmitter, type SnapshotOptions } from './snapshot.js'
import { auditGraph, buildAdjacency, topoSort } from './topo.js'

export type RunResult = {
  readonly status: 'completed' | 'failed' | 'paused' | 'skipped' | 'cancelled'
  readonly outcomes: ReadonlyMap<string, NodeOutcome>
  readonly executedOrder: readonly string[]
  readonly stoppedAt?: string
  readonly reason?: string
}

export type CheckpointFn = (
  nodeId: string,
  outcome: NodeOutcome,
  ctx: RunContext,
) => void | Promise<void>

export type RunOptions = {
  readonly handlers: NodeHandlerMap
  readonly ctx: RunContext
  readonly initialInput?: unknown
  readonly checkpoint?: CheckpointFn
  readonly onEvent?: (
    event:
      | { kind: 'node:start'; nodeId: string }
      | { kind: 'node:end'; nodeId: string; outcome: NodeOutcome }
      | { kind: 'node:paused'; nodeId: string; reason: 'breakpoint' | 'manual' | 'step' }
      | { kind: 'node:mock-applied'; nodeId: string; outcome: NodeOutcome },
  ) => void
  /**
   * Optional registries used by `deterministic` mode to enforce ADR-0009's
   * determinism rules before the first node runs. Ignored in other modes.
   */
  readonly deterministic?: {
    readonly agents?: ReadonlyArray<AgentRegistryEntry>
    readonly tools?: ReadonlyArray<ToolRegistryEntry>
    readonly randomnessSources?: ReadonlyArray<string>
  }
  /**
   * #205 — Snapshot sink. Called after each node (or every everyN nodes).
   */
  readonly snapshot?: SnapshotOptions
  /**
   * #206 — Pre-seeded outcomes from a prior run / branch. Nodes whose id
   * appears in the map are treated as already-completed and skipped.
   */
  readonly seedOutcomes?: ReadonlyMap<string, NodeOutcome>
  /**
   * #199 — Cancellation signal. Runner checks `signal.aborted` between nodes.
   * If aborted the run returns `{ status: 'cancelled', reason: 'os.flow.cancelled' }`.
   */
  readonly signal?: AbortSignal
  /**
   * #64 / P-5 — optional live-debugger hooks for breakpoints and mock injection.
   */
  readonly debugger?: FlowDebugger
  /**
   * #336 — workspace policy-as-code: evaluated at run start and before each `tool` node.
   */
  readonly workspacePolicyGate?: {
    readonly policy: WorkspacePolicyConfig
    readonly modelRef?: string
    readonly residencyRegion?: string
    readonly activeDomainPresets?: readonly string[]
    /** Optional tool tags (e.g. `destructive`) keyed by tool id for irreversible gates. */
    readonly toolTagsById?: ReadonlyMap<string, readonly string[]>
  }
}

const edgeMatches = (edge: FlowEdge, outcome: NodeOutcome): boolean => {
  switch (edge.on) {
    case 'always':
      return true
    case 'success':
      return outcome.kind === 'ok' || outcome.kind === 'skipped'
    case 'failure':
      return outcome.kind === 'failed'
    case 'true':
      return outcome.kind === 'ok' && outcome.value === true
    case 'false':
      return outcome.kind === 'ok' && outcome.value === false
  }
}

export const runFlow = async (flow: FlowConfig, opts: RunOptions): Promise<RunResult> => {
  // #199 — check before we do any real work
  if (opts.signal?.aborted) {
    return {
      status: 'cancelled',
      outcomes: new Map(),
      executedOrder: [],
      reason: 'os.flow.cancelled',
    }
  }

  const issues = auditGraph(flow)
  if (issues.length > 0) {
    return {
      status: 'failed',
      outcomes: new Map(),
      executedOrder: [],
      reason: `graph_audit: ${issues.map((i) => i.code).join(',')}`,
    }
  }

  if (opts.workspacePolicyGate) {
    const g = opts.workspacePolicyGate
    const decision = evaluateWorkspacePolicyAtRunStart({
      policy: g.policy,
      runMode: opts.ctx.runMode,
      ...(g.modelRef !== undefined ? { modelRef: g.modelRef } : {}),
      ...(g.residencyRegion !== undefined ? { residencyRegion: g.residencyRegion } : {}),
      ...(g.activeDomainPresets !== undefined ? { activeDomainPresets: g.activeDomainPresets } : {}),
    })
    if (!decision.allow) {
      const msg = decision.violations.map((v) => v.message).join('; ')
      return {
        status: 'failed',
        outcomes: new Map(),
        executedOrder: [],
        reason: `policy.workspace_blocked: ${msg}`,
      }
    }
  }

  if (opts.ctx.runMode === 'deterministic') {
    const detIssues = validateDeterministicFlow({
      flow,
      agents: opts.deterministic?.agents,
      tools: opts.deterministic?.tools,
      randomnessSources: opts.deterministic?.randomnessSources,
    })
    if (detIssues.length > 0) {
      return {
        status: 'failed',
        outcomes: new Map(),
        executedOrder: [],
        reason: `flow.determinism_violation: ${detIssues.map((i) => i.code).join(',')}`,
      }
    }
  }

  const handlers = applyModeStubs(opts.handlers, opts.ctx.runMode)

  const sorted = topoSort(flow)
  if (!sorted.ok) {
    return {
      status: 'failed',
      outcomes: new Map(),
      executedOrder: [],
      reason: `cycle: ${sorted.cycle.join(',')}`,
    }
  }

  const adj = buildAdjacency(flow.edges, flow.nodes.map((n) => n.id))
  const byId = new Map<string, FlowNode>(flow.nodes.map((n) => [n.id, n]))

  // #206 — seed prior outcomes; expand enabled set from them
  const outcomes = new Map<string, NodeOutcome>(opts.seedOutcomes ?? [])
  const executed: string[] = []
  const enabled = new Set<string>()

  if (outcomes.size === 0) {
    enabled.add(flow.entry)
  } else {
    // Re-derive the enabled set from the seeded outcomes
    for (const [id, outcome] of outcomes) {
      for (const next of adj.get(id) ?? []) {
        if (edgeMatches({ from: id, to: next.to, on: next.on }, outcome)) {
          enabled.add(next.to)
        }
      }
    }
    // Remove already-seeded nodes
    for (const id of outcomes.keys()) {
      enabled.delete(id)
    }
  }

  // #205 — snapshot emitter (created once; stateful counter inside)
  const emitSnapshot = opts.snapshot ? buildSnapshotEmitter(opts.snapshot) : null

  for (const id of sorted.order) {
    // #206 — skip seeded nodes
    if (outcomes.has(id) && !executed.includes(id)) continue
    if (!enabled.has(id)) continue
    const node = byId.get(id)
    if (!node) continue

    // #199 — check abort signal between nodes
    if (opts.signal?.aborted) {
      return {
        status: 'cancelled',
        outcomes,
        executedOrder: executed,
        stoppedAt: id,
        reason: 'os.flow.cancelled',
      }
    }

    const debugDecision = await opts.debugger?.beforeNode({ node, ctx: opts.ctx })
    if (debugDecision?.kind === 'pause') {
      opts.onEvent?.({ kind: 'node:paused', nodeId: id, reason: debugDecision.reason })
      return {
        status: 'paused',
        outcomes,
        executedOrder: executed,
        stoppedAt: id,
        reason: debugDecision.reason,
      }
    }

    opts.onEvent?.({ kind: 'node:start', nodeId: id })

    const handler = handlers[node.kind] as NodeHandler | undefined
    let outcome: NodeOutcome
    if (debugDecision?.kind === 'mock') {
      outcome = debugDecision.outcome
      opts.onEvent?.({ kind: 'node:mock-applied', nodeId: id, outcome })
    } else if (!handler) {
      outcome = {
        kind: 'failed',
        error: { code: 'flow.handler_missing', message: `no handler registered for kind "${node.kind}"` },
      }
    } else if (node.kind === 'tool' && opts.workspacePolicyGate) {
      const g = opts.workspacePolicyGate
      const toolId = node.tool
      const toolTags = g.toolTagsById?.get(toolId)
      const toolDecision = evaluateWorkspacePolicyBeforeTool(
        toolTags !== undefined
          ? { policy: g.policy, toolId, toolTags }
          : { policy: g.policy, toolId },
      )
      if (!toolDecision.allow) {
        const msg = toolDecision.violations.map((v) => v.message).join('; ')
        outcome = {
          kind: 'failed',
          error: { code: 'policy.tool_denied', message: msg },
        }
      } else if (toolDecision.requireHumanApproval) {
        outcome = { kind: 'paused', reason: 'hitl' }
      } else {
        try {
          outcome = await handler(node as never, opts.initialInput, opts.ctx)
        } catch (err) {
          outcome = {
            kind: 'failed',
            error: {
              code: 'flow.handler_threw',
              message: (err as Error).message ?? String(err),
            },
          }
        }
      }
    } else {
      try {
        outcome = await handler(node as never, opts.initialInput, opts.ctx)
      } catch (err) {
        outcome = {
          kind: 'failed',
          error: {
            code: 'flow.handler_threw',
            message: (err as Error).message ?? String(err),
          },
        }
      }
    }

    opts.debugger?.afterNode({ node, ctx: opts.ctx, outcome })
    outcomes.set(id, outcome)
    executed.push(id)

    if (opts.checkpoint) await opts.checkpoint(id, outcome, opts.ctx)
    opts.onEvent?.({ kind: 'node:end', nodeId: id, outcome })

    // #205 — emit snapshot after node completes
    if (emitSnapshot) {
      emitSnapshot({
        runId: opts.ctx.runId,
        flowId: flow.id,
        runMode: opts.ctx.runMode,
        executedOrder: executed,
        outcomes,
        enabledSet: enabled,
        startedAt: opts.ctx.startedAt,
      })
    }

    if (outcome.kind === 'failed') {
      return {
        status: 'failed',
        outcomes,
        executedOrder: executed,
        stoppedAt: id,
        reason: outcome.error.code,
      }
    }
    if (outcome.kind === 'paused') {
      return {
        status: 'paused',
        outcomes,
        executedOrder: executed,
        stoppedAt: id,
        reason: outcome.reason,
      }
    }

    for (const next of adj.get(id) ?? []) {
      if (edgeMatches({ from: id, to: next.to, on: next.on }, outcome)) {
        enabled.add(next.to)
      }
    }
  }

  const allSkipped = executed.length > 0 && executed.every((id) => outcomes.get(id)?.kind === 'skipped')
  return {
    status: allSkipped ? 'skipped' : 'completed',
    outcomes,
    executedOrder: executed,
  }
}
