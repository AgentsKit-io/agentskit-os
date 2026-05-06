// Per #214 — decision-log primitive: "why did the agent pick tool X?".
// Pure shape + appender. Caller wires storage; this module produces
// deterministic entries from the per-step context the runtime captures.

export type DecisionAlternative = {
  readonly id: string
  readonly score?: number
  readonly note?: string
}

export type DecisionLogEntry = {
  readonly schemaVersion: '1.0'
  readonly entryId: string
  readonly runId: string
  readonly nodeId: string
  readonly agentId: string
  readonly at: string
  /** What the agent chose: tool id, branch outcome, sub-flow id. */
  readonly chosen: string
  readonly choiceKind: 'tool' | 'branch' | 'sub-flow' | 'agent' | 'other'
  /** Free-text rationale captured from the agent's reasoning. */
  readonly rationale: string
  /** Alternative options considered (with optional scores). */
  readonly alternatives: readonly DecisionAlternative[]
  /** Optional confidence 0..1. */
  readonly confidence?: number
  /** Optional list of input fields that drove the decision. */
  readonly inputs?: readonly string[]
  readonly tags: readonly string[]
}

export type DecisionLogInput = Omit<DecisionLogEntry, 'schemaVersion' | 'entryId' | 'at' | 'tags' | 'alternatives'> & {
  readonly entryId?: string
  readonly at?: string
  readonly tags?: readonly string[]
  readonly alternatives?: readonly DecisionAlternative[]
}

const defaultClock = (): string => new Date().toISOString()

/**
 * Build a single decision-log entry (#214). Pure: defaults applied for
 * `entryId` (run+node-derived), `at` (caller clock), `alternatives` (empty),
 * and `tags` (empty).
 */
export type BuildDecisionLogOpts = {
  readonly clock?: () => string
}

const resolveAt = (provided: string | undefined, opts: BuildDecisionLogOpts): string => {
  if (provided !== undefined) return provided
  const clock = opts.clock ?? defaultClock
  return clock()
}

export const buildDecisionLogEntry = (
  input: DecisionLogInput,
  opts: BuildDecisionLogOpts = {},
): DecisionLogEntry => {
  const at = resolveAt(input.at, opts)
  return {
    schemaVersion: '1.0',
    entryId: input.entryId ?? `${input.runId}:${input.nodeId}:${at}`,
    runId: input.runId,
    nodeId: input.nodeId,
    agentId: input.agentId,
    at,
    chosen: input.chosen,
    choiceKind: input.choiceKind,
    rationale: input.rationale,
    alternatives: input.alternatives ?? [],
    ...(input.confidence !== undefined ? { confidence: input.confidence } : {}),
    ...(input.inputs !== undefined ? { inputs: input.inputs } : {}),
    tags: input.tags ?? [],
  }
}

export type DecisionLogQuery = {
  readonly runId?: string
  readonly nodeId?: string
  readonly agentId?: string
  readonly choiceKind?: DecisionLogEntry['choiceKind']
  readonly chosen?: string
}

/** Filter helper for dashboards (#214). Pure; no I/O. */
export const filterDecisionLog = (
  entries: readonly DecisionLogEntry[],
  query: DecisionLogQuery,
): readonly DecisionLogEntry[] =>
  entries.filter(
    (e) =>
      (query.runId === undefined || e.runId === query.runId)
      && (query.nodeId === undefined || e.nodeId === query.nodeId)
      && (query.agentId === undefined || e.agentId === query.agentId)
      && (query.choiceKind === undefined || e.choiceKind === query.choiceKind)
      && (query.chosen === undefined || e.chosen === query.chosen),
  )
