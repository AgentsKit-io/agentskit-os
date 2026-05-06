import { formatUsd } from '../../lib/format'
import type { TriggerRule } from './use-triggers'

export function TriggerSummary({ triggers }: { readonly triggers: readonly TriggerRule[] }) {
  const active = triggers.filter((trigger) => trigger.status === 'active').length
  const failing = triggers.filter((trigger) => trigger.status === 'failing').length
  const runs24h = triggers.reduce((total, trigger) => total + trigger.runs24h, 0)
  const cost24h = triggers.reduce((total, trigger) => total + trigger.cost24hUsd, 0)

  const items = [
    { label: 'Active', value: active.toString() },
    { label: 'Failing', value: failing.toString() },
    { label: 'Runs 24h', value: runs24h.toString() },
    { label: 'Spend 24h', value: formatUsd(cost24h) },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[var(--ag-line)] bg-[var(--ag-glass-bg)] px-4 py-3 shadow-sm [backdrop-filter:var(--ag-glass-blur)]"
        >
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
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
