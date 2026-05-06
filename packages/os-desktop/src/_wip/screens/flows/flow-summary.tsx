import type { FlowDefinition } from './use-flows'

type FlowSummaryItem = {
  readonly label: string
  readonly value: string
}

function buildSummaryItems(flows: readonly FlowDefinition[]): readonly FlowSummaryItem[] {
  const active = flows.filter((flow) => flow.status === 'active').length
  const draft = flows.filter((flow) => flow.status === 'draft').length
  const failing = flows.filter((flow) => flow.status === 'failing').length
  const runs = flows.reduce((total, flow) => total + flow.runs24h, 0)

  return [
    { label: 'Active', value: active.toString() },
    { label: 'Draft', value: draft.toString() },
    { label: 'Failing', value: failing.toString() },
    { label: 'Runs 24h', value: runs.toString() },
  ]
}

export function FlowSummary({ flows }: { readonly flows: readonly FlowDefinition[] }) {
  const items = buildSummaryItems(flows)

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-[var(--ag-line)] bg-[var(--ag-panel)] px-4 py-3"
        >
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
