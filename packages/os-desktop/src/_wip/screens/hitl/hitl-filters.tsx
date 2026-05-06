import { FilterChips } from '../../components/filter-chips'
import { HITL_KIND_LABEL, HITL_STATUS_LABEL } from './hitl-labels'
import {
  HITL_KIND_FILTERS,
  HITL_STATUS_FILTERS,
  type HitlKindFilter,
  type HitlSort,
  type HitlStatusFilter,
} from './use-hitl-inbox'
import type { HitlKind, HitlStatus } from './use-hitl'

type HitlFiltersProps = {
  readonly query: string
  readonly statusFilter: HitlStatusFilter
  readonly kindFilter: HitlKindFilter
  readonly sort: HitlSort
  readonly onQuery: (query: string) => void
  readonly onStatusFilter: (filter: HitlStatusFilter) => void
  readonly onKindFilter: (filter: HitlKindFilter) => void
  readonly onSort: (sort: HitlSort) => void
}

const SORT_BUTTON_BASE = [
  'rounded-full border px-3 py-1.5 text-sm font-medium transition',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
  'focus-visible:outline-[var(--ag-accent)]',
].join(' ')

export function HitlFilters({
  query,
  statusFilter,
  kindFilter,
  sort,
  onQuery,
  onStatusFilter,
  onKindFilter,
  onSort,
}: HitlFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
          Search
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Title, run id, requester..."
            className="rounded-lg border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ag-ink)] placeholder:text-[var(--ag-ink-subtle)]"
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            Sort by
          </span>
          <div className="flex gap-2">
            <SortButton active={sort === 'soonest'} label="Due soonest" onClick={() => onSort('soonest')} />
            <SortButton active={sort === 'newest'} label="Newest" onClick={() => onSort('newest')} />
          </div>
        </div>
      </div>

      <FilterChips
        ariaLabel="Filter human tasks by status"
        value={statusFilter}
        items={HITL_STATUS_FILTERS}
        onChange={onStatusFilter}
        renderItem={(item) => (item === 'all' ? 'All statuses' : HITL_STATUS_LABEL[item as HitlStatus])}
      />
      <FilterChips
        ariaLabel="Filter human tasks by queue kind"
        value={kindFilter}
        items={HITL_KIND_FILTERS}
        onChange={onKindFilter}
        renderItem={(item) => (item === 'all' ? 'All queues' : HITL_KIND_LABEL[item as HitlKind])}
      />
    </div>
  )
}

function SortButton({
  active,
  label,
  onClick,
}: {
  readonly active: boolean
  readonly label: string
  readonly onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        SORT_BUTTON_BASE,
        active
          ? 'border-[var(--ag-accent)] bg-[color-mix(in_srgb,var(--ag-accent)_12%,transparent)] text-[var(--ag-accent)]'
          : 'border-[var(--ag-line)] text-[var(--ag-ink-muted)] hover:border-[var(--ag-accent)]/50 hover:text-[var(--ag-ink)]',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
