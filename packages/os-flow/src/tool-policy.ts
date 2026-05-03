// Tool-side policy gate per ADR-0010.
//
// Wraps a host-provided "real" tool handler with the side-effect × run-mode
// decision matrix and the sandbox-level decision. Never invokes the real
// handler when the matrix says block / stub / replay / mocked. Surfaces
// every decision to an optional callback so audit emitters can publish
// `tool.invoke.denied` / `tool.invoke.escalated` (ADR-0005) events.
//
// This file does *not* run sandboxes. It only resolves the policy. The
// caller wires the chosen `SandboxLevel` into a SandboxRegistry from
// @agentskit/os-sandbox.

import {
  decideSandbox,
  decideToolAction,
  type ModeAction,
  type RunContext,
  type SandboxDecision,
  type SandboxLevel,
  type SideEffect,
  type ToolManifest,
} from '@agentskit/os-core'
import type { NodeHandler } from './handlers.js'

export interface ToolManifestRegistry {
  /** Returns undefined when the tool id is unknown. */
  get(toolId: string): ToolManifest | undefined
}

/** In-memory registry. Hosts wanting persistence implement the interface. */
export class InMemoryToolManifestRegistry implements ToolManifestRegistry {
  private readonly map = new Map<string, ToolManifest>()
  constructor(initial: readonly ToolManifest[] = []) {
    for (const m of initial) this.map.set(m.id, m)
  }
  register(manifest: ToolManifest): void {
    this.map.set(manifest.id, manifest)
  }
  get(toolId: string): ToolManifest | undefined {
    return this.map.get(toolId)
  }
}

export type ToolPolicyDecisionEvent =
  | {
      kind: 'allowed'
      toolId: string
      runMode: RunContext['runMode']
      severity: SideEffect
      action: ModeAction
      sandbox: SandboxLevel
      manifestFound: boolean
    }
  | {
      kind: 'denied'
      toolId: string
      runMode: RunContext['runMode']
      severity: SideEffect
      action: ModeAction
      reason: string
    }
  | {
      kind: 'escalated'
      toolId: string
      runMode: RunContext['runMode']
      severity: SideEffect
      requested?: SandboxLevel
      applied: SandboxLevel
      reason: string
    }

export interface PolicyToolHandlerOptions {
  readonly registry: ToolManifestRegistry
  readonly realHandler: NodeHandler<'tool'>
  /** Optional workspace-level sandbox elevation. */
  readonly requestedSandbox?: SandboxLevel
  /** Allow weakening below the side-effect minimum. ADR-0010 § "Default policy matrix". */
  readonly forceWeakSandbox?: boolean
  readonly onDecision?: (event: ToolPolicyDecisionEvent) => void
}

type SkipReason = 'preview' | 'replay' | 'dry_run' | 'simulate'

const SKIP_REASON_BY_ACTION: Partial<Record<ModeAction, SkipReason>> = {
  stub: 'dry_run',
  replay: 'replay',
  'replay-no-op': 'replay',
  mocked: 'simulate',
}

const isInvocationAction = (action: ModeAction): boolean =>
  action === 'run' ||
  action === 'run-with-audit' ||
  action === 'run-with-audit-and-egress-check' ||
  action === 'run-require-fixture'

/**
 * Returns a tool NodeHandler that consults ADR-0010's policy before invoking
 * the real handler.
 *
 * Behavior:
 *  - Missing manifest → treated as `external` (most restrictive). Still
 *    surfaces a decision event with `manifestFound: false` so hosts can lint.
 *  - `block` → `failed { code: 'os.security.tool_blocked' }`
 *  - `stub` / `replay*` / `mocked` → `skipped { reason: <mode> }`
 *  - `run*` → invokes the real handler.
 *  - Sandbox `reject` → `failed { code: 'os.security.sandbox_reject' }`
 */
export const createPolicyToolHandler = (
  opts: PolicyToolHandlerOptions,
): NodeHandler<'tool'> => {
  return async (node, input, ctx) => {
    const manifest = opts.registry.get(node.tool)
    const effects: readonly SideEffect[] = manifest?.sideEffects ?? ['external']
    const { action, severity } = decideToolAction(ctx.runMode, effects)

    if (action === 'block') {
      const reason = `tool "${node.tool}" blocked: severity="${severity}" mode="${ctx.runMode}"`
      opts.onDecision?.({
        kind: 'denied',
        toolId: node.tool,
        runMode: ctx.runMode,
        severity,
        action,
        reason,
      })
      return {
        kind: 'failed',
        error: { code: 'os.security.tool_blocked', message: reason },
      }
    }

    const skipReason = SKIP_REASON_BY_ACTION[action]
    if (skipReason !== undefined) {
      opts.onDecision?.({
        kind: 'allowed',
        toolId: node.tool,
        runMode: ctx.runMode,
        severity,
        action,
        sandbox: 'none',
        manifestFound: manifest !== undefined,
      })
      return { kind: 'skipped', reason: skipReason }
    }

    if (!isInvocationAction(action)) {
      // Unknown action — fail closed.
      const reason = `tool "${node.tool}" unknown policy action "${action}"`
      opts.onDecision?.({
        kind: 'denied',
        toolId: node.tool,
        runMode: ctx.runMode,
        severity,
        action,
        reason,
      })
      return {
        kind: 'failed',
        error: { code: 'os.security.tool_blocked', message: reason },
      }
    }

    const requested = opts.requestedSandbox ?? manifest?.minSandbox
    const sandboxDecision: SandboxDecision = decideSandbox(
      effects,
      requested,
      opts.forceWeakSandbox === true,
    )

    if (sandboxDecision.kind === 'reject') {
      opts.onDecision?.({
        kind: 'denied',
        toolId: node.tool,
        runMode: ctx.runMode,
        severity,
        action,
        reason: sandboxDecision.reason,
      })
      return {
        kind: 'failed',
        error: { code: 'os.security.sandbox_reject', message: sandboxDecision.reason },
      }
    }

    const isEscalation =
      (requested !== undefined && requested !== sandboxDecision.level) ||
      sandboxDecision.reason.startsWith('WARN')
    if (isEscalation) {
      const escalation: ToolPolicyDecisionEvent = {
        kind: 'escalated',
        toolId: node.tool,
        runMode: ctx.runMode,
        severity,
        applied: sandboxDecision.level,
        reason: sandboxDecision.reason,
      }
      if (requested !== undefined) escalation.requested = requested
      opts.onDecision?.(escalation)
    } else {
      opts.onDecision?.({
        kind: 'allowed',
        toolId: node.tool,
        runMode: ctx.runMode,
        severity,
        action,
        sandbox: sandboxDecision.level,
        manifestFound: manifest !== undefined,
      })
    }

    return opts.realHandler(node, input, ctx)
  }
}
