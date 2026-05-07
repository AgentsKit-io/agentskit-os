// Per #63 — Temporal-style durable execution helpers.
// Pure: caller-driven activity ledger + signal channel that turn an async
// function into a replayable workflow on top of the existing CheckpointStore
// contract. No timers; the caller schedules replays.

export type ActivityResult<T> =
  | { readonly kind: 'completed'; readonly value: T }
  | { readonly kind: 'failed'; readonly error: string }

export type ActivityLedger = {
  readonly hasCompleted: (id: string) => boolean
  readonly resultFor: <T>(id: string) => ActivityResult<T> | undefined
  readonly record: <T>(id: string, result: ActivityResult<T>) => void
  readonly snapshot: () => Readonly<Record<string, ActivityResult<unknown>>>
}

/** Build a fresh in-memory activity ledger (#63). */
export const createActivityLedger = (
  initial?: Readonly<Record<string, ActivityResult<unknown>>>,
): ActivityLedger => {
  const map = new Map<string, ActivityResult<unknown>>(
    initial !== undefined ? Object.entries(initial) : [],
  )
  return {
    hasCompleted: (id) => map.has(id),
    resultFor: <T>(id: string) => map.get(id) as ActivityResult<T> | undefined,
    record: (id, result) => {
      map.set(id, result)
    },
    snapshot: () => {
      const out: Record<string, ActivityResult<unknown>> = {}
      for (const [k, v] of map) out[k] = v
      return out
    },
  }
}

/**
 * Run an activity once + checkpoint it (#63). On replay, returns the prior
 * result without re-invoking `fn`. `id` must be deterministic across replays.
 */
export const runActivity = async <T>(
  ledger: ActivityLedger,
  id: string,
  fn: () => Promise<T>,
): Promise<ActivityResult<T>> => {
  const prior = ledger.resultFor<T>(id)
  if (prior !== undefined) return prior
  try {
    const value = await fn()
    const result: ActivityResult<T> = { kind: 'completed', value }
    ledger.record(id, result)
    return result
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    const result: ActivityResult<T> = { kind: 'failed', error }
    ledger.record(id, result)
    return result
  }
}

export type SignalChannel<T = unknown> = {
  readonly send: (signal: T) => void
  readonly drain: () => readonly T[]
  readonly peek: () => readonly T[]
}

/**
 * Build a deterministic in-memory signal channel (#63). Caller drains the
 * channel during workflow replay; signals never time-travel.
 */
export const createSignalChannel = <T = unknown>(): SignalChannel<T> => {
  let pending: T[] = []
  return {
    send: (signal) => {
      pending = [...pending, signal]
    },
    drain: () => {
      const out = pending
      pending = []
      return out
    },
    peek: () => [...pending],
  }
}
