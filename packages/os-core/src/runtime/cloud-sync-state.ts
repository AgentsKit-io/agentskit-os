// Per #122 — hosted workspace sync state machine + delta computer.
// Pure: state graph for sync transitions + a simple delta diff between
// local and remote workspace bundle digests.

export type SyncState = 'idle' | 'pulling' | 'pushing' | 'conflicted' | 'synced' | 'errored'

const ALLOWED: ReadonlySet<string> = new Set([
  'idle>pulling',
  'idle>pushing',
  'pulling>synced',
  'pulling>conflicted',
  'pulling>errored',
  'pushing>synced',
  'pushing>conflicted',
  'pushing>errored',
  'conflicted>pulling',
  'conflicted>pushing',
  'conflicted>idle',
  'synced>idle',
  'errored>idle',
  'errored>pulling',
  'errored>pushing',
])

export const isSyncTransitionAllowed = (from: SyncState, to: SyncState): boolean =>
  ALLOWED.has(`${from}>${to}`)

export type SyncTransition =
  | { readonly ok: true; readonly state: SyncState }
  | { readonly ok: false; readonly reason: string }

export const transitionSyncState = (from: SyncState, to: SyncState): SyncTransition => {
  if (!isSyncTransitionAllowed(from, to)) {
    return { ok: false, reason: `cloud-sync: transition not allowed: ${from} → ${to}` }
  }
  return { ok: true, state: to }
}

export type SyncDelta = {
  readonly inSync: boolean
  readonly localOnly: readonly string[]
  readonly remoteOnly: readonly string[]
  readonly diverged: readonly { readonly id: string; readonly localHash: string; readonly remoteHash: string }[]
}

/**
 * Compute the delta between two id→hash maps (#122). Pure; deterministic.
 * Caller computes the hashes (e.g. via the workspace bundle integrity).
 */
export const computeSyncDelta = (
  local: ReadonlyMap<string, string>,
  remote: ReadonlyMap<string, string>,
): SyncDelta => {
  const localOnly: string[] = []
  const remoteOnly: string[] = []
  const diverged: { id: string; localHash: string; remoteHash: string }[] = []

  for (const [id, hash] of local) {
    const remoteHash = remote.get(id)
    if (remoteHash === undefined) localOnly.push(id)
    else if (remoteHash !== hash) diverged.push({ id, localHash: hash, remoteHash })
  }
  for (const id of remote.keys()) {
    if (!local.has(id)) remoteOnly.push(id)
  }

  localOnly.sort()
  remoteOnly.sort()
  diverged.sort((a, b) => a.id.localeCompare(b.id))

  return {
    inSync: localOnly.length === 0 && remoteOnly.length === 0 && diverged.length === 0,
    localOnly,
    remoteOnly,
    diverged,
  }
}
