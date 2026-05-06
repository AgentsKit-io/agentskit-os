import { FilterChips } from '../../components/filter-chips'
import { TRIGGER_PROVIDER_LABEL } from './trigger-labels'
import type { TriggerProvider } from './use-triggers'

export const TRIGGER_FILTERS = [
  'all',
  'slack',
  'discord',
  'teams',
  'cron',
  'github_pr',
  'webhook',
] as const

export type TriggerFilter = (typeof TRIGGER_FILTERS)[number]

export function TriggerProviderFilters({
  filter,
  onFilter,
}: {
  readonly filter: TriggerFilter
  readonly onFilter: (filter: TriggerFilter) => void
}) {
  return (
    <FilterChips
      ariaLabel="Filter triggers by provider"
      value={filter}
      items={TRIGGER_FILTERS}
      onChange={onFilter}
      renderItem={(item) => (
        item === 'all' ? 'All' : TRIGGER_PROVIDER_LABEL[item as TriggerProvider]
      )}
    />
  )
}
