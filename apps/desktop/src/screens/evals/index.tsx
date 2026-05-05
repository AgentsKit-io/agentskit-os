import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import { EVAL_SUITES_FIXTURE, type EvalCadence, type EvalStatus, type EvalSuite, useEvals } from './use-evals'

const STATUS_LABEL: Record<EvalStatus, string> = {
  passing: 'Passing',
  regressed: 'Regressed',
  running: 'Running',
  failing: 'Failing',
}

const STATUS_CLASSES: Record<EvalStatus, string> = {
  passing: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  regressed: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  running: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
  failing: 'border-red-500/25 bg-red-500/10 text-red-300',
}

const CADENCE_LABEL: Record<EvalCadence, string> = {
  on_pr: 'On PR',
  nightly: 'Nightly',
  manual: 'Manual',
}

const FILTERS: Array<EvalStatus | 'all'> = ['all', 'passing', 'regressed', 'running', 'failing']

function StatusPill({ status }: { readonly status: EvalStatus }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[0.65rem] font-medium border ${STATUS_CLASSES[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function EvalsSummary({ suites }: { readonly suites: readonly EvalSuite[] }) {
  const passing = suites.filter((suite) => suite.status === 'passing').length
  const regressed = suites.filter((suite) => suite.status === 'regressed').length
  const cases = suites.reduce((total, suite) => total + suite.cases, 0)
  const avgPass = suites.length === 0
    ? 0
    : suites.reduce((total, suite) => total + suite.passRatePct, 0) / suites.length

  const items = [
    { label: 'Passing', value: passing.toString() },
    { label: 'Regressed', value: regressed.toString() },
    { label: 'Cases', value: cases.toString() },
    { label: 'Avg pass', value: `${avgPass.toFixed(0)}%` },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)] px-4 py-3">
          <div className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
            {item.label}
          </div>
          <div className="mt-1 text-xl font-semibold text-[var(--ag-ink)] tabular-nums">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function EvalTable({
  suites,
  selectedId,
  onSelect,
}: {
  readonly suites: readonly EvalSuite[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
}) {
  return (
    <div className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <table className="w-full border-collapse text-sm" aria-label="Evaluation suites">
        <thead>
          <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
            <th className="px-4 py-2 font-medium">Suite</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Cadence</th>
            <th className="px-3 py-2 font-medium">Cases</th>
            <th className="px-3 py-2 font-medium">Pass</th>
            <th className="px-3 py-2 font-medium">Regressions</th>
            <th className="px-4 py-2 font-medium">Last run</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ag-line-soft)]">
          {suites.map((suite) => (
            <tr
              key={suite.id}
              tabIndex={0}
              aria-selected={selectedId === suite.id}
              onClick={() => onSelect(suite.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(suite.id)
                }
              }}
              className={[
                'cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
                selectedId === suite.id
                  ? 'bg-[var(--ag-accent)]/10'
                  : 'hover:bg-[var(--ag-panel-alt)]',
              ].join(' ')}
            >
              <td className="max-w-[320px] px-4 py-3">
                <div className="truncate font-medium text-[var(--ag-ink)]" title={suite.name}>
                  {suite.name}
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={suite.targetFlow}>
                  {suite.targetFlow}
                </div>
              </td>
              <td className="px-3 py-3">
                <StatusPill status={suite.status} />
              </td>
              <td className="px-3 py-3 text-xs text-[var(--ag-ink-muted)]">
                {CADENCE_LABEL[suite.cadence]}
              </td>
              <td className="px-3 py-3 tabular-nums text-[var(--ag-ink-muted)]">{suite.cases}</td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink)]">{suite.passRatePct}%</td>
              <td className="px-3 py-3 tabular-nums text-[var(--ag-ink-muted)]">{suite.regressionCount}</td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--ag-ink-subtle)]">
                {formatTime(suite.lastRunAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EvalDetail({ suite }: { readonly suite: EvalSuite | null }) {
  if (suite === null) {
    return (
      <aside className="flex min-h-0 flex-col justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select an eval suite</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Inspect dataset, scorer, target flow, regressions, and recent notes.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
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
          <StatusPill status={suite.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <DetailMetric label="Cases" value={suite.cases.toString()} />
        <DetailMetric label="Pass rate" value={`${suite.passRatePct}%`} />
        <DetailMetric label="Regressions" value={suite.regressionCount.toString()} />
        <DetailMetric label="Avg cost" value={`$${suite.avgCostUsd.toFixed(2)}`} />
      </div>

      <DetailBlock label="Dataset" value={suite.dataset} mono />
      <DetailBlock label="Scorer" value={suite.scorer} mono />
      <DetailBlock label="Target Flow" value={suite.targetFlow} mono />
      <ListBlock label="Notes" items={suite.notes} />
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

function DetailBlock({
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
      <h3 className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
        {label}
      </h3>
      <div
        className={[
          'mt-2 rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]',
          mono ? 'font-mono text-xs' : '',
        ].join(' ')}
      >
        {value}
      </div>
    </div>
  )
}

function ListBlock({ label, items }: { readonly label: string; readonly items: readonly string[] }) {
  return (
    <div className="p-4">
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

export function EvalsScreen() {
  const { suites, loading, error } = useEvals()
  const [filter, setFilter] = useState<EvalStatus | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(EVAL_SUITES_FIXTURE[0]?.id ?? null)

  const filteredSuites = useMemo(() => {
    return filter === 'all' ? suites : suites.filter((suite) => suite.status === filter)
  }, [filter, suites])

  const selectedSuite = useMemo(() => {
    const match = suites.find((suite) => suite.id === selectedId)
    if (match) return match
    return filteredSuites[0] ?? null
  }, [filteredSuites, selectedId, suites])

  if (loading) {
    return (
      <section aria-label="Evals" className="flex h-full items-center justify-center text-sm text-[var(--ag-ink-muted)]">
        Loading evals...
      </section>
    )
  }

  return (
    <section aria-label="Evals" className="flex h-full min-h-0 flex-col bg-[var(--ag-surface)]">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--ag-line)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--ag-ink)]">Evals</h1>
          <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
            Track evaluation suites, regression signals, datasets, and scorers across agent workflows.
          </p>
        </div>
        <Badge variant="outline">Preview mode</Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
        {error !== null && (
          <div role="status" className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            Sidecar eval registry unavailable. Showing local sample data.
          </div>
        )}

        <EvalsSummary suites={suites} />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter evals by status">
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
              {item === 'all' ? 'All' : STATUS_LABEL[item]}
            </button>
          ))}
        </div>

        {filteredSuites.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No eval suites match this status.</p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <EvalTable suites={filteredSuites} selectedId={selectedSuite?.id ?? null} onSelect={setSelectedId} />
            <EvalDetail suite={selectedSuite} />
          </div>
        )}
      </div>
    </section>
  )
}
