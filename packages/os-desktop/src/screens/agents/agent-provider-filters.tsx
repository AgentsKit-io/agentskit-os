import { FilterChips } from '../../components/filter-chips'
import { AGENT_PROVIDER_LABEL } from './agent-labels'
import type { AgentProvider } from './use-agents'

export const AGENT_FILTERS = ['all', 'codex', 'claude', 'cursor', 'gemini'] as const

export type AgentFilter = (typeof AGENT_FILTERS)[number]

export function AgentProviderFilters({
  filter,
  onFilter,
}: {
  readonly filter: AgentFilter
  readonly onFilter: (filter: AgentFilter) => void
}) {
  return (
    <FilterChips
      ariaLabel="Filter agents by provider"
      value={filter}
      items={AGENT_FILTERS}
      onChange={onFilter}
      renderItem={(item) => (item === 'all' ? 'All' : AGENT_PROVIDER_LABEL[item as AgentProvider])}
    />
  )
}
