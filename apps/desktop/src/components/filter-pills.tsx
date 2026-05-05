export type FilterPillsProps<T extends string> = {
  readonly items: readonly T[]
  readonly active: T
  readonly onChange: (next: T) => void
  readonly ariaLabel: string
  readonly labelFor: (item: T) => string
}

const pillClassName = (active: boolean): string => {
  const base = 'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors'
  if (active) return `${base} border-[var(--ag-accent)] bg-[var(--ag-accent)]/10 text-[var(--ag-accent)]`
  return `${base} border-[var(--ag-line)] text-[var(--ag-ink-muted)] hover:border-[var(--ag-accent)]/50 hover:text-[var(--ag-ink)]`
}

export function FilterPills<T extends string>({
  items,
  active,
  onChange,
  ariaLabel,
  labelFor,
}: FilterPillsProps<T>): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={active === item}
          onClick={() => onChange(item)}
          className={pillClassName(active === item)}
        >
          {labelFor(item)}
        </button>
      ))}
    </div>
  )
}

