import type { ReactNode } from 'react'

type FilterChipsProps<TValue extends string> = {
  readonly ariaLabel: string
  readonly value: TValue
  readonly items: readonly TValue[]
  readonly onChange: (value: TValue) => void
  readonly renderItem: (item: TValue) => ReactNode
}

const FILTER_BUTTON_BASE = [
  'rounded-full border px-3 py-1.5 text-sm font-medium transition',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
  'focus-visible:outline-[var(--ag-accent)]',
].join(' ')

export function FilterChips<TValue extends string>({
  ariaLabel,
  value,
  items,
  onChange,
  renderItem,
}: FilterChipsProps<TValue>) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={value === item}
          onClick={() => onChange(item)}
          className={[
            FILTER_BUTTON_BASE,
            value === item
              ? 'border-[var(--ag-accent)] bg-[color-mix(in_srgb,var(--ag-accent)_12%,transparent)] text-[var(--ag-accent)]'
              : 'border-[var(--ag-line)] text-[var(--ag-ink-muted)] hover:border-[var(--ag-accent)]/50 hover:text-[var(--ag-ink)]',
          ].join(' ')}
        >
          {renderItem(item)}
        </button>
      ))}
    </div>
  )
}
