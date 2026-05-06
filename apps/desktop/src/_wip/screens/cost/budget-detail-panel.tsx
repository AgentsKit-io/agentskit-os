import { BudgetStatusPill } from './budget-status-pill'
import { formatUsd, percentUsed } from './cost-format'
import { COST_PROVIDER_LABEL } from './cost-labels'
import type { CostBudget } from './use-cost'

export function BudgetDetailPanel({ budget }: { readonly budget: CostBudget | null }) {
  if (budget === null) {
    return (
      <aside className="flex min-h-[320px] flex-col justify-center rounded-xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select a budget</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Inspect spend, limits, owner policy, and quota notes for the selected provider.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <div className="border-b border-[var(--ag-line)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--ag-ink)]" title={budget.name}>
              {budget.name}
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={budget.id}>
              {budget.id}
            </p>
          </div>
          <BudgetStatusPill status={budget.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <BudgetMetric label="Provider" value={COST_PROVIDER_LABEL[budget.provider]} />
        <BudgetMetric label="Used" value={`${percentUsed(budget).toFixed(0)}%`} />
        <BudgetMetric label="Spend" value={formatUsd(budget.spendUsd)} />
        <BudgetMetric label="Limit" value={formatUsd(budget.limitUsd)} />
      </div>

      <BudgetBlock label="Owner" value={budget.owner} />
      <BudgetBlock label="Policy" value={budget.policy} />
      <BudgetNotes notes={budget.quotaNotes} />
    </aside>
  )
}

function BudgetMetric({ label, value }: { readonly label: string; readonly value: string }) {
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

function BudgetBlock({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border-b border-[var(--ag-line)] p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
        {label}
      </h3>
      <div className="mt-2 rounded-lg border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]">
        {value}
      </div>
    </div>
  )
}

function BudgetNotes({ notes }: { readonly notes: readonly string[] }) {
  return (
    <div className="p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
        Quota Notes
      </h3>
      <ul className="mt-3 flex flex-col gap-2">
        {notes.map((note) => (
          <li
            key={note}
            className="rounded-lg border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]"
          >
            {note}
          </li>
        ))}
      </ul>
    </div>
  )
}
