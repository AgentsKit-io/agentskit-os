import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import { EvalDetailPanel } from './eval-detail-panel'
import { EvalStatusFilters, EVAL_FILTERS, type EvalFilter } from './eval-status-filters'
import { EvalSummary } from './eval-summary'
import { EvalTable } from './eval-table'
import { EVAL_SUITES_FIXTURE, useEvals } from './use-evals'

const EVALS_HEADER_CLASS = [
  'sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-4',
  'border-b border-[var(--ag-line)] bg-[var(--ag-glass-strong-bg)] px-4 py-3',
  '[backdrop-filter:var(--ag-glass-blur)] sm:px-6',
].join(' ')

export function EvalsScreen() {
  const { suites, loading, error } = useEvals()
  const [filter, setFilter] = useState<EvalFilter>(EVAL_FILTERS[0])
  const [selectedId, setSelectedId] = useState<string | null>(EVAL_SUITES_FIXTURE[0]?.id ?? null)

  const filteredSuites = useMemo(
    () => (filter === 'all' ? suites : suites.filter((suite) => suite.status === filter)),
    [filter, suites],
  )

  const selectedSuite = useMemo(() => {
    const match = suites.find((suite) => suite.id === selectedId)
    if (match) return match
    return filteredSuites[0] ?? null
  }, [filteredSuites, selectedId, suites])

  if (loading) {
    return (
      <section
        aria-label="Evals"
        className="flex h-full items-center justify-center text-sm text-[var(--ag-ink-muted)]"
      >
        Loading evals...
      </section>
    )
  }

  return (
    <section aria-label="Evals" className="flex min-h-full flex-col bg-[var(--ag-surface)]">
      <div className={EVALS_HEADER_CLASS}>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            Regression safety
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ag-ink)]">
            Evals
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ag-ink-muted)]">
            Track evaluation suites, regression signals, datasets, and scorers across agent workflows.
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
            Sidecar eval registry unavailable. Showing local sample data.
          </div>
        )}

        <EvalSummary suites={suites} />
        <EvalStatusFilters filter={filter} onFilter={setFilter} />

        {filteredSuites.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No eval suites match this status.</p>
          </div>
        ) : (
          <div className="grid min-h-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <EvalTable
              suites={filteredSuites}
              selectedId={selectedSuite?.id ?? null}
              onSelect={setSelectedId}
            />
            <EvalDetailPanel suite={selectedSuite} />
          </div>
        )}
      </div>
    </section>
  )
}
