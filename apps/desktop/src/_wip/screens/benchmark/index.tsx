import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import { BenchmarkDetailPanel } from './benchmark-detail-panel'
import {
  BENCHMARK_FILTERS,
  BenchmarkProviderFilters,
  type BenchmarkFilter,
} from './benchmark-provider-filters'
import { BenchmarkSummary } from './benchmark-summary'
import { BenchmarkTable } from './benchmark-table'
import { BENCHMARK_RESULTS_FIXTURE, useBenchmarks } from './use-benchmarks'

const BENCHMARK_HEADER_CLASS = [
  'sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-4',
  'border-b border-[var(--ag-line)] bg-[var(--ag-glass-strong-bg)] px-4 py-3',
  '[backdrop-filter:var(--ag-glass-blur)] sm:px-6',
].join(' ')

export function BenchmarkScreen() {
  const { results, loading, error } = useBenchmarks()
  const [filter, setFilter] = useState<BenchmarkFilter>(BENCHMARK_FILTERS[0])
  const [selectedId, setSelectedId] = useState<string | null>(
    BENCHMARK_RESULTS_FIXTURE[0]?.id ?? null,
  )

  const filteredResults = useMemo(
    () => (filter === 'all' ? results : results.filter((result) => result.provider === filter)),
    [filter, results],
  )

  const selectedResult = useMemo(() => {
    const match = results.find((result) => result.id === selectedId)
    if (match) return match
    return filteredResults[0] ?? null
  }, [filteredResults, results, selectedId])

  if (loading) {
    return (
      <section
        aria-label="Benchmark"
        className="flex h-full items-center justify-center text-sm text-[var(--ag-ink-muted)]"
      >
        Loading benchmarks...
      </section>
    )
  }

  return (
    <section aria-label="Benchmark" className="flex min-h-full flex-col bg-[var(--ag-surface)]">
      <div className={BENCHMARK_HEADER_CLASS}>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            Evaluate mode
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ag-ink)]">
            Benchmark
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ag-ink-muted)]">
            Launch the same task across providers and compare completeness, tests, cost, and time.
          </p>
        </div>
        <Badge variant="outline">Preview mode</Badge>
      </div>

      <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
        {error !== null && (
          <div
            role="status"
            className="rounded-xl border border-[color-mix(in_srgb,var(--ag-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_12%,transparent)] px-3 py-2 text-sm text-[var(--ag-warning)]"
          >
            Sidecar benchmark provider unavailable. Showing local sample data.
          </div>
        )}

        <BenchmarkSummary results={results} />
        <BenchmarkProviderFilters filter={filter} onFilter={setFilter} />

        {filteredResults.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">
              No benchmark results match this provider.
            </p>
          </div>
        ) : (
          <div className="grid min-h-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <BenchmarkTable
              results={filteredResults}
              selectedId={selectedResult?.id ?? null}
              onSelect={setSelectedId}
            />
            <BenchmarkDetailPanel result={selectedResult} />
          </div>
        )}
      </div>
    </section>
  )
}
