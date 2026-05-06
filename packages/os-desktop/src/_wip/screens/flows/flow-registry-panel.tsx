import type { FlowDefinition, FlowStatus } from './use-flows'
import { formatDate, TRIGGER_LABEL } from './flow-format'
import { FlowFilterChips } from './flow-filters'
import { FlowStatusPill } from './flow-status-pill'

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
        <FlowFilterChips value={filter} onChange={onFilter} />
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
                aria-selected={selectedId === flow.id}
                className={[
                  'transition',
                  selectedId === flow.id ? 'bg-[var(--ag-accent-dim)]' : 'hover:bg-[var(--ag-panel-alt)]',
                ].join(' ')}
              >
                <td className="max-w-[360px] px-4 py-3">
                  <button
                    type="button"
                    aria-current={selectedId === flow.id ? 'true' : undefined}
                    onClick={() => onSelect(flow.id)}
                    className="block max-w-full rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ag-accent)]"
                  >
                    <span className="block truncate font-medium text-[var(--ag-ink)]" title={flow.name}>
                      {flow.name}
                    </span>
                  </button>
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
