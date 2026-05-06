import { FilterChips } from '../../components/filter-chips'
import type { FlowStatus } from './use-flows'
import { flowStatusLabel } from './flow-status-pill'

export const FLOW_FILTERS: Array<FlowStatus | 'all'> = ['all', 'active', 'draft', 'paused', 'failing']

type FlowFilterChipsProps = {
  readonly value: FlowStatus | 'all'
  readonly onChange: (filter: FlowStatus | 'all') => void
}

export function FlowFilterChips({ value, onChange }: FlowFilterChipsProps) {
  return (
    <FilterChips
      ariaLabel="Filter flows by status"
      value={value}
      items={FLOW_FILTERS}
      onChange={onChange}
      renderItem={(item) => (item === 'all' ? 'All' : flowStatusLabel(item))}
    />
  )
}
