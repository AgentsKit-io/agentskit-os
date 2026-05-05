import { formatCostTokens, formatUsd } from './cost-format'
import type { CostBudget } from './use-cost'

export function CostSummary({ budgets }: { readonly budgets: readonly CostBudget[] }) {
  const spend = budgets.reduce((total, budget) => total + budget.spendUsd, 0)
  const limit = budgets.reduce((total, budget) => total + budget.limitUsd, 0)
  const exceeded = budgets.filter((budget) => budget.status === 'exceeded').length
  const tokens = budgets.reduce((total, budget) => total + budget.tokens, 0)

  const items = [
    { label: 'Spend', value: formatUsd(spend) },
    { label: 'Limit', value: formatUsd(limit) },
    { label: 'Exceeded', value: exceeded.toString() },
    { label: 'Tokens', value: formatCostTokens(tokens) },
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
          <div className="mt-1 truncate text-xl font-semibold text-[var(--ag-ink)] tabular-nums">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}
