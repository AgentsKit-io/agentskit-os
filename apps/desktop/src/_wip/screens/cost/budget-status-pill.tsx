import { BUDGET_STATUS_LABEL } from './cost-labels'
import type { BudgetStatus } from './use-cost'

const STATUS_TOKEN: Record<BudgetStatus, string> = {
  healthy: 'border-[color-mix(in_srgb,var(--ag-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-success)_12%,transparent)] text-[var(--ag-success)]',
  watch: 'border-[color-mix(in_srgb,var(--ag-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_12%,transparent)] text-[var(--ag-warning)]',
  exceeded: 'border-[color-mix(in_srgb,var(--ag-danger)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-danger)_12%,transparent)] text-[var(--ag-danger)]',
}

export function BudgetStatusPill({ status }: { readonly status: BudgetStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${STATUS_TOKEN[status]}`}
    >
      {BUDGET_STATUS_LABEL[status]}
    </span>
  )
}
