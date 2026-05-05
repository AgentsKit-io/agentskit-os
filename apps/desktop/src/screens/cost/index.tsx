import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import { BudgetDetailPanel } from './budget-detail-panel'
import { BudgetTable } from './budget-table'
import { CostProviderFilters, COST_FILTERS, type CostFilter } from './cost-provider-filters'
import { CostSummary } from './cost-summary'
import { COST_BUDGETS_FIXTURE, useCostBudgets } from './use-cost'

const COST_HEADER_CLASS = [
  'sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-4',
  'border-b border-[var(--ag-line)] bg-[var(--ag-glass-strong-bg)] px-4 py-3',
  '[backdrop-filter:var(--ag-glass-blur)] sm:px-6',
].join(' ')

export function CostScreen() {
  const { budgets, loading, error } = useCostBudgets()
  const [filter, setFilter] = useState<CostFilter>(COST_FILTERS[0])
  const [selectedId, setSelectedId] = useState<string | null>(COST_BUDGETS_FIXTURE[0]?.id ?? null)

  const filteredBudgets = useMemo(
    () => (filter === 'all' ? budgets : budgets.filter((budget) => budget.provider === filter)),
    [budgets, filter],
  )

  const selectedBudget = useMemo(() => {
    const match = budgets.find((budget) => budget.id === selectedId)
    if (match) return match
    return filteredBudgets[0] ?? null
  }, [budgets, filteredBudgets, selectedId])

  if (loading) {
    return (
      <section
        aria-label="Cost & Quotas"
        className="flex h-full items-center justify-center text-sm text-[var(--ag-ink-muted)]"
      >
        Loading budgets...
      </section>
    )
  }

  return (
    <section aria-label="Cost & Quotas" className="flex min-h-full flex-col bg-[var(--ag-surface)]">
      <div className={COST_HEADER_CLASS}>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            Spend control
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ag-ink)]">
            Cost & Quotas
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ag-ink-muted)]">
            Track provider spend, quota pressure, tokens, and cost guard policies.
          </p>
        </div>
        <Badge variant="outline">Preview mode</Badge>
      </div>

      <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
        {error !== null && (
          <div
            role="status"
            className="rounded-xl border border-[color-mix(in_srgb,var(--ag-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_12%,transparent)] px-3 py-2 text-sm text-[var(--ag-warning)]"
          >
            Sidecar cost provider unavailable. Showing local sample data.
          </div>
        )}

        <CostSummary budgets={budgets} />
        <CostProviderFilters filter={filter} onFilter={setFilter} />

        {filteredBudgets.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No budgets match this provider.</p>
          </div>
        ) : (
          <div className="grid min-h-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <BudgetTable
              budgets={filteredBudgets}
              selectedId={selectedBudget?.id ?? null}
              onSelect={setSelectedId}
            />
            <BudgetDetailPanel budget={selectedBudget} />
          </div>
        )}
      </div>
    </section>
  )
}
