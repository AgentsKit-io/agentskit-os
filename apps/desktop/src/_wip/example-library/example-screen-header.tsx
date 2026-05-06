import React from 'react'
import { ALL_INTENTS } from './examples-data'

export type ExampleScreenHeaderProps = {
  readonly filteredCount: number
  readonly searchQuery: string
  readonly onSearchQueryChange: (value: string) => void
  readonly activeIntent: string | null
  readonly onToggleIntent: (intent: string) => void
  readonly onClearIntent: () => void
}

export function ExampleScreenHeader({
  filteredCount,
  searchQuery,
  onSearchQueryChange,
  activeIntent,
  onToggleIntent,
  onClearIntent,
}: ExampleScreenHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--ag-line)] px-6 py-5 shrink-0">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--ag-ink)] tracking-tight">Example Library</h1>
        <p className="text-xs text-[var(--ag-ink-subtle)]">
          {filteredCount} example{filteredCount !== 1 ? 's' : ''}
        </p>
      </div>

      <input
        type="search"
        role="searchbox"
        aria-label="Search examples"
        data-testid="example-search"
        placeholder="Search examples…"
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        className={[
          'w-full max-w-sm rounded-lg border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-1.5 text-sm text-[var(--ag-ink)]',
          'placeholder:text-[var(--ag-ink-subtle)]',
          'focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]',
        ].join(' ')}
      />

      <div role="group" aria-label="Filter by intent" className="flex flex-wrap gap-2" data-testid="intent-filters">
        <button
          type="button"
          data-testid="intent-filter-all"
          onClick={onClearIntent}
          aria-pressed={activeIntent === null}
          className={[
            'rounded-full border px-3 py-0.5 text-xs transition-colors',
            activeIntent === null
              ? 'border-[var(--ag-accent)] bg-[var(--ag-accent)]/10 font-medium text-[var(--ag-accent)]'
              : 'border-[var(--ag-line)] text-[var(--ag-ink-muted)] hover:border-[var(--ag-accent)]/40 hover:text-[var(--ag-ink)]',
          ].join(' ')}
        >
          All
        </button>

        {ALL_INTENTS.map((intent) => (
          <button
            key={intent}
            type="button"
            data-testid={`intent-filter-${intent}`}
            onClick={() => onToggleIntent(intent)}
            aria-pressed={activeIntent === intent}
            className={[
              'rounded-full border px-3 py-0.5 text-xs transition-colors',
              activeIntent === intent
                ? 'border-[var(--ag-accent)] bg-[var(--ag-accent)]/10 font-medium text-[var(--ag-accent)]'
                : 'border-[var(--ag-line)] text-[var(--ag-ink-muted)] hover:border-[var(--ag-accent)]/40 hover:text-[var(--ag-ink)]',
            ].join(' ')}
          >
            {intent}
          </button>
        ))}
      </div>
    </div>
  )
}
