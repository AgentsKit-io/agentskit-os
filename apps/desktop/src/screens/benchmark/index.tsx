import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import {
  BENCHMARK_RESULTS_FIXTURE,
  type BenchmarkProvider,
  type BenchmarkResult,
  type BenchmarkStatus,
  useBenchmarks,
} from './use-benchmarks'

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
  complete: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  running: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
  failed: 'border-red-500/25 bg-red-500/10 text-red-300',
}

const FILTERS: Array<BenchmarkProvider | 'all'> = ['all', 'codex', 'claude', 'cursor', 'gemini']

function StatusPill({ status }: { readonly status: BenchmarkStatus }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[0.65rem] font-medium border ${STATUS_CLASSES[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
}

function formatTokens(tokens: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(tokens)
}

function BenchmarkSummary({ results }: { readonly results: readonly BenchmarkResult[] }) {
  const best = results.reduce<BenchmarkResult | null>((winner, result) => {
    if (winner === null) return result
    return result.completenessPct > winner.completenessPct ? result : winner
  }, null)
  const avgCompleteness = results.length === 0
    ? 0
    : results.reduce((total, result) => total + result.completenessPct, 0) / results.length
  const spend = results.reduce((total, result) => total + result.costUsd, 0)
  const running = results.filter((result) => result.status === 'running').length

  const items = [
    { label: 'Best provider', value: best ? PROVIDER_LABEL[best.provider] : 'None' },
    { label: 'Avg complete', value: `${avgCompleteness.toFixed(0)}%` },
    { label: 'Spend', value: `$${spend.toFixed(2)}` },
    { label: 'Running', value: running.toString() },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)] px-4 py-3">
          <div className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
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

function BenchmarkTable({
  results,
  selectedId,
  onSelect,
}: {
  readonly results: readonly BenchmarkResult[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
}) {
  const ranked = [...results].sort((a, b) => b.completenessPct - a.completenessPct)

  return (
    <div className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <table className="w-full border-collapse text-sm" aria-label="Benchmark results">
        <thead>
          <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
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
                'cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
                selectedId === result.id
                  ? 'bg-[var(--ag-accent)]/10'
                  : 'hover:bg-[var(--ag-panel-alt)]',
              ].join(' ')}
            >
              <td className="max-w-[260px] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[var(--ag-ink-subtle)]">#{index + 1}</span>
                  <span className="font-medium text-[var(--ag-ink)]">{PROVIDER_LABEL[result.provider]}</span>
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={result.model}>
                  {result.model}
                </div>
              </td>
              <td className="px-3 py-3">
                <StatusPill status={result.status} />
              </td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink)]">{result.completenessPct}%</td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink-muted)]">{result.testsPassedPct}%</td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink-muted)]">{formatDuration(result.durationMs)}</td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink-muted)]">${result.costUsd.toFixed(2)}</td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--ag-ink-subtle)]">{formatTokens(result.tokens)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
        <DetailMetric label="Duration" value={formatDuration(result.durationMs)} />
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
          <div role="status" className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            Sidecar benchmark provider unavailable. Showing local sample data.
          </div>
        )}

        <BenchmarkSummary results={results} />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter benchmarks by provider">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
              className={[
                'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                filter === item
                  ? 'border-[var(--ag-accent)] bg-[var(--ag-accent)]/10 text-[var(--ag-accent)]'
                  : 'border-[var(--ag-line)] text-[var(--ag-ink-muted)] hover:border-[var(--ag-accent)]/50 hover:text-[var(--ag-ink)]',
              ].join(' ')}
            >
              {item === 'all' ? 'All' : PROVIDER_LABEL[item]}
            </button>
          ))}
        </div>

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
