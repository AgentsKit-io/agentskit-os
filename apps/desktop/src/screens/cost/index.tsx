import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import {
  COST_BUDGETS_FIXTURE,
  type BudgetStatus,
  type CostBudget,
  type CostProvider,
  useCostBudgets,
} from './use-cost'
import { FilterPills } from '../../components/filter-pills'
import { BudgetTable } from './budget-table'
import { CostSummary } from './cost-summary'
import { formatUsd, percentUsed } from './cost-format'

const PROVIDER_LABEL: Record<CostProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  cursor: 'Cursor',
}

const statusLabelByStatus: Record<BudgetStatus, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  exceeded: 'Exceeded',
}

const statusClassByStatus: Record<BudgetStatus, string> = {
  healthy: 'border-[var(--ag-success)]/25 bg-[var(--ag-success)]/10 text-[var(--ag-success)]',
  watch: 'border-[var(--ag-warn)]/30 bg-[var(--ag-warn)]/10 text-[var(--ag-warn)]',
  exceeded: 'border-[var(--ag-danger)]/25 bg-[var(--ag-danger)]/10 text-[var(--ag-danger)]',
}

const FILTERS: Array<CostProvider | 'all'> = ['all', 'openai', 'anthropic', 'google', 'cursor']

function StatusPill({ status }: { readonly status: BudgetStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[0.65rem] font-medium ${statusClassByStatus[status]}`}
    >
      {statusLabelByStatus[status]}
    </span>
  )
}

function DetailMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-[var(--ag-ink)]" title={value}>
        {value}
      </div>
    </div>
  )
}

function DetailBlock({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border-b border-[var(--ag-line)] p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
        {label}
      </h3>
      <div className="mt-2 rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]">
        {value}
      </div>
    </div>
  )
}

function BudgetDetail({ budget }: { readonly budget: CostBudget | null }) {
  if (budget === null) {
    return (
      <aside className="flex min-h-0 flex-col justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select a budget</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Inspect spend, limits, owner policy, and quota notes for the selected provider.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
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
          <StatusPill status={budget.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <DetailMetric label="Provider" value={PROVIDER_LABEL[budget.provider]} />
        <DetailMetric label="Used" value={`${percentUsed(budget).toFixed(0)}%`} />
        <DetailMetric label="Spend" value={formatUsd(budget.spendUsd)} />
        <DetailMetric label="Limit" value={formatUsd(budget.limitUsd)} />
      </div>

      <DetailBlock label="Owner" value={budget.owner} />
      <DetailBlock label="Policy" value={budget.policy} />

      <div className="p-4">
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
          Quota Notes
        </h3>
        <ul className="mt-3 flex flex-col gap-2">
          {budget.quotaNotes.map((note) => (
            <li
              key={note}
              className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]"
            >
              {note}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

export function CostScreen() {
  const { budgets, loading, error } = useCostBudgets()
  const [filter, setFilter] = useState<CostProvider | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(COST_BUDGETS_FIXTURE[0]?.id ?? null)

  const filteredBudgets = useMemo(() => {
    return filter === 'all' ? budgets : budgets.filter((budget) => budget.provider === filter)
  }, [budgets, filter])

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
    <section aria-label="Cost & Quotas" className="flex h-full min-h-0 flex-col bg-[var(--ag-surface)]">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--ag-line)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--ag-ink)]">Cost & Quotas</h1>
          <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
            Track provider spend, quota pressure, tokens, and cost guard policies.
          </p>
        </div>
        <Badge variant="outline">Preview mode</Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
        {error !== null && (
          <div
            role="status"
            className="rounded-md border border-[var(--ag-warn)]/25 bg-[var(--ag-warn)]/10 px-3 py-2 text-sm text-[var(--ag-warn)]"
          >
            Sidecar cost provider unavailable. Showing local sample data.
          </div>
        )}

        <CostSummary budgets={budgets} />

        <FilterPills
          items={FILTERS}
          active={filter}
          onChange={setFilter}
          ariaLabel="Filter budgets by provider"
          labelFor={(item) => (item === 'all' ? 'All' : PROVIDER_LABEL[item])}
        />

        {filteredBudgets.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No budgets match this provider.</p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <BudgetTable budgets={filteredBudgets} selectedId={selectedBudget?.id ?? null} onSelect={setSelectedId} />
            <BudgetDetail budget={selectedBudget} />
          </div>
        )}
      </div>
    </section>
  )
}
