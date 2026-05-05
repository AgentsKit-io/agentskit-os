import { FilterChips } from '../../components/filter-chips'
import { SECURITY_AREA_LABEL } from './security-labels'
import type { SecurityArea } from './use-security'

export const SECURITY_FILTERS = ['all', 'audit', 'vault', 'policy', 'privacy'] as const

export type SecurityFilter = (typeof SECURITY_FILTERS)[number]

export function SecurityAreaFilters({
  filter,
  onFilter,
}: {
  readonly filter: SecurityFilter
  readonly onFilter: (filter: SecurityFilter) => void
}) {
  return (
    <FilterChips
      ariaLabel="Filter controls by area"
      value={filter}
      items={SECURITY_FILTERS}
      onChange={onFilter}
      renderItem={(item) => (item === 'all' ? 'All' : SECURITY_AREA_LABEL[item as SecurityArea])}
    />
  )
}
