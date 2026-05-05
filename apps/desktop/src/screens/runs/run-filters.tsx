import { FilterChips } from '../../components/filter-chips'
import { RunStatusPill, runStatusLabel } from './run-status-pill'
import type { RunStatus } from './use-runs'

export const RUN_FILTERS = ['all', 'running', 'blocked', 'queued', 'succeeded', 'failed'] as const

export type RunFilter = (typeof RUN_FILTERS)[number]

export function RunFilters({
  filter,
  onFilter,
}: {
  readonly filter: RunFilter
  readonly onFilter: (filter: RunFilter) => void
}) {
  return (
    <FilterChips
      ariaLabel="Filter runs by status"
      value={filter}
      items={RUN_FILTERS}
      onChange={onFilter}
      renderItem={(item) => (
        <>
          {item === 'all' ? 'All' : <RunStatusPill status={item as RunStatus} />}
          <span className="sr-only">{item === 'all' ? '' : runStatusLabel(item as RunStatus)}</span>
        </>
      )}
    />
  )
}
