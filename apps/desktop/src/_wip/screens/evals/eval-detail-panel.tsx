import { formatUsd } from '../../lib/format'
import { EvalStatusPill } from './eval-status-pill'
import type { EvalSuite } from './use-evals'

export function EvalDetailPanel({ suite }: { readonly suite: EvalSuite | null }) {
  if (suite === null) {
    return (
      <aside className="flex min-h-[320px] flex-col justify-center rounded-xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select an eval suite</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Inspect dataset, scorer, target flow, regressions, and recent notes.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <div className="border-b border-[var(--ag-line)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--ag-ink)]" title={suite.name}>
              {suite.name}
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={suite.id}>
              {suite.id}
            </p>
          </div>
          <EvalStatusPill status={suite.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <EvalMetric label="Cases" value={suite.cases.toString()} />
        <EvalMetric label="Pass rate" value={`${suite.passRatePct}%`} />
        <EvalMetric label="Regressions" value={suite.regressionCount.toString()} />
        <EvalMetric label="Avg cost" value={formatUsd(suite.avgCostUsd)} />
      </div>

      <EvalBlock label="Dataset" value={suite.dataset} mono />
      <EvalBlock label="Scorer" value={suite.scorer} mono />
      <EvalBlock label="Target Flow" value={suite.targetFlow} mono />
      <EvalList label="Notes" items={suite.notes} />
    </aside>
  )
}

function EvalMetric({ label, value }: { readonly label: string; readonly value: string }) {
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

function EvalBlock({
  label,
  value,
  mono = false,
}: {
  readonly label: string
  readonly value: string
  readonly mono?: boolean
}) {
  return (
    <div className="border-b border-[var(--ag-line)] p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
        {label}
      </h3>
      <div
        className={[
          'mt-2 rounded-lg border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]',
          mono ? 'font-mono text-xs' : '',
        ].join(' ')}
      >
        {value}
      </div>
    </div>
  )
}

function EvalList({ label, items }: { readonly label: string; readonly items: readonly string[] }) {
  return (
    <div className="p-4">
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
