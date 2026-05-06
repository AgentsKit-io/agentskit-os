import { FilterChips } from '../../components/filter-chips'
import { COST_PROVIDER_LABEL } from './cost-labels'
import type { CostProvider } from './use-cost'

export const COST_FILTERS = ['all', 'openai', 'anthropic', 'google', 'cursor'] as const

export type CostFilter = (typeof COST_FILTERS)[number]

export function CostProviderFilters({
  filter,
  onFilter,
}: {
  readonly filter: CostFilter
  readonly onFilter: (filter: CostFilter) => void
}) {
  return (
    <FilterChips
      ariaLabel="Filter budgets by provider"
      value={filter}
      items={COST_FILTERS}
      onChange={onFilter}
      renderItem={(item) => (item === 'all' ? 'All' : COST_PROVIDER_LABEL[item as CostProvider])}
    />
  )
}
