import { useEffect, useState } from 'react'
import { sidecarRequest } from '../../lib/sidecar'

export type DashboardStats = {
  /** Total agent runs in the last 24 hours. */
  readonly totalRuns24h: number
  /** Accumulated cost in USD for the last 24 hours. */
  readonly liveCostUsd: number
  /** Average run latency in milliseconds. */
  readonly avgLatencyMs: number
  /** Error rate as a percentage (0–100). */
  readonly errorRatePct: number
}

const ZERO_STATS: DashboardStats = {
  totalRuns24h: 0,
  liveCostUsd: 0,
  avgLatencyMs: 0,
  errorRatePct: 0,
}

/**
 * Fetches dashboard stats from the sidecar on mount.
 * Returns zeros while the sidecar exposes no stats endpoint yet.
 *
 * TODO(#199): wire `liveCostUsd` to the real-time cost stream once the
 *   sidecar exposes a `cost.stream` JSON-RPC subscription.
 */
export function useDashboardStats(): {
  stats: DashboardStats
  isLoading: boolean
} {
  const [stats, setStats] = useState<DashboardStats>(ZERO_STATS)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    sidecarRequest<DashboardStats>('dashboard.stats')
      .then((result) => {
        if (!cancelled) {
          setStats(result)
        }
      })
      .catch(() => {
        // Sidecar not connected; fall back to zeros silently.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { stats, isLoading }
}
