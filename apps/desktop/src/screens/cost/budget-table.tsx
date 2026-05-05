import {
  formatResetDate,
  formatUsd,
  percentUsed,
} from './cost-format'
import { COST_PROVIDER_LABEL } from './cost-labels'
import { BudgetStatusPill } from './budget-status-pill'
import type { CostBudget } from './use-cost'

type BudgetTableProps = {
  readonly budgets: readonly CostBudget[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
}

const ROW_BASE_CLASS = [
  'cursor-pointer transition focus-visible:outline focus-visible:outline-2',
  'focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
].join(' ')

export function BudgetTable({ budgets, selectedId, onSelect }: BudgetTableProps) {
  return (
    <div className="min-h-0 overflow-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <table className="w-full min-w-[780px] border-collapse text-sm" aria-label="Cost budgets">
        <thead>
          <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            <th className="px-4 py-2 font-medium">Budget</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Used</th>
            <th className="px-3 py-2 font-medium">Spend</th>
            <th className="px-3 py-2 font-medium">Runs</th>
            <th className="px-4 py-2 font-medium">Reset</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ag-line-soft)]">
          {budgets.map((budget) => (
            <tr
              key={budget.id}
              tabIndex={0}
              aria-selected={selectedId === budget.id}
              onClick={() => onSelect(budget.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(budget.id)
                }
              }}
              className={[
                ROW_BASE_CLASS,
                selectedId === budget.id
                  ? 'bg-[color-mix(in_srgb,var(--ag-accent)_10%,transparent)]'
                  : 'hover:bg-[var(--ag-panel-alt)]',
              ].join(' ')}
            >
              <td className="max-w-[320px] px-4 py-3">
                <div className="truncate font-medium text-[var(--ag-ink)]" title={budget.name}>
                  {budget.name}
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-[var(--ag-ink-subtle)]">
                  {COST_PROVIDER_LABEL[budget.provider]} - {budget.owner}
                </div>
              </td>
              <td className="px-3 py-3">
                <BudgetStatusPill status={budget.status} />
              </td>
              <td className="px-3 py-3">
                <BudgetUsage budget={budget} />
              </td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink-muted)]">
                {formatUsd(budget.spendUsd)}
              </td>
              <td className="px-3 py-3 tabular-nums text-[var(--ag-ink-muted)]">{budget.runs}</td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--ag-ink-subtle)]">
                {formatResetDate(budget.resetAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BudgetUsage({ budget }: { readonly budget: CostBudget }) {
  const used = percentUsed(budget)

  return (
    <div className="w-28">
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ag-line)]">
        <div
          className="h-full rounded-full bg-[var(--ag-accent)]"
          style={{ width: `${Math.min(100, used)}%` }}
        />
      </div>
      <div className="mt-1 font-mono text-[0.65rem] text-[var(--ag-ink-subtle)]">
        {used.toFixed(0)}%
      </div>
    </div>
  )
}
