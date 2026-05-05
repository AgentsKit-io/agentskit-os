import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import { FLOWS_FIXTURE, type FlowDefinition, type FlowStatus, type FlowTrigger, useFlows } from './use-flows'
import { getRunMode } from '../../lib/run-mode-store'
import { formatDate, formatDuration } from '../../lib/format'
import { useRunFlow } from './use-run-flow'
import { FLOW_FILTERS, FlowRegistryPanel, FlowSummary } from './flow-registry-panel'

const statusLabelByStatus: Record<FlowStatus, string> = {
  active: 'Active',
  draft: 'Draft',
  paused: 'Paused',
  failing: 'Failing',
}

const statusClassByStatus: Record<FlowStatus, string> = {
  active: 'border-[var(--ag-success)]/25 bg-[var(--ag-success)]/10 text-[var(--ag-success)]',
  draft: 'border-[var(--ag-accent)]/25 bg-[var(--ag-accent)]/10 text-[var(--ag-accent)]',
  paused: 'border-[var(--ag-warn)]/30 bg-[var(--ag-warn)]/10 text-[var(--ag-warn)]',
  failing: 'border-[var(--ag-danger)]/25 bg-[var(--ag-danger)]/10 text-[var(--ag-danger)]',
}

const TRIGGER_LABEL: Record<FlowTrigger, string> = {
  cron: 'Cron',
  manual: 'Manual',
  pull_request: 'Pull request',
  slack: 'Slack',
  webhook: 'Webhook',
}

const FILTERS: Array<FlowStatus | 'all'> = FLOW_FILTERS

function StatusPill({ status }: { readonly status: FlowStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[0.65rem] font-medium ${statusClassByStatus[status]}`}
    >
      {statusLabelByStatus[status]}
    </span>
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
  const [selectedId, setSelectedId] = useState<string | null>(FLOWS_FIXTURE[0]?.id ?? null)
  const { runFlow, running } = useRunFlow()

  const filteredFlows = useMemo(() => {
    return filter === 'all' ? flows : flows.filter((flow) => flow.status === filter)
  }, [flows, filter])

  const selectedFlow = useMemo(() => {
    const match = flows.find((flow) => flow.id === selectedId)
    if (match) return match
    return filteredFlows[0] ?? null
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
          <h1 className="text-lg font-semibold tracking-tight text-[var(--ag-ink)]">
            Flows, agents, skills, and templates
          </h1>
          <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
            Review orchestration definitions, triggers, topology, and run health before the visual editor lands.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Local registry</Badge>
          <button
            type="button"
            disabled={running || selectedFlow === null}
            className={[
              'rounded-md border border-[var(--ag-line)] bg-[var(--ag-panel)] px-3 py-1.5',
              'text-sm font-medium text-[var(--ag-ink)]',
              'hover:border-[var(--ag-accent)] hover:text-[var(--ag-accent)]',
              'disabled:opacity-50',
            ].join(' ')}
            onClick={() => {
              if (!selectedFlow) return
              void runFlow({ flowId: selectedFlow.id, mode: getRunMode() })
            }}
          >
            {running ? 'Running…' : 'Run flow'}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
        {error !== null && (
          <div
            role="status"
            className="rounded-md border border-[var(--ag-warn)]/25 bg-[var(--ag-warn)]/10 px-3 py-2 text-sm text-[var(--ag-warn)]"
          >
            Sidecar flow provider unavailable. Showing local sample data.
          </div>
        )}

        <FlowSummary flows={flows} />

        {filteredFlows.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No flows match this status.</p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <FlowRegistryPanel
              flows={filteredFlows}
              filter={filter}
              selectedId={selectedFlow?.id ?? null}
              onFilter={setFilter}
              onSelect={setSelectedId}
            />
            <FlowDetail flow={selectedFlow} />
          </div>
        )}
      </div>
    </section>
  )
}
