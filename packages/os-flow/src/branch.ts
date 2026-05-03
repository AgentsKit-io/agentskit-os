// Branch-from-past-step replay (#206).
// Validates a branch point against a RunSnapshot, truncates history to that
// point, and returns a seed ready to hand to a fresh runFlow invocation.

import type { FlowConfig } from '@agentskit/os-core'
import type { NodeHandlerMap, NodeOutcome } from './handlers.js'
import { outcomesFromSnapshot, type RunSnapshot } from './snapshot.js'

export class FlowBranchError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'FlowBranchError'
    this.code = code
  }
}

export type BranchOverride = {
  /**
   * Arbitrary input patch injected into the new run's `initialInput`.
   * Host must interpret; the runner carries it transparently.
   */
  readonly inputPatch?: unknown
  /**
   * Per-kind handler overrides to swap in for the new branch run.
   */
  readonly handlerOverrides?: Partial<NodeHandlerMap>
}

export type BranchResult = {
  /**
   * Outcomes for nodes up to (but not including) the branch point.
   * Pass as `seedOutcomes` to `runFlow`.
   */
  readonly seedOutcomes: ReadonlyMap<string, NodeOutcome>
  /**
   * Execution order up to (but not including) the branch point.
   */
  readonly executedOrder: readonly string[]
  /** The run id this branch was forked from. */
  readonly parentRunId: string
  /**
   * The resolved initial input for the new run (with inputPatch applied if
   * provided).  Host is responsible for interpreting the merge semantics.
   */
  readonly initialInput?: unknown
  /** Handler overrides from the override param (if any). */
  readonly handlerOverrides?: Partial<NodeHandlerMap>
}

export type BranchFromSnapshotOptions = {
  /** The snapshot to branch from. */
  readonly snapshot: RunSnapshot
  /** The flow definition (used for validation only in this function). */
  readonly flow: FlowConfig
  /**
   * The node id at which to branch.
   * This node will be re-executed from scratch; all nodes before it in
   * `executedOrder` will be seeded from the snapshot.
   */
  readonly branchPoint: string
  /** Optional overrides for the new branch. */
  readonly override?: BranchOverride
}

/**
 * Creates a branch from a `RunSnapshot` at a given `branchPoint`.
 *
 * Throws `FlowBranchError` with code `os.flow.invalid_branch_point` if
 * `branchPoint` is not in `snapshot.executedOrder`.
 */
export const branchFromSnapshot = (opts: BranchFromSnapshotOptions): BranchResult => {
  const { snapshot, branchPoint, override } = opts

  const idx = snapshot.executedOrder.indexOf(branchPoint)
  if (idx === -1) {
    throw new FlowBranchError(
      'os.flow.invalid_branch_point',
      `Branch point "${branchPoint}" was not found in snapshot executedOrder: [${snapshot.executedOrder.join(', ')}]`,
    )
  }

  // Nodes executed before the branch point — these are re-used as seeds.
  const priorOrder = snapshot.executedOrder.slice(0, idx)

  // Reconstruct the full outcomes map from the snapshot, then filter to prior.
  const allOutcomes = outcomesFromSnapshot(snapshot)
  const seedOutcomes = new Map<string, NodeOutcome>()
  for (const id of priorOrder) {
    const o = allOutcomes.get(id)
    if (o) seedOutcomes.set(id, o)
  }

  // Build result conditionally to satisfy exactOptionalPropertyTypes
  if (override?.inputPatch !== undefined && override?.handlerOverrides !== undefined) {
    return {
      seedOutcomes,
      executedOrder: priorOrder,
      parentRunId: snapshot.runId,
      initialInput: override.inputPatch,
      handlerOverrides: override.handlerOverrides,
    }
  }

  if (override?.inputPatch !== undefined) {
    return {
      seedOutcomes,
      executedOrder: priorOrder,
      parentRunId: snapshot.runId,
      initialInput: override.inputPatch,
    }
  }

  if (override?.handlerOverrides !== undefined) {
    return {
      seedOutcomes,
      executedOrder: priorOrder,
      parentRunId: snapshot.runId,
      handlerOverrides: override.handlerOverrides,
    }
  }

  return {
    seedOutcomes,
    executedOrder: priorOrder,
    parentRunId: snapshot.runId,
  }
}
