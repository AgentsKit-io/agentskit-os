// Per #101 — self-healing crash policy.
// Pure: caller passes a crash event; ledger keeps per-agent crash count and
// returns a verdict (`continue` / `quarantine` / `clone-debug`). No timers.

export type SelfHealingPolicy = {
  /** Crashes that trigger a debug clone. Defaults to 3. */
  readonly cloneAfterCrashes: number
  /** Crashes that trigger quarantine (no auto-restart). Defaults to 5. */
  readonly quarantineAfterCrashes: number
  /** Window in ms after which the counter decays back to zero. */
  readonly windowMs: number
}

export const DEFAULT_SELF_HEALING_POLICY: SelfHealingPolicy = {
  cloneAfterCrashes: 3,
  quarantineAfterCrashes: 5,
  windowMs: 30 * 60_000,
}

export type CrashEvent = {
  readonly agentId: string
  readonly at: number
  readonly errorCode?: string
}

export type SelfHealingVerdict =
  | { readonly action: 'continue'; readonly crashCount: number }
  | { readonly action: 'clone-debug'; readonly crashCount: number; readonly cloneId: string }
  | { readonly action: 'quarantine'; readonly crashCount: number }

export type SelfHealingLedger = {
  readonly record: (event: CrashEvent) => SelfHealingVerdict
  readonly count: (agentId: string, atNow?: number) => number
  readonly reset: (agentId: string) => void
}

const cloneIdFor = (agentId: string, at: number): string => `${agentId}-debug-${at.toString(36)}`

/**
 * Build a per-agent crash counter ledger (#101). Window-decayed; the verdict
 * tells the runtime whether to keep going, spawn a debug clone, or
 * quarantine the agent until an operator intervenes.
 */
export const createSelfHealingLedger = (
  policy: SelfHealingPolicy = DEFAULT_SELF_HEALING_POLICY,
): SelfHealingLedger => {
  const buckets = new Map<string, number[]>()

  const decay = (agentId: string, atNow: number): number[] => {
    const events = buckets.get(agentId) ?? []
    const cutoff = atNow - policy.windowMs
    const fresh = events.filter((at) => at >= cutoff)
    buckets.set(agentId, fresh)
    return fresh
  }

  return {
    record: (event) => {
      const fresh = decay(event.agentId, event.at)
      fresh.push(event.at)
      buckets.set(event.agentId, fresh)
      const count = fresh.length
      if (count >= policy.quarantineAfterCrashes) {
        return { action: 'quarantine', crashCount: count }
      }
      if (count >= policy.cloneAfterCrashes) {
        return {
          action: 'clone-debug',
          crashCount: count,
          cloneId: cloneIdFor(event.agentId, event.at),
        }
      }
      return { action: 'continue', crashCount: count }
    },
    count: (agentId, atNow = Date.now()) => decay(agentId, atNow).length,
    reset: (agentId) => {
      buckets.delete(agentId)
    },
  }
}
