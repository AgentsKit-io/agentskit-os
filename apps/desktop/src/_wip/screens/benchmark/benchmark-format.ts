import { formatShortDuration, formatUsd } from '../../lib/format'

export { formatShortDuration, formatUsd }

export function formatBenchmarkTokens(tokens: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(tokens)
}
