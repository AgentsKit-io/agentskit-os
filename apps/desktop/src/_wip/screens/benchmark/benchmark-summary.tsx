import { formatUsd } from './benchmark-format'
import { BENCHMARK_PROVIDER_LABEL } from './benchmark-labels'
import type { BenchmarkResult } from './use-benchmarks'

export function BenchmarkSummary({ results }: { readonly results: readonly BenchmarkResult[] }) {
  const best = results.reduce<BenchmarkResult | null>((winner, result) => {
    if (winner === null) return result
    return result.completenessPct > winner.completenessPct ? result : winner
  }, null)
  const avgComplete = results.length === 0
    ? 0
    : results.reduce((total, result) => total + result.completenessPct, 0) / results.length
  const spend = results.reduce((total, result) => total + result.costUsd, 0)
  const running = results.filter((result) => result.status === 'running').length

  const items = [
    { label: 'Best provider', value: best ? BENCHMARK_PROVIDER_LABEL[best.provider] : 'None' },
    { label: 'Avg complete', value: `${avgComplete.toFixed(0)}%` },
    { label: 'Spend', value: formatUsd(spend) },
    { label: 'Running', value: running.toString() },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[var(--ag-line)] bg-[var(--ag-glass-bg)] px-4 py-3 shadow-sm [backdrop-filter:var(--ag-glass-blur)]"
        >
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            {item.label}
          </div>
          <div className="mt-1 truncate text-xl font-semibold text-[var(--ag-ink)] tabular-nums">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}
