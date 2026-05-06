/**
 * PaletteInput — search input with autofocus and category filter cycling.
 */

import { useEffect, useRef } from 'react'
import type { CommandCategory } from './commands'

const CATEGORIES: Array<CommandCategory | 'All'> = [
  'All',
  'Navigation',
  'Runtime',
  'View',
  'System',
]

type PaletteInputProps = {
  query: string
  onQueryChange: (q: string) => void
  activeCategory: CommandCategory | 'All'
  onCategoryChange: (cat: CommandCategory | 'All') => void
}

export function PaletteInput({
  query,
  onQueryChange,
  activeCategory,
  onCategoryChange,
}: PaletteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Autofocus when mounted
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const currentIndex = CATEGORIES.indexOf(activeCategory)
      const nextIndex = (currentIndex + 1) % CATEGORIES.length
      const next = CATEGORIES[nextIndex]
      if (next !== undefined) onCategoryChange(next)
    }
  }

  return (
    <div className="border-b border-[var(--ag-line)]">
      {/* Category filter chips */}
      <div className="flex gap-1 px-4 pt-3 pb-1 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onCategoryChange(cat)}
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-[var(--ag-accent)] text-[var(--ag-surface)]'
                : 'text-[var(--ag-ink-muted)] hover:text-[var(--ag-ink)] hover:bg-[var(--ag-panel)]'
            }`}
          >
            {cat}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-[var(--ag-ink-subtle)] self-center">
          Tab to cycle
        </span>
      </div>

      {/* Search field */}
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-label="Search commands"
        placeholder="Type a command…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={[
          'w-full bg-transparent px-4 py-3',
          'text-sm text-[var(--ag-ink)] placeholder:text-[var(--ag-ink-subtle)]',
          'outline-none',
        ].join(' ')}
      />
    </div>
  )
}
