// Per #243 — graceful degradation primitive.
// Pure: caller wires N attempt functions in priority order; the helper runs
// them sequentially until one returns ok or the list is exhausted, surfacing
// per-attempt outcomes for observability.

export type DegradationAttempt<T> = {
  readonly id: string
  readonly run: () => Promise<T>
  /** Optional gate; when present and false, skip this attempt. */
  readonly enabled?: boolean
}

export type DegradationOutcome<T> =
  | { readonly id: string; readonly status: 'ok'; readonly value: T }
  | { readonly id: string; readonly status: 'fail'; readonly error: string }
  | { readonly id: string; readonly status: 'skipped'; readonly reason: string }

export type DegradationReport<T> = {
  readonly value: T | undefined
  readonly winner: string | undefined
  readonly attempts: readonly DegradationOutcome<T>[]
  readonly degraded: boolean
}

const errMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e))

/**
 * Run the supplied attempts in priority order until one succeeds (#243).
 *
 * - Returns the first successful value plus a per-attempt outcome trail.
 * - `degraded=true` when the winner was not the first enabled attempt.
 * - `winner=undefined` and `value=undefined` when every attempt failed; the
 *   caller decides whether to surface the last error or fall back to a
 *   constant default.
 */
export type DegradationOpts = {
  readonly signal?: AbortSignal
}

export const runWithGracefulDegradation = async <T>(
  attempts: readonly DegradationAttempt<T>[],
  opts?: DegradationOpts,
): Promise<DegradationReport<T>> => {
  const attemptsList: DegradationOutcome<T>[] = []
  let winner: string | undefined
  let value: T | undefined
  let primaryIndex: number | undefined
  for (let i = 0; i < attempts.length; i += 1) {
    if (opts?.signal?.aborted === true) {
      attemptsList.push({ id: attempts[i]!.id, status: 'skipped', reason: 'aborted' })
      continue
    }
    const a = attempts[i]!
    if (a.enabled === false) {
      attemptsList.push({ id: a.id, status: 'skipped', reason: 'disabled' })
      continue
    }
    if (primaryIndex === undefined) primaryIndex = i
    if (winner !== undefined) {
      attemptsList.push({ id: a.id, status: 'skipped', reason: 'winner_already_chosen' })
      continue
    }
    try {
      const v = await a.run()
      value = v
      winner = a.id
      attemptsList.push({ id: a.id, status: 'ok', value: v })
    } catch (e) {
      attemptsList.push({ id: a.id, status: 'fail', error: errMessage(e) })
    }
  }
  const degraded =
    winner !== undefined
    && primaryIndex !== undefined
    && attempts[primaryIndex]!.id !== winner
  return { value, winner, attempts: attemptsList, degraded }
}
