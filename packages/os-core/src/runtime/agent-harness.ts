// Per #92 — agent harness primitives (spawn / kill / migrate).
// Pure state machine + registry; the caller injects host adapters that do
// the actual subprocess / cloud-pod work. The harness keeps a deterministic
// audit log so dashboards and tests can replay every transition.

export type HarnessAgentState =
  | 'spawning'
  | 'running'
  | 'migrating'
  | 'killed'
  | 'failed'

export type HarnessAgent = {
  readonly handleId: string
  readonly agentId: string
  readonly hostId: string
  readonly state: HarnessAgentState
  readonly spawnedAt: number
  readonly migratedFrom?: string
  readonly killedAt?: number
}

export type HarnessAuditEntry =
  | { readonly kind: 'spawned'; readonly handleId: string; readonly agentId: string; readonly hostId: string; readonly at: number }
  | { readonly kind: 'killed'; readonly handleId: string; readonly at: number; readonly reason: string }
  | { readonly kind: 'migrated'; readonly handleId: string; readonly fromHostId: string; readonly toHostId: string; readonly at: number }
  | { readonly kind: 'failed'; readonly handleId: string; readonly at: number; readonly error: string }

export type HarnessOpts = {
  readonly clock?: () => number
  readonly nextHandleId?: () => string
}

export type HarnessSpawnArgs = {
  agentId: string
  hostId: string
}

export type HarnessListFilter = {
  state?: HarnessAgentState
  agentId?: string
  hostId?: string
}

export type AgentHarness = {
  readonly spawn: (args: HarnessSpawnArgs) => HarnessAgent
  readonly kill: (handleId: string, reason?: string) => HarnessAgent
  readonly migrate: (handleId: string, toHostId: string) => HarnessAgent
  readonly markFailed: (handleId: string, error: string) => HarnessAgent
  readonly markRunning: (handleId: string) => HarnessAgent
  readonly get: (handleId: string) => HarnessAgent | undefined
  readonly list: (filter?: HarnessListFilter) => readonly HarnessAgent[]
  readonly audit: () => readonly HarnessAuditEntry[]
}

const defaultIds = (): (() => string) => {
  let n = 0
  return () => {
    n += 1
    return `h-${n.toString(16).padStart(4, '0')}`
  }
}

const must = (existing: HarnessAgent | undefined, handleId: string): HarnessAgent => {
  if (existing === undefined) throw new Error(`agent-harness: handle not found: ${handleId}`)
  return existing
}

const requireState = (
  agent: HarnessAgent,
  allowed: readonly HarnessAgentState[],
  op: string,
): void => {
  if (!allowed.includes(agent.state)) {
    throw new Error(
      `agent-harness: cannot ${op} handle ${agent.handleId} from state=${agent.state}`,
    )
  }
}

/**
 * Build an in-memory agent harness (#92). Pure: caller drives the clock and
 * id generator (or accept the defaults) and wires real spawn / kill side
 * effects on top of the state transitions emitted here.
 */
export const createAgentHarness = (opts: HarnessOpts = {}): AgentHarness => {
  const clock = opts.clock ?? Date.now
  const nextId = opts.nextHandleId ?? defaultIds()
  const handles = new Map<string, HarnessAgent>()
  const audit: HarnessAuditEntry[] = []

  const update = (next: HarnessAgent): HarnessAgent => {
    handles.set(next.handleId, next)
    return next
  }

  return {
    spawn: ({ agentId, hostId }) => {
      const handleId = nextId()
      const at = clock()
      const agent: HarnessAgent = {
        handleId,
        agentId,
        hostId,
        state: 'spawning',
        spawnedAt: at,
      }
      handles.set(handleId, agent)
      audit.push({ kind: 'spawned', handleId, agentId, hostId, at })
      return agent
    },
    kill: (handleId, reason = 'requested') => {
      const existing = must(handles.get(handleId), handleId)
      requireState(existing, ['spawning', 'running', 'migrating', 'failed'], 'kill')
      const at = clock()
      audit.push({ kind: 'killed', handleId, at, reason })
      return update({ ...existing, state: 'killed', killedAt: at })
    },
    migrate: (handleId, toHostId) => {
      const existing = must(handles.get(handleId), handleId)
      requireState(existing, ['running'], 'migrate')
      const at = clock()
      audit.push({ kind: 'migrated', handleId, fromHostId: existing.hostId, toHostId, at })
      return update({
        ...existing,
        state: 'running',
        hostId: toHostId,
        migratedFrom: existing.hostId,
      })
    },
    markRunning: (handleId) => {
      const existing = must(handles.get(handleId), handleId)
      requireState(existing, ['spawning', 'migrating'], 'markRunning')
      return update({ ...existing, state: 'running' })
    },
    markFailed: (handleId, error) => {
      const existing = must(handles.get(handleId), handleId)
      requireState(existing, ['spawning', 'running', 'migrating'], 'markFailed')
      const at = clock()
      audit.push({ kind: 'failed', handleId, at, error })
      return update({ ...existing, state: 'failed' })
    },
    get: (handleId) => handles.get(handleId),
    list: (filter) => {
      const all = [...handles.values()].sort((a, b) => a.spawnedAt - b.spawnedAt)
      if (!filter) return all
      return all.filter(
        (h) =>
          (filter.state === undefined || h.state === filter.state)
          && (filter.agentId === undefined || h.agentId === filter.agentId)
          && (filter.hostId === undefined || h.hostId === filter.hostId),
      )
    },
    audit: () => [...audit],
  }
}
