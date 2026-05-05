import { formatClockTime, formatShortDuration, formatUsd } from '../../lib/format'
import type { RunQueueItem } from './use-runs'

export { formatClockTime, formatShortDuration, formatUsd }

export function formatRunTokens(run: RunQueueItem): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(
    run.inputTokens + run.outputTokens,
  )
}

export function formatRunsTokens(runs: readonly RunQueueItem[]): string {
  const total = runs.reduce((sum, run) => sum + run.inputTokens + run.outputTokens, 0)
  return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(total)
}
