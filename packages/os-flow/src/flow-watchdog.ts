// Per #240 — flow watchdog that flags stuck runs and decides restart vs kill.
// Pure: caller supplies a clock + a list of run heartbeats; watchdog returns a
// verdict per run. No timers; the caller drives the cadence.

export type WatchdogAction = 'ok' | 'restart' | 'kill'

export type RunHeartbeat = {
  readonly runId: string
  readonly startedAt: number
  readonly lastHeartbeatAt: number
  readonly restartCount?: number
}

export type WatchdogVerdict = {
  readonly runId: string
  readonly action: WatchdogAction
  readonly stalledForMs: number
  readonly elapsedMs: number
  readonly reason: string
}

export type FlowWatchdogOpts = {
  /** ms without a heartbeat before action=restart fires. */
  readonly stallAfterMs: number
  /** ms total runtime before action=kill fires regardless of heartbeats. */
  readonly hardKillAfterMs: number
  /** Max restart attempts before action=kill on subsequent stalls. */
  readonly maxRestarts?: number
  readonly clock?: () => number
}

const DEFAULT_MAX_RESTARTS = 2

const verdict = (
  runId: string,
  action: WatchdogAction,
  stalledForMs: number,
  elapsedMs: number,
  reason: string,
): WatchdogVerdict => ({ runId, action, stalledForMs, elapsedMs, reason })

/**
 * Decide what to do for each run heartbeat (#240).
 *
 * - `elapsedMs >= hardKillAfterMs`             → `kill` (over budget).
 * - `stalledForMs >= stallAfterMs` + restarts left → `restart`.
 * - `stalledForMs >= stallAfterMs` + no restarts left → `kill`.
 * - otherwise                                   → `ok`.
 */
export const evaluateFlowWatchdog = (
  heartbeats: readonly RunHeartbeat[],
  opts: FlowWatchdogOpts,
): readonly WatchdogVerdict[] => {
  const now = (opts.clock ?? Date.now)()
  const maxRestarts = opts.maxRestarts ?? DEFAULT_MAX_RESTARTS
  return heartbeats.map((hb) => {
    const elapsed = Math.max(0, now - hb.startedAt)
    const stalled = Math.max(0, now - hb.lastHeartbeatAt)
    if (elapsed >= opts.hardKillAfterMs) {
      return verdict(hb.runId, 'kill', stalled, elapsed, `elapsed_over_hard_kill (>=${opts.hardKillAfterMs}ms)`)
    }
    if (stalled >= opts.stallAfterMs) {
      const restarts = hb.restartCount ?? 0
      if (restarts >= maxRestarts) {
        return verdict(hb.runId, 'kill', stalled, elapsed, `stall_max_restarts (${restarts}/${maxRestarts})`)
      }
      return verdict(hb.runId, 'restart', stalled, elapsed, `stall (>=${opts.stallAfterMs}ms)`)
    }
    return verdict(hb.runId, 'ok', stalled, elapsed, 'live')
  })
}
