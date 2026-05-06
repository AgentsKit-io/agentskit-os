import { formatShortDuration, formatUsd } from './benchmark-format'
import { BENCHMARK_PROVIDER_LABEL } from './benchmark-labels'
import { BenchmarkStatusPill } from './benchmark-status-pill'
import type { BenchmarkResult } from './use-benchmarks'

export function BenchmarkDetailPanel({ result }: { readonly result: BenchmarkResult | null }) {
  if (result === null) {
    return (
      <aside className="flex min-h-[320px] flex-col justify-center rounded-xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select a benchmark result</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Compare completion quality, cost, duration, strengths, and gaps for each provider.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <div className="border-b border-[var(--ag-line)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--ag-ink)]" title={result.task}>
              {BENCHMARK_PROVIDER_LABEL[result.provider]}
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={result.model}>
              {result.model}
            </p>
          </div>
          <BenchmarkStatusPill status={result.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <BenchmarkMetric label="Complete" value={`${result.completenessPct}%`} />
        <BenchmarkMetric label="Tests" value={`${result.testsPassedPct}%`} />
        <BenchmarkMetric label="Duration" value={formatShortDuration(result.durationMs)} />
        <BenchmarkMetric label="Cost" value={formatUsd(result.costUsd)} />
      </div>

      <BenchmarkBlock label="Task" value={result.task} />
      <BenchmarkBlock label="Summary" value={result.summary} />
      <BenchmarkList label="Strengths" items={result.strengths} />
      <BenchmarkList label="Gaps" items={result.gaps} />
    </aside>
  )
}

function BenchmarkMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-[var(--ag-ink)]" title={value}>
        {value}
      </div>
    </div>
  )
}

function BenchmarkBlock({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border-b border-[var(--ag-line)] p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
        {label}
      </h3>
      <div className="mt-2 rounded-lg border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]">
        {value}
      </div>
    </div>
  )
}

function BenchmarkList({ label, items }: { readonly label: string; readonly items: readonly string[] }) {
  return (
    <div className="border-b border-[var(--ag-line)] p-4 last:border-b-0">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
        {label}
      </h3>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-lg border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
