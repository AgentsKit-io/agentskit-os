// Per #239 — circuit breaker primitive for providers, tools, and sub-flows.
// Pure: no timers; the caller supplies a clock. Three states (closed, open,
// half-open) with consecutive-failure threshold + reset cooldown.

export type CircuitState = 'closed' | 'open' | 'half-open'

export type CircuitBreakerOpts = {
  /** Number of consecutive failures that trip the breaker. */
  readonly failureThreshold: number
  /** ms to wait in `open` state before allowing a single `half-open` probe. */
  readonly resetAfterMs: number
  /** Number of consecutive `half-open` successes required to close the breaker. */
  readonly halfOpenSuccessesToClose?: number
  /** Clock; defaults to `Date.now`. */
  readonly clock?: () => number
}

export type CircuitBreakerSnapshot = {
  readonly state: CircuitState
  readonly consecutiveFailures: number
  readonly halfOpenSuccesses: number
  readonly openedAt?: number
}

export type CircuitBreaker = {
  readonly tryAcquire: () => { allowed: true } | { allowed: false; state: 'open' }
  readonly recordSuccess: () => CircuitBreakerSnapshot
  readonly recordFailure: () => CircuitBreakerSnapshot
  readonly state: () => CircuitState
  readonly snapshot: () => CircuitBreakerSnapshot
}

const DEFAULT_HALF_OPEN_SUCCESSES = 1

/**
 * Stateful circuit breaker for a single key (provider, tool, sub-flow id).
 *
 * - `tryAcquire()` returns `{ allowed: false }` when the breaker is `open` and
 *   the cooldown has not elapsed; the caller should short-circuit / fall back.
 * - When the cooldown has elapsed, the breaker transitions to `half-open` and
 *   allows a single probe.
 * - `recordSuccess()` and `recordFailure()` update the counters; success in
 *   `half-open` after `halfOpenSuccessesToClose` probes closes the breaker.
 */
export const createCircuitBreaker = (opts: CircuitBreakerOpts): CircuitBreaker => {
  const clock = opts.clock ?? Date.now
  const halfOpenTarget = opts.halfOpenSuccessesToClose ?? DEFAULT_HALF_OPEN_SUCCESSES

  let state: CircuitState = 'closed'
  let consecutiveFailures = 0
  let halfOpenSuccesses = 0
  let openedAt: number | undefined

  const snap = (): CircuitBreakerSnapshot => ({
    state,
    consecutiveFailures,
    halfOpenSuccesses,
    ...(openedAt !== undefined ? { openedAt } : {}),
  })

  const tryAcquire = (): { allowed: true } | { allowed: false; state: 'open' } => {
    if (state === 'open') {
      const now = clock()
      if (openedAt !== undefined && now - openedAt >= opts.resetAfterMs) {
        state = 'half-open'
        halfOpenSuccesses = 0
        return { allowed: true }
      }
      return { allowed: false, state: 'open' }
    }
    return { allowed: true }
  }

  const recordSuccess = (): CircuitBreakerSnapshot => {
    if (state === 'half-open') {
      halfOpenSuccesses += 1
      if (halfOpenSuccesses >= halfOpenTarget) {
        state = 'closed'
        consecutiveFailures = 0
        halfOpenSuccesses = 0
        openedAt = undefined
      }
    } else {
      consecutiveFailures = 0
    }
    return snap()
  }

  const recordFailure = (): CircuitBreakerSnapshot => {
    if (state === 'half-open') {
      state = 'open'
      openedAt = clock()
      halfOpenSuccesses = 0
      return snap()
    }
    consecutiveFailures += 1
    if (state === 'closed' && consecutiveFailures >= opts.failureThreshold) {
      state = 'open'
      openedAt = clock()
    }
    return snap()
  }

  return {
    tryAcquire,
    recordSuccess,
    recordFailure,
    state: () => state,
    snapshot: snap,
  }
}
