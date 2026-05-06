import { FilterChips } from '../../components/filter-chips'
import { BENCHMARK_PROVIDER_LABEL } from './benchmark-labels'
import type { BenchmarkProvider } from './use-benchmarks'

export const BENCHMARK_FILTERS = ['all', 'codex', 'claude', 'cursor', 'gemini'] as const

export type BenchmarkFilter = (typeof BENCHMARK_FILTERS)[number]

export function BenchmarkProviderFilters({
  filter,
  onFilter,
}: {
  readonly filter: BenchmarkFilter
  readonly onFilter: (filter: BenchmarkFilter) => void
}) {
  return (
    <FilterChips
      ariaLabel="Filter benchmarks by provider"
      value={filter}
      items={BENCHMARK_FILTERS}
      onChange={onFilter}
      renderItem={(item) => (
        item === 'all' ? 'All' : BENCHMARK_PROVIDER_LABEL[item as BenchmarkProvider]
      )}
    />
  )
}
