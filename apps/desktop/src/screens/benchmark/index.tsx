import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import {
  BENCHMARK_RESULTS_FIXTURE,
  type BenchmarkProvider,
  type BenchmarkResult,
  type BenchmarkStatus,
  useBenchmarks,
} from './use-benchmarks'
import { FilterPills } from '../../components/filter-pills'
import { BenchmarkTable } from './benchmark-table'
import { BenchmarkSummary } from './benchmark-summary'
import { formatShortDuration } from './benchmark-format'

const PROVIDER_LABEL: Record<BenchmarkProvider, string> = {
  codex: 'Codex',
  claude: 'Claude',
  cursor: 'Cursor',
  gemini: 'Gemini',
}

const STATUS_LABEL: Record<BenchmarkStatus, string> = {
  complete: 'Complete',
  running: 'Running',
  failed: 'Failed',
}

const STATUS_CLASSES: Record<BenchmarkStatus, string> = {
  complete: 'border-[var(--ag-success)]/25 bg-[var(--ag-success)]/10 text-[var(--ag-success)]',
  running: 'border-[var(--ag-accent)]/25 bg-[var(--ag-accent)]/10 text-[var(--ag-accent)]',
  failed: 'border-[var(--ag-danger)]/25 bg-[var(--ag-danger)]/10 text-[var(--ag-danger)]',
}

const FILTERS: Array<BenchmarkProvider | 'all'> = ['all', 'codex', 'claude', 'cursor', 'gemini']

function StatusPill({ status }: { readonly status: BenchmarkStatus }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[0.65rem] font-medium border ${STATUS_CLASSES[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function BenchmarkDetail({ result }: { readonly result: BenchmarkResult | null }) {
  if (result === null) {
    return (
      <aside className="flex min-h-0 flex-col justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select a benchmark result</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Compare completion quality, cost, duration, strengths, and gaps for each provider.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <div className="border-b border-[var(--ag-line)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--ag-ink)]" title={result.task}>
              {PROVIDER_LABEL[result.provider]}
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={result.model}>
              {result.model}
            </p>
          </div>
          <StatusPill status={result.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <DetailMetric label="Complete" value={`${result.completenessPct}%`} />
        <DetailMetric label="Tests" value={`${result.testsPassedPct}%`} />
        <DetailMetric label="Duration" value={formatShortDuration(result.durationMs)} />
        <DetailMetric label="Cost" value={`$${result.costUsd.toFixed(2)}`} />
      </div>

      <DetailBlock label="Task" value={result.task} />
      <DetailBlock label="Summary" value={result.summary} />
      <ListBlock label="Strengths" items={result.strengths} />
      <ListBlock label="Gaps" items={result.gaps} />
    </aside>
  )
}

function DetailMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-[var(--ag-ink)]" title={value}>
        {value}
      </div>
    </div>
  )
}

function DetailBlock({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border-b border-[var(--ag-line)] p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
        {label}
      </h3>
      <div className="mt-2 rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]">
        {value}
      </div>
    </div>
  )
}

function ListBlock({ label, items }: { readonly label: string; readonly items: readonly string[] }) {
  return (
    <div className="border-b border-[var(--ag-line)] p-4 last:border-b-0">
      <h3 className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
        {label}
      </h3>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BenchmarkScreen() {
  const { results, loading, error } = useBenchmarks()
  const [filter, setFilter] = useState<BenchmarkProvider | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(BENCHMARK_RESULTS_FIXTURE[0]?.id ?? null)

  const filteredResults = useMemo(() => {
    return filter === 'all' ? results : results.filter((result) => result.provider === filter)
  }, [filter, results])

  const selectedResult = useMemo(() => {
    const match = results.find((result) => result.id === selectedId)
    if (match) return match
    return filteredResults[0] ?? null
  }, [filteredResults, results, selectedId])

  if (loading) {
    return (
      <section aria-label="Benchmark" className="flex h-full items-center justify-center text-sm text-[var(--ag-ink-muted)]">
        Loading benchmarks...
      </section>
    )
  }

  return (
    <section aria-label="Benchmark" className="flex h-full min-h-0 flex-col bg-[var(--ag-surface)]">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--ag-line)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--ag-ink)]">Benchmark</h1>
          <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
            Launch the same task across providers and compare completeness, tests, cost, and time.
          </p>
        </div>
        <Badge variant="outline">Preview mode</Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
        {error !== null && (
          <div role="status" className="rounded-md border border-[var(--ag-warn)]/25 bg-[var(--ag-warn)]/10 px-3 py-2 text-sm text-[var(--ag-warn)]">
            Sidecar benchmark provider unavailable. Showing local sample data.
          </div>
        )}

        <BenchmarkSummary results={results} />

        <FilterPills
          items={FILTERS}
          active={filter}
          onChange={setFilter}
          ariaLabel="Filter benchmarks by provider"
          labelFor={(item) => (item === 'all' ? 'All' : PROVIDER_LABEL[item])}
        />

        {filteredResults.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No benchmark results match this provider.</p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <BenchmarkTable results={filteredResults} selectedId={selectedResult?.id ?? null} onSelect={setSelectedId} />
            <BenchmarkDetail result={selectedResult} />
          </div>
        )}
      </div>
    </section>
  )
}
