// Engine plumbing for ADR-0009 RunMode. Pure functions — no I/O.
//
// Responsibilities:
//   1. Auto-apply mode-appropriate stubs to a host's handler map so missing
//      handlers don't fail in non-real modes (`dry_run`, `replay`, `simulate`).
//   2. Run determinism validation up front when mode === 'deterministic',
//      surfacing flow.determinism_violation issues before any handler executes.
//
// Tool-side enforcement (preview blocks writes; sandbox levels) is ADR-0010
// territory and lives in os-sandbox + tool registry.

import {
  type DeterminismIssue,
  type FlowConfig,
  type RunMode,
  RUN_MODE_POLICY,
  checkDeterminism,
} from '@agentskit/os-core'
import {
  composeHandlers,
  defaultStubHandlers,
  type NodeHandlerMap,
} from './handlers.js'

/**
 * True for modes whose policy dictates that missing handlers should fall
 * back to a "skipped" stub instead of failing with `flow.handler_missing`.
 */
const STUB_REASON_BY_MODE: Partial<Record<RunMode, 'preview' | 'replay' | 'dry_run' | 'simulate'>> = {
  dry_run: 'dry_run',
  replay: 'replay',
  simulate: 'simulate',
  preview: 'preview',
}

/**
 * Returns a handler map whose missing entries are filled with mode-appropriate
 * stubs. Existing host-provided handlers always win.
 *
 * - `real` / `deterministic` — pass-through. Real execution required.
 * - `dry_run` / `replay` / `simulate` / `preview` — stub fallback for any kind
 *   not explicitly handled by the host.
 */
export const applyModeStubs = (
  userHandlers: NodeHandlerMap,
  runMode: RunMode,
): NodeHandlerMap => {
  const reason = STUB_REASON_BY_MODE[runMode]
  if (!reason) return userHandlers
  return composeHandlers(defaultStubHandlers(reason), userHandlers)
}

/**
 * Determinism input adapter: extracts agents, tools, and randomness sources
 * from a `FlowConfig` plus a host-provided registry of agent and tool
 * definitions. Returns issues per ADR-0009 §"Determinism enforcement".
 *
 * Hosts that want a stricter check can call `checkDeterminism` from os-core
 * directly with a richer input.
 */
export type AgentRegistryEntry = {
  readonly id: string
  readonly model: { provider: string; model: string; temperature?: number }
}
export type ToolRegistryEntry = {
  readonly id: string
  readonly deterministicStub?: boolean
}

export type DeterminismValidationInput = {
  readonly flow: FlowConfig
  readonly agents?: ReadonlyArray<AgentRegistryEntry> | undefined
  readonly tools?: ReadonlyArray<ToolRegistryEntry> | undefined
  readonly randomnessSources?: ReadonlyArray<string> | undefined
}

const collectFlowAgents = (flow: FlowConfig): readonly string[] => {
  const out = new Set<string>()
  for (const n of flow.nodes) {
    switch (n.kind) {
      case 'agent':
        out.add(n.agent)
        break
      case 'compare':
      case 'vote':
      case 'blackboard':
        for (const a of n.agents) out.add(a)
        break
      case 'debate':
        out.add(n.proponent)
        out.add(n.opponent)
        out.add(n.judge)
        break
      case 'auction':
        for (const a of n.bidders) out.add(a)
        if (n.customScorer) out.add(n.customScorer)
        if (n.fallback) out.add(n.fallback)
        break
    }
  }
  return [...out]
}

const collectFlowTools = (flow: FlowConfig): readonly string[] => {
  const out = new Set<string>()
  for (const n of flow.nodes) {
    if (n.kind === 'tool') out.add(n.tool)
  }
  return [...out]
}

export const validateDeterministicFlow = (
  input: DeterminismValidationInput,
): readonly DeterminismIssue[] => {
  const usedAgents = new Set(collectFlowAgents(input.flow))
  const usedTools = new Set(collectFlowTools(input.flow))

  const agents = (input.agents ?? []).filter((a) => usedAgents.has(a.id))
  const tools = (input.tools ?? []).filter((t) => usedTools.has(t.id))

  // Surface registry gaps as missing-stub style issues so the host can see
  // which agent/tool lacks a deterministic registration.
  const issues: DeterminismIssue[] = []
  for (const id of usedAgents) {
    if (!agents.some((a) => a.id === id)) {
      issues.push({
        path: ['agents', id],
        code: 'unpinned_model',
        message: `agent "${id}" referenced by flow but not in deterministic registry`,
      })
    }
  }
  for (const id of usedTools) {
    if (!tools.some((t) => t.id === id)) {
      issues.push({
        path: ['tools', id],
        code: 'missing_stub',
        message: `tool "${id}" referenced by flow but not in deterministic registry`,
      })
    }
  }

  const detInput: {
    agents: ReadonlyArray<AgentRegistryEntry>
    tools: ReadonlyArray<ToolRegistryEntry>
    randomnessSources?: ReadonlyArray<string>
  } = { agents, tools }
  if (input.randomnessSources !== undefined) {
    detInput.randomnessSources = input.randomnessSources
  }
  return [...issues, ...checkDeterminism(detInput)]
}

/**
 * Convenience: returns the policy record for a mode (re-exported from os-core
 * so flow consumers don't need to deep-import).
 */
export const policyForMode = (runMode: RunMode) => RUN_MODE_POLICY[runMode]
