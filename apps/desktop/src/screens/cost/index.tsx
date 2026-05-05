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
import { formatMd } from '../../lib/time'

const PROVIDER_LABEL: Record<CostProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  cursor: 'Cursor',
}

const STATUS_LABEL: Record<BudgetStatus, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  exceeded: 'Exceeded',
}

const STATUS_CLASSES: Record<BudgetStatus, string> = {
  healthy: 'border-[var(--ag-success)]/25 bg-[var(--ag-success)]/10 text-[var(--ag-success)]',
  watch: 'border-[var(--ag-warn)]/30 bg-[var(--ag-warn)]/10 text-[var(--ag-warn)]',
  exceeded: 'border-[var(--ag-danger)]/25 bg-[var(--ag-danger)]/10 text-[var(--ag-danger)]',
}

const FILTERS: Array<CostProvider | 'all'> = ['all', 'openai', 'anthropic', 'google', 'cursor']

function StatusPill({ status }: { readonly status: BudgetStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[0.65rem] font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    currency: 'USD',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(value)
}

function formatTokens(tokens: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(tokens)
}

function percentUsed(budget: CostBudget): number {
  if (budget.limitUsd <= 0) return 0
  return Math.min(999, (budget.spendUsd / budget.limitUsd) * 100)
}

function CostSummary({ budgets }: { readonly budgets: readonly CostBudget[] }) {
  const spend = budgets.reduce((total, budget) => total + budget.spendUsd, 0)
  const limit = budgets.reduce((total, budget) => total + budget.limitUsd, 0)
  const exceeded = budgets.filter((budget) => budget.status === 'exceeded').length
  const tokens = budgets.reduce((total, budget) => total + budget.tokens, 0)

  const items = [
    { label: 'Spend', value: formatCurrency(spend) },
    { label: 'Limit', value: formatCurrency(limit) },
    { label: 'Exceeded', value: exceeded.toString() },
    { label: 'Tokens', value: formatTokens(tokens) },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)] px-4 py-3"
        >
          <div className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
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

function BudgetTable({
  budgets,
  selectedId,
  onSelect,
}: {
  readonly budgets: readonly CostBudget[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
}) {
  return (
    <div className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <table className="w-full border-collapse text-sm" aria-label="Cost budgets">
        <thead>
          <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
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
                'cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
                selectedId === budget.id ? 'bg-[var(--ag-accent)]/10' : 'hover:bg-[var(--ag-panel-alt)]',
              ].join(' ')}
            >
              <td className="max-w-[320px] px-4 py-3">
                <div className="truncate font-medium text-[var(--ag-ink)]" title={budget.name}>
                  {budget.name}
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-[var(--ag-ink-subtle)]">
                  {PROVIDER_LABEL[budget.provider]} - {budget.owner}
                </div>
              </td>
              <td className="px-3 py-3">
                <StatusPill status={budget.status} />
              </td>
              <td className="px-3 py-3">
                <div className="w-28">
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ag-line)]">
                    <div
                      className="h-full rounded-full bg-[var(--ag-accent)]"
                      style={{ width: `${Math.min(100, percentUsed(budget))}%` }}
                    />
                  </div>
                  <div className="mt-1 font-mono text-[0.65rem] text-[var(--ag-ink-subtle)]">
                    {percentUsed(budget).toFixed(0)}%
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink-muted)]">
                {formatCurrency(budget.spendUsd)}
              </td>
              <td className="px-3 py-3 tabular-nums text-[var(--ag-ink-muted)]">{budget.runs}</td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--ag-ink-subtle)]">
                {formatMd(budget.resetAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
        <DetailMetric label="Spend" value={formatCurrency(budget.spendUsd)} />
        <DetailMetric label="Limit" value={formatCurrency(budget.limitUsd)} />
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
            className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-300"
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
