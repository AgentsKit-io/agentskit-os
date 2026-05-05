import { formatRunsTokens, formatUsd } from './run-format'
import type { RunQueueItem } from './use-runs'

export function RunSummary({ runs }: { readonly runs: readonly RunQueueItem[] }) {
  const running = runs.filter((run) => run.status === 'running').length
  const blocked = runs.filter((run) => run.status === 'blocked').length
  const cost = runs.reduce((total, run) => total + run.costUsd, 0)

  const items = [
    { label: 'Active runs', value: running.toString() },
    { label: 'Blocked', value: blocked.toString() },
    { label: 'Spend', value: formatUsd(cost) },
    { label: 'Tokens', value: formatRunsTokens(runs) },
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
