import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import { RUNS_FIXTURE, type RunQueueItem, type RunStatus, useRuns } from './use-runs'
import { useSelection } from '../../lib/selection-store'
import { FilterPills } from '../../components/filter-pills'
import { formatHms } from '../../lib/time'
import { RunTable } from './run-table'
import { RunSummary } from './run-summary'

const STATUS_LABEL: Record<RunStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  blocked: 'Blocked',
  succeeded: 'Succeeded',
  failed: 'Failed',
}

const STATUS_CLASSES: Record<RunStatus, string> = {
  queued: 'border-[var(--ag-ink-muted)]/25 bg-[var(--ag-ink-muted)]/10 text-[var(--ag-ink-muted)]',
  running: 'border-[var(--ag-accent)]/25 bg-[var(--ag-accent)]/10 text-[var(--ag-accent)]',
  blocked: 'border-[var(--ag-warn)]/30 bg-[var(--ag-warn)]/10 text-[var(--ag-warn)]',
  succeeded: 'border-[var(--ag-success)]/25 bg-[var(--ag-success)]/10 text-[var(--ag-success)]',
  failed: 'border-[var(--ag-danger)]/25 bg-[var(--ag-danger)]/10 text-[var(--ag-danger)]',
}

const FILTERS: Array<RunStatus | 'all'> = ['all', 'running', 'blocked', 'queued', 'succeeded', 'failed']

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1000)
  return `${minutes}m ${seconds}s`
}

function formatTokens(run: RunQueueItem): string {
  const total = run.inputTokens + run.outputTokens
  return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(total)
}

function StatusPill({ status }: { readonly status: RunStatus }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[0.65rem] font-medium border ${STATUS_CLASSES[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function RunDetail({ run }: { readonly run: RunQueueItem | null }) {
  if (run === null) {
    return (
      <aside className="flex min-h-0 flex-col justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select a run</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Inspect agents, spend, tokens, and trigger context for the selected task.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <div className="border-b border-[var(--ag-line)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--ag-ink)]" title={run.task}>
              {run.task}
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={run.id}>
              {run.id}
            </p>
          </div>
          <StatusPill status={run.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <DetailMetric label="Duration" value={formatDuration(run.durationMs)} />
        <DetailMetric label="Cost" value={`$${run.costUsd.toFixed(2)}`} />
        <DetailMetric label="Tokens" value={formatTokens(run)} />
        <DetailMetric label="Trigger" value={run.trigger} />
      </div>

      <div className="p-4">
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
          Agents
        </h3>
        <div className="mt-3 flex flex-col gap-2">
          {run.agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center justify-between gap-3 rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-[var(--ag-ink)]">{agent.label}</div>
                <div className="font-mono text-xs text-[var(--ag-ink-subtle)]">{agent.provider}</div>
              </div>
              <StatusPill status={agent.status} />
            </div>
          ))}
        </div>
      </div>
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

export function RunsScreen() {
  const { runs, loading, error } = useRuns()
  const [filter, setFilter] = useState<RunStatus | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(RUNS_FIXTURE[0]?.id ?? null)
  const { setSelectedRunId } = useSelection()

  const filteredRuns = useMemo(() => {
    return filter === 'all' ? runs : runs.filter((run) => run.status === filter)
  }, [filter, runs])

  const selectedRun = useMemo(() => {
    const match = runs.find((run) => run.id === selectedId)
    if (match) return match
    return filteredRuns[0] ?? null
  }, [filteredRuns, runs, selectedId])

  if (loading) {
    return (
      <section aria-label="Runs" className="flex h-full items-center justify-center text-sm text-[var(--ag-ink-muted)]">
        Loading runs...
      </section>
    )
  }

  return (
    <section aria-label="Runs" className="flex h-full min-h-0 flex-col bg-[var(--ag-surface)]">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--ag-line)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--ag-ink)]">Runs</h1>
          <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
            Monitor delegated agent tasks across providers, triggers, and cost.
          </p>
        </div>
        <Badge variant="outline">Preview mode</Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
        {error !== null && (
          <div role="status" className="rounded-md border border-[var(--ag-warn)]/25 bg-[var(--ag-warn)]/10 px-3 py-2 text-sm text-[var(--ag-warn)]">
            Sidecar runs provider unavailable. Showing local sample data.
          </div>
        )}

        <RunSummary runs={runs} />

        <FilterPills
          items={FILTERS}
          active={filter}
          onChange={setFilter}
          ariaLabel="Filter runs by status"
          labelFor={(item) => (item === 'all' ? 'All' : STATUS_LABEL[item])}
        />

        {filteredRuns.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No runs match this filter.</p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <RunTable
              runs={filteredRuns}
              selectedId={selectedRun?.id ?? null}
              onSelect={(id) => {
                setSelectedId(id)
                setSelectedRunId(id)
              }}
            />
            <RunDetail run={selectedRun} />
          </div>
        )}
      </div>
    </section>
  )
}
