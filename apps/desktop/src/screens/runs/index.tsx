import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import { RunDetailPanel } from './run-detail-panel'
import { RUN_FILTERS, RunFilters, type RunFilter } from './run-filters'
import { RunSummary } from './run-summary'
import { RunTable } from './run-table'
import { RUNS_FIXTURE, useRuns } from './use-runs'
import { useSelection } from '../../lib/selection-store'

const OPERATE_HEADER_CLASS = [
  'sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-4',
  'border-b border-[var(--ag-line)] bg-[var(--ag-glass-strong-bg)] px-4 py-3',
  '[backdrop-filter:var(--ag-glass-blur)] sm:px-6',
].join(' ')

export function RunsScreen() {
  const { runs, loading, error } = useRuns()
  const [filter, setFilter] = useState<RunFilter>(RUN_FILTERS[0])
  const [selectedId, setSelectedId] = useState<string | null>(RUNS_FIXTURE[0]?.id ?? null)
  const { setSelectedRunId } = useSelection()

  const filteredRuns = useMemo(
    () => (filter === 'all' ? runs : runs.filter((run) => run.status === filter)),
    [filter, runs],
  )

  const selectedRun = useMemo(() => {
    const match = runs.find((run) => run.id === selectedId)
    if (match) return match
    return filteredRuns[0] ?? null
  }, [filteredRuns, runs, selectedId])

  if (loading) {
    return (
      <section
        aria-label="Runs"
        className="flex h-full items-center justify-center text-sm text-[var(--ag-ink-muted)]"
      >
        Loading runs...
      </section>
    )
  }

  return (
    <section aria-label="Runs" className="flex min-h-full flex-col bg-[var(--ag-surface)]">
      <div className={OPERATE_HEADER_CLASS}>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            Operate mode
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ag-ink)]">
            Runs
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ag-ink-muted)]">
            Monitor delegated agent tasks across providers, triggers, and cost.
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
            Sidecar runs provider unavailable. Showing local sample data.
          </div>
        )}

        <RunSummary runs={runs} />
        <RunFilters filter={filter} onFilter={setFilter} />

        {filteredRuns.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No runs match this filter.</p>
          </div>
        ) : (
          <div className="grid min-h-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <RunTable
              runs={filteredRuns}
              selectedId={selectedRun?.id ?? null}
              onSelect={(id) => {
                setSelectedId(id)
                setSelectedRunId(id)
              }}
            />
            <RunDetailPanel run={selectedRun} />
          </div>
        )}
      </div>
    </section>
  )
}
