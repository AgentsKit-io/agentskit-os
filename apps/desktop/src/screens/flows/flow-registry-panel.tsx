import type { FlowDefinition, FlowStatus } from './use-flows'
import { formatDate, TRIGGER_LABEL } from './flow-format'
import { FlowStatusPill, flowStatusLabel } from './flow-status-pill'

export const FLOW_FILTERS: Array<FlowStatus | 'all'> = ['all', 'active', 'draft', 'paused', 'failing']

export function FlowSummary({ flows }: { readonly flows: readonly FlowDefinition[] }) {
  const active = flows.filter((flow) => flow.status === 'active').length
  const draft = flows.filter((flow) => flow.status === 'draft').length
  const failing = flows.filter((flow) => flow.status === 'failing').length
  const runs = flows.reduce((total, flow) => total + flow.runs24h, 0)

  const items = [
    { label: 'Active', value: active.toString() },
    { label: 'Draft', value: draft.toString() },
    { label: 'Failing', value: failing.toString() },
    { label: 'Runs 24h', value: runs.toString() },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-[var(--ag-line)] bg-[var(--ag-panel)] px-4 py-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
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

type FlowRegistryPanelProps = {
  readonly flows: readonly FlowDefinition[]
  readonly filter: FlowStatus | 'all'
  readonly selectedId: string | null
  readonly onFilter: (filter: FlowStatus | 'all') => void
  readonly onSelect: (id: string) => void
}

export function FlowRegistryPanel({
  flows,
  filter,
  selectedId,
  onFilter,
  onSelect,
}: FlowRegistryPanelProps) {
  return (
    <section className="rounded-2xl border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ag-line)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ag-ink)]">Flow registry</h2>
          <p className="mt-1 text-xs text-[var(--ag-ink-muted)]">
            Existing automations with runtime health and ownership.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter flows by status">
          {FLOW_FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={filter === item}
              onClick={() => onFilter(item)}
              className={[
                'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                filter === item
                  ? 'border-[var(--ag-accent)] bg-[var(--ag-accent-dim)] text-[var(--ag-accent)]'
                  : 'border-[var(--ag-line)] text-[var(--ag-ink-muted)] hover:border-[var(--ag-accent)] hover:text-[var(--ag-ink)]',
              ].join(' ')}
            >
              {item === 'all' ? 'All' : flowStatusLabel(item)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" aria-label="Flow registry">
          <thead>
            <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
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
                  'cursor-pointer transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
                  selectedId === flow.id ? 'bg-[var(--ag-accent-dim)]' : 'hover:bg-[var(--ag-panel-alt)]',
                ].join(' ')}
              >
                <td className="max-w-[360px] px-4 py-3">
                  <div className="truncate font-medium text-[var(--ag-ink)]" title={flow.name}>
                    {flow.name}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-xs text-[var(--ag-ink-subtle)]">
                    {flow.version} / {flow.owner}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <FlowStatusPill status={flow.status} />
                </td>
                <td className="px-3 py-3 text-[var(--ag-ink-muted)]">{TRIGGER_LABEL[flow.trigger]}</td>
                <td className="px-3 py-3 tabular-nums text-[var(--ag-ink-muted)]">{flow.successRatePct}%</td>
                <td className="px-3 py-3 tabular-nums text-[var(--ag-ink-muted)]">{flow.runs24h}</td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--ag-ink-subtle)]">
                  {formatDate(flow.lastRunAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

