import { FilterChips } from '../../components/filter-chips'
import { EVAL_STATUS_LABEL } from './eval-labels'
import type { EvalStatus } from './use-evals'

export const EVAL_FILTERS = ['all', 'passing', 'regressed', 'running', 'failing'] as const

export type EvalFilter = (typeof EVAL_FILTERS)[number]

export function EvalStatusFilters({
  filter,
  onFilter,
}: {
  readonly filter: EvalFilter
  readonly onFilter: (filter: EvalFilter) => void
}) {
  return (
    <FilterChips
      ariaLabel="Filter evals by status"
      value={filter}
      items={EVAL_FILTERS}
      onChange={onFilter}
      renderItem={(item) => (item === 'all' ? 'All' : EVAL_STATUS_LABEL[item as EvalStatus])}
    />
  )
}
