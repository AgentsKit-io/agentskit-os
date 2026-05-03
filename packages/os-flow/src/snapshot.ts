// Event-sourced RunSnapshot for time-travel debug (#205).
// Pure schema + capture function — zero I/O.

import { z } from 'zod'
import type { RunMode } from '@agentskit/os-core'
import type { NodeOutcome } from './handlers.js'
import type { RunResult } from './runner.js'

// ── Serialisable outcome (Map ➜ array of [nodeId, outcome] pairs) ────────────

const NodeOutcomeZ: z.ZodType<NodeOutcome> = z.union([
  z.object({ kind: z.literal('ok'), value: z.unknown() }),
  z.object({
    kind: z.literal('failed'),
    error: z.object({ code: z.string(), message: z.string() }),
  }),
  z.object({
    kind: z.literal('paused'),
    reason: z.enum(['hitl', 'budget', 'consent', 'cancelled']),
  }),
  z.object({
    kind: z.literal('skipped'),
    reason: z.enum(['preview', 'replay', 'dry_run', 'simulate']),
  }),
])

// ── RunSnapshot schema ───────────────────────────────────────────────────────

export const RunSnapshot = z.object({
  /** The run this snapshot belongs to. */
  runId: z.string().min(1).max(64),
  /** The flow definition id. */
  flowId: z.string().min(1).max(128),
  /** Run mode at capture time. */
  runMode: z.enum(['real', 'preview', 'dry_run', 'replay', 'simulate', 'deterministic']),
  /**
   * Node ids in execution order up to the snapshot point.
   * Useful as a topo-ordered breadcrumb for replay.
   */
  executedOrder: z.array(z.string()),
  /**
   * Serialised outcomes: array of [nodeId, outcome] so the map can be
   * round-tripped through JSON / Zod.
   */
  outcomes: z.array(z.tuple([z.string(), NodeOutcomeZ])),
  /** Node ids that were in the enabled set when the snapshot was taken. */
  enabledSet: z.array(z.string()),
  /** ISO-8601 when the run started. */
  startedAt: z.string().datetime({ offset: true }),
  /** ISO-8601 when this snapshot was captured. */
  snapshotAt: z.string().datetime({ offset: true }),
})
export type RunSnapshot = z.infer<typeof RunSnapshot>

// ── Input type for captureSnapshot ──────────────────────────────────────────

export type SnapshotInput = {
  readonly runId: string
  readonly flowId: string
  readonly runMode: RunMode
  readonly executedOrder: readonly string[]
  readonly outcomes: ReadonlyMap<string, NodeOutcome>
  readonly enabledSet: ReadonlySet<string>
  readonly startedAt: string
  readonly now?: () => string
}

/**
 * Captures an immutable `RunSnapshot` from the live runner state.
 * Returns a validated snapshot (throws if inputs are malformed).
 */
export const captureSnapshot = (input: SnapshotInput): RunSnapshot => {
  const now = input.now ?? (() => new Date().toISOString())
  return RunSnapshot.parse({
    runId: input.runId,
    flowId: input.flowId,
    runMode: input.runMode,
    executedOrder: [...input.executedOrder],
    outcomes: [...input.outcomes.entries()],
    enabledSet: [...input.enabledSet],
    startedAt: input.startedAt,
    snapshotAt: now(),
  })
}

/**
 * Reconstructs a `Map<string, NodeOutcome>` from the serialised outcomes
 * array stored in a `RunSnapshot`.
 */
export const outcomesFromSnapshot = (snap: RunSnapshot): Map<string, NodeOutcome> =>
  new Map(snap.outcomes)

/**
 * Options for the runner's snapshot sink.
 */
export type SnapshotOptions = {
  /** Called with each captured snapshot. */
  readonly onSnapshot: (snap: RunSnapshot) => void
  /**
   * Emit a snapshot every N completed nodes.
   * Default 1 → after every node.
   */
  readonly everyN?: number
}

/**
 * Build a stateful helper that honours the everyN policy.
 * Returns a function `(state: SnapshotInput) => void` to be called
 * after each node completes.
 */
export const buildSnapshotEmitter = (
  opts: SnapshotOptions,
): ((state: SnapshotInput) => void) => {
  const every = Math.max(1, opts.everyN ?? 1)
  let count = 0
  return (state: SnapshotInput): void => {
    count += 1
    if (count % every === 0) {
      opts.onSnapshot(captureSnapshot(state))
    }
  }
}
