// Two-person HITL approval for irreversibility:high nodes (#188).
// Host injects the approverGate; this file is pure async logic.
//
// Distinct from `@agentskit/os-runtime` `createHumanHandler`, which wraps a
// `HumanReviewer` adapter (prompt + approvers list, no quorum gate).

import type { HumanNode, RunContext } from '@agentskit/os-core'
import type { NodeOutcome } from './handlers.js'

/** Decision returned by the host-injected approver gate. */
export type ApproverGateDecision = {
  readonly status: 'approved' | 'rejected'
  /** Ids of the principals that have signed off. */
  readonly signers: readonly string[]
}

/**
 * Host-injected gate function.
 *
 * Called once per human node execution. The host is responsible for
 * collecting signatures (e.g. from a UI, webhook, or message bus) before
 * resolving the promise.
 *
 * If `quorum` signers return `approved` the gate should resolve
 * `{ status: 'approved', signers: [...] }`.  If any signer rejects before
 * quorum is reached the gate should resolve `{ status: 'rejected', signers }`.
 */
export type ApproverGate = (
  node: HumanNode,
  ctx: RunContext,
) => Promise<ApproverGateDecision>

export type HumanHandlerOptions = {
  /** Host-provided gate that collects approvals / rejections. */
  readonly approverGate: ApproverGate
}

/**
 * Creates a handler for `human` nodes that enforces a quorum requirement.
 *
 * The quorum is read from `node.quorum` (default 1). If the gate returns
 * fewer signers than the quorum the handler emits `paused` so the durable
 * runner can checkpoint and retry later.
 *
 * Behaviour:
 * - `approved` with enough signers → `{ kind: 'ok', value: decision }`
 * - `rejected` by any signer → `{ kind: 'failed', error: { code: 'os.flow.hitl_quorum_unmet' } }`
 * - `approved` but insufficient signers → `{ kind: 'paused', reason: 'hitl' }`
 */
export const createHumanHandler = (
  opts: HumanHandlerOptions,
): ((node: HumanNode, input: unknown, ctx: RunContext) => Promise<NodeOutcome>) => {
  return async (node: HumanNode, _input: unknown, ctx: RunContext): Promise<NodeOutcome> => {
    // quorum may not be on the base HumanNode type yet; fall back to 1.
    const quorum: number = (node as HumanNode & { quorum?: number }).quorum ?? 1

    let decision: ApproverGateDecision
    try {
      decision = await opts.approverGate(node, ctx)
    } catch (err) {
      return {
        kind: 'failed',
        error: {
          code: 'os.flow.hitl_quorum_unmet',
          message: `Approver gate threw: ${(err as Error).message ?? String(err)}`,
        },
      }
    }

    if (decision.status === 'rejected') {
      return {
        kind: 'failed',
        error: {
          code: 'os.flow.hitl_quorum_unmet',
          message: `Human approval rejected by signer(s): ${decision.signers.join(', ')}`,
        },
      }
    }

    // Approved — check quorum
    if (decision.signers.length < quorum) {
      // Not enough signers yet — pause so the durable runner can retry
      return { kind: 'paused', reason: 'hitl' }
    }

    return { kind: 'ok', value: decision }
  }
}
