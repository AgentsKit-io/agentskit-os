import {
  formatBenchmarkTokens,
  formatShortDuration,
  formatUsd,
} from './benchmark-format'
import { BENCHMARK_PROVIDER_LABEL } from './benchmark-labels'
import { BenchmarkStatusPill } from './benchmark-status-pill'
import type { BenchmarkResult } from './use-benchmarks'

type BenchmarkTableProps = {
  readonly results: readonly BenchmarkResult[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
}

const ROW_BASE_CLASS = [
  'cursor-pointer transition focus-visible:outline focus-visible:outline-2',
  'focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
].join(' ')

export function BenchmarkTable({ results, selectedId, onSelect }: BenchmarkTableProps) {
  const ranked = [...results].sort((a, b) => b.completenessPct - a.completenessPct)

  return (
    <div className="min-h-0 overflow-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <table className="w-full min-w-[860px] border-collapse text-sm" aria-label="Benchmark results">
        <thead>
          <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            <th className="px-4 py-2 font-medium">Provider</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Completeness</th>
            <th className="px-3 py-2 font-medium">Tests</th>
            <th className="px-3 py-2 font-medium">Duration</th>
            <th className="px-3 py-2 font-medium">Cost</th>
            <th className="px-4 py-2 font-medium">Tokens</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ag-line-soft)]">
          {ranked.map((result, index) => (
            <tr
              key={result.id}
              tabIndex={0}
              aria-selected={selectedId === result.id}
              onClick={() => onSelect(result.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(result.id)
                }
              }}
              className={[
                ROW_BASE_CLASS,
                selectedId === result.id
                  ? 'bg-[color-mix(in_srgb,var(--ag-accent)_10%,transparent)]'
                  : 'hover:bg-[var(--ag-panel-alt)]',
              ].join(' ')}
            >
              <td className="max-w-[260px] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[var(--ag-ink-subtle)]">#{index + 1}</span>
                  <span className="font-medium text-[var(--ag-ink)]">
                    {BENCHMARK_PROVIDER_LABEL[result.provider]}
                  </span>
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={result.model}>
                  {result.model}
                </div>
              </td>
              <td className="px-3 py-3">
                <BenchmarkStatusPill status={result.status} />
              </td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink)]">
                {result.completenessPct}%
              </td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink-muted)]">
                {result.testsPassedPct}%
              </td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink-muted)]">
                {formatShortDuration(result.durationMs)}
              </td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink-muted)]">
                {formatUsd(result.costUsd)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--ag-ink-subtle)]">
                {formatBenchmarkTokens(result.tokens)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
