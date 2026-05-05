import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import { MOCK_FLOWS, type FlowDefinition, type FlowStatus, type FlowTrigger, useFlows } from './use-flows'

const STATUS_LABEL: Record<FlowStatus, string> = {
  active: 'Active',
  draft: 'Draft',
  paused: 'Paused',
  failing: 'Failing',
}

const STATUS_CLASSES: Record<FlowStatus, string> = {
  active: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  draft: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
  paused: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  failing: 'border-red-500/25 bg-red-500/10 text-red-300',
}

const TRIGGER_LABEL: Record<FlowTrigger, string> = {
  cron: 'Cron',
  manual: 'Manual',
  pull_request: 'Pull request',
  slack: 'Slack',
  webhook: 'Webhook',
}

const FILTERS: Array<FlowStatus | 'all'> = ['all', 'active', 'draft', 'paused', 'failing']

function StatusPill({ status }: { readonly status: FlowStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[0.65rem] font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatDuration(ms: number): string {
  if (ms <= 0) return 'n/a'
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`
}

function FlowSummary({ flows }: { readonly flows: readonly FlowDefinition[] }) {
  const active = flows.filter((flow) => flow.status === 'active').length
  const draft = flows.filter((flow) => flow.status === 'draft').length
  const paused = flows.filter((flow) => flow.status === 'paused').length
  const runs = flows.reduce((total, flow) => total + flow.runs24h, 0)

  const items = [
    { label: 'Active', value: active.toString() },
    { label: 'Draft', value: draft.toString() },
    { label: 'Paused', value: paused.toString() },
    { label: 'Runs 24h', value: runs.toString() },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)] px-4 py-3"
        >
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

function FlowsTable({
  flows,
  selectedId,
  onSelect,
}: {
  readonly flows: readonly FlowDefinition[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
}) {
  return (
    <div className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <table className="w-full border-collapse text-sm" aria-label="Flow registry">
        <thead>
          <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
            <th className="px-4 py-2 font-medium">Flow</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Trigger</th>
            <th className="px-3 py-2 font-medium">Success</th>
            <th className="px-3 py-2 font-medium">Runs</th>
            <th className="px-4 py-2 font-medium">Last run</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ag-line-soft)]">
          {flows.map((flow) => (
            <tr
              key={flow.id}
              tabIndex={0}
              aria-selected={selectedId === flow.id}
              onClick={() => onSelect(flow.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(flow.id)
                }
              }}
              className={[
                'cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
                selectedId === flow.id ? 'bg-[var(--ag-accent)]/10' : 'hover:bg-[var(--ag-panel-alt)]',
              ].join(' ')}
            >
              <td className="max-w-[360px] px-4 py-3">
                <div className="truncate font-medium text-[var(--ag-ink)]" title={flow.name}>
                  {flow.name}
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-[var(--ag-ink-subtle)]">
                  {flow.version} - {flow.owner}
                </div>
              </td>
              <td className="px-3 py-3">
                <StatusPill status={flow.status} />
              </td>
              <td className="px-3 py-3 text-[var(--ag-ink-muted)]">{TRIGGER_LABEL[flow.trigger]}</td>
              <td className="px-3 py-3">
                <div className="w-28">
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ag-line)]">
                    <div
                      className="h-full rounded-full bg-[var(--ag-accent)]"
                      style={{ width: `${Math.min(100, flow.successRatePct)}%` }}
                    />
                  </div>
                  <div className="mt-1 font-mono text-[0.65rem] text-[var(--ag-ink-subtle)]">
                    {flow.successRatePct}%
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 tabular-nums text-[var(--ag-ink-muted)]">{flow.runs24h}</td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--ag-ink-subtle)]">
                {formatDate(flow.lastRunAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

function FlowDetail({ flow }: { readonly flow: FlowDefinition | null }) {
  if (flow === null) {
    return (
      <aside className="flex min-h-0 flex-col justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select a flow</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Inspect topology, version, trigger, and operational notes for the selected flow.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <div className="border-b border-[var(--ag-line)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--ag-ink)]" title={flow.name}>
              {flow.name}
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={flow.id}>
              {flow.id}
            </p>
          </div>
          <StatusPill status={flow.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <DetailMetric label="Trigger" value={TRIGGER_LABEL[flow.trigger]} />
        <DetailMetric label="Duration" value={formatDuration(flow.avgDurationMs)} />
        <DetailMetric label="Success" value={`${flow.successRatePct}%`} />
        <DetailMetric label="Version" value={flow.version} />
      </div>

      <div className="border-b border-[var(--ag-line)] p-4">
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
          Topology
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {flow.nodes.map((node) => (
            <span
              key={node}
              className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-2.5 py-1 font-mono text-xs text-[var(--ag-ink-muted)]"
            >
              {node}
            </span>
          ))}
        </div>
        <ul className="mt-3 flex flex-col gap-1.5">
          {flow.edges.map((edge) => (
            <li key={edge} className="font-mono text-xs text-[var(--ag-ink-subtle)]">
              {edge}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-4">
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
          Notes
        </h3>
        <ul className="mt-3 flex flex-col gap-2">
          {flow.notes.map((note) => (
            <li
              key={note}
              className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]"
            >
              {note}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

export function FlowsScreen() {
  const { flows, loading, error } = useFlows()
  const [filter, setFilter] = useState<FlowStatus | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_FLOWS[0]?.id ?? null)

  const filteredFlows = useMemo(() => {
    return filter === 'all' ? flows : flows.filter((flow) => flow.status === filter)
  }, [flows, filter])

  const selectedFlow = useMemo(() => {
    return flows.find((flow) => flow.id === selectedId) ?? filteredFlows[0] ?? null
  }, [flows, filteredFlows, selectedId])

  if (loading) {
    return (
      <section
        aria-label="Flows"
        className="flex h-full items-center justify-center text-sm text-[var(--ag-ink-muted)]"
      >
        Loading flows...
      </section>
    )
  }

  return (
    <section aria-label="Flows" className="flex h-full min-h-0 flex-col bg-[var(--ag-surface)]">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--ag-line)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--ag-ink)]">Flows</h1>
          <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
            Review orchestration definitions, triggers, topology, and run health before the visual editor lands.
          </p>
        </div>
        <Badge variant="outline">Read-only</Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
        {error !== null && (
          <div
            role="status"
            className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-300"
          >
            Sidecar flow provider unavailable. Showing local sample data.
          </div>
        )}

        <FlowSummary flows={flows} />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter flows by status">
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

        {filteredFlows.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No flows match this status.</p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <FlowsTable flows={filteredFlows} selectedId={selectedFlow?.id ?? null} onSelect={setSelectedId} />
            <FlowDetail flow={selectedFlow} />
          </div>
        )}
      </div>
    </section>
  )
}
