import type { FlowDefinition } from './use-flows'
import { formatDuration, TRIGGER_LABEL } from './flow-format'
import { FlowCanvasPreview } from './flow-canvas-preview'
import { FlowStatusPill } from './flow-status-pill'

function DetailMetric({ label, value }: { readonly label: string; readonly value: string }) {
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

export function FlowDetailPanel({ flow }: { readonly flow: FlowDefinition | null }) {
  if (!flow) {
    return (
      <aside className="flex min-h-[360px] flex-col justify-center rounded-2xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select a flow</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Inspect topology, trigger, ownership, notes, and operational health.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-2xl border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-[var(--ag-ink)]" title={flow.name}>
            {flow.name}
          </h2>
          <p className="mt-1 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={flow.id}>
            {flow.id}
          </p>
        </div>
        <FlowStatusPill status={flow.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-[var(--ag-line)] bg-[var(--ag-panel)] p-4">
        <DetailMetric label="Trigger" value={TRIGGER_LABEL[flow.trigger]} />
        <DetailMetric label="Duration" value={formatDuration(flow.avgDurationMs)} />
        <DetailMetric label="Success" value={`${flow.successRatePct}%`} />
        <DetailMetric label="Owner" value={flow.owner} />
      </div>

      <div className="mt-4">
        <FlowCanvasPreview flow={flow} />
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--ag-line)] bg-[var(--ag-panel)] p-4">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
          Notes
        </h3>
        <ul className="mt-3 flex flex-col gap-2">
          {flow.notes.map((note) => (
            <li key={note} className="text-sm leading-6 text-[var(--ag-ink-muted)]">
              {note}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

