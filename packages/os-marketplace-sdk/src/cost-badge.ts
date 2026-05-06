// Per #218 — marketplace "avg $/run" badge primitives.
// Pure shape derivation; UI rendering left to the marketplace surface.

export type PluginCostBadgeInput = {
  /** Sum of run costs in USD captured for the plugin. */
  readonly totalCostUsd: number
  /** Number of runs the cost was averaged over. */
  readonly runCount: number
  /** Sample window for display (e.g. "trailing-30d", "trailing-100-runs"). */
  readonly window?: string
  /** Currency override; defaults to `'USD'`. */
  readonly currency?: string
}

export type PluginCostBadge = {
  readonly schemaVersion: '1.0'
  readonly currency: string
  readonly avgCostPerRun: number
  readonly runCount: number
  readonly totalCost: number
  readonly window?: string
  /** Display label; e.g. `"$0.013 / run"`. */
  readonly label: string
  /** Tier bucket the average falls in. */
  readonly tier: 'free' | 'cheap' | 'standard' | 'expensive'
}

const tierFor = (avg: number): PluginCostBadge['tier'] => {
  if (avg <= 0) return 'free'
  if (avg < 0.01) return 'cheap'
  if (avg < 0.5) return 'standard'
  return 'expensive'
}

const formatLabel = (avg: number, currency: string): string => {
  if (currency === 'USD') {
    if (avg <= 0) return 'Free / run'
    if (avg < 0.005) return '< $0.01 / run'
    if (avg < 1) return `$${avg.toFixed(3)} / run`
    return `$${avg.toFixed(2)} / run`
  }
  return `${avg.toFixed(4)} ${currency} / run`
}

/**
 * Compute the marketplace "$/run" badge for a plugin (#218).
 *
 * Returns `null` when there is not enough data (zero runs) so the marketplace
 * can choose to omit the badge instead of rendering a misleading $0.00.
 */
export const buildPluginCostBadge = (input: PluginCostBadgeInput): PluginCostBadge | null => {
  if (!Number.isFinite(input.totalCostUsd) || !Number.isFinite(input.runCount)) return null
  if (input.runCount <= 0) return null
  const currency = input.currency ?? 'USD'
  const avg = input.totalCostUsd / input.runCount
  return {
    schemaVersion: '1.0',
    currency,
    avgCostPerRun: Number(avg.toFixed(6)),
    runCount: input.runCount,
    totalCost: Number(input.totalCostUsd.toFixed(6)),
    ...(input.window !== undefined ? { window: input.window } : {}),
    label: formatLabel(avg, currency),
    tier: tierFor(avg),
  }
}
