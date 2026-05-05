/**
 * SearchOverlay — global fuzzy search modal (D-11).
 *
 * Opens via `useSearch().open()` or Cmd+/ / Ctrl+/.
 * Searches across workspaces, agents, flows, recent runs, traces,
 * palette commands, and doc links.
 *
 * Keyboard behaviour:
 *   ↑↓     — navigate results
 *   Enter  — run selected result
 *   Esc    — close overlay
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GlassPanel } from '@agentskit/os-ui'
import { useSearch } from './search-provider'
import { useCommandPalette } from '../command-palette/command-palette-provider'
import { useWorkspaces } from '../workspaces/workspaces-provider'
import { useTraces } from '../screens/traces/use-traces'
import { fuzzyFilter } from './fuzzy-match'
import { gatherEntities } from './search-providers'
import { BUILT_IN_DOC_LINKS } from './search-providers'
import { KIND_LABELS, KIND_ORDER } from './search-types'
import { FindSimilarButton } from './find-similar-button'
import type { SearchEntity, SearchEntityKind } from './search-types'
import { ShortcutHints } from '../components/shortcut-hints'

// ---------------------------------------------------------------------------
// Result item
// ---------------------------------------------------------------------------

type ResultItemProps = {
  readonly entity: SearchEntity
  readonly isSelected: boolean
  readonly onSelect: () => void
  readonly onRun: () => void
}

function ResultItem({ entity, isSelected, onSelect, onRun }: ResultItemProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  // Scroll selected item into view
  useEffect(() => {
    if (isSelected && ref.current) {
      // scrollIntoView may not be available in test/jsdom environments
      ref.current.scrollIntoView?.({ block: 'nearest' })
    }
  }, [isSelected])

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={isSelected}
      onMouseEnter={onSelect}
      className={[
        'flex w-full items-start gap-3 px-4 py-2 transition-colors cursor-pointer',
        isSelected
          ? 'bg-[var(--ag-accent)]/15 text-[var(--ag-accent)]'
          : 'text-[var(--ag-ink)] hover:bg-[var(--ag-panel-alt)]',
      ].join(' ')}
    >
      {/* Clickable label area */}
      <button
        type="button"
        tabIndex={-1}
        onClick={onRun}
        className="min-w-0 flex-1 text-left bg-transparent border-0 p-0 m-0 cursor-pointer"
      >
        <p className="truncate text-sm font-medium">{entity.label}</p>
        {entity.subtitle !== undefined && (
          <p className="truncate text-[11px] text-[var(--ag-ink-muted)]">{entity.subtitle}</p>
        )}
      </button>
      {isSelected && (
        <FindSimilarButton
          entityId={entity.id}
          className="shrink-0 self-center"
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Group heading
// ---------------------------------------------------------------------------

function GroupHeading({ kind }: { kind: SearchEntityKind }): React.JSX.Element {
  return (
    <div className="sticky top-0 px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--ag-ink-subtle)] bg-[var(--ag-surface)]/80 backdrop-blur-sm z-10">
      {KIND_LABELS[kind]}
    </div>
  )
}

const groupByKind = (results: SearchEntity[]): Array<{ kind: SearchEntityKind; entities: SearchEntity[] }> => {
  const byKind = new Map<SearchEntityKind, SearchEntity[]>()
  for (const entity of results) {
    const list = byKind.get(entity.kind) ?? []
    list.push(entity)
    byKind.set(entity.kind, list)
  }
  return KIND_ORDER
    .filter((k) => byKind.has(k))
    .map((k) => ({ kind: k, entities: byKind.get(k)! }))
}

const useOverlayKeyboardNav = (args: {
  close: () => void
  resultsLength: number
  runSelected: () => void
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
}): ((e: React.KeyboardEvent<HTMLDivElement>) => void) => {
  const { close, resultsLength, runSelected, setSelectedIndex } = args
  return useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, resultsLength - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        runSelected()
      }
    },
    [close, resultsLength, runSelected, setSelectedIndex],
  )
}

// ---------------------------------------------------------------------------
// SearchOverlay
// ---------------------------------------------------------------------------

export function SearchOverlay(): React.JSX.Element | null {
  const { isOpen, close } = useSearch()
  const { commands } = useCommandPalette()
  const { all: workspaces } = useWorkspaces()
  const { traces } = useTraces()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)

  // Build entity list (memoised; rebuilds when data or query changes)
  const allEntities = useMemo(
    () =>
      gatherEntities({
        workspaces,
        commands,
        traces,
        docs: BUILT_IN_DOC_LINKS,
        onCommandRun: close,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaces, commands, traces],
  )

  const results = useMemo(() => fuzzyFilter(query, allEntities), [query, allEntities])

  // Reset state when overlay opens/closes
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      // Focus input after render
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results.length, query])

  const runSelected = useCallback(() => {
    const entity = results[selectedIndex]
    if (entity) {
      entity.run()
      close()
    }
  }, [results, selectedIndex, close])

  const handleKeyDown = useOverlayKeyboardNav({
    close,
    resultsLength: results.length,
    runSelected,
    setSelectedIndex,
  })

  // Group results by kind, preserving KIND_ORDER
  const grouped = useMemo(() => groupByKind(results), [results])

  // Flat index → result mapping for keyboard selection
  const flatResults = useMemo(
    () => grouped.flatMap((g) => g.entities),
    [grouped],
  )

  if (!isOpen) return null

  const isMac = typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac')
  const shortcutHint = isMac ? '⌘/' : 'Ctrl+/'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search everything"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4"
      style={{ paddingTop: '15vh' }}
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <GlassPanel
        blur="lg"
        className="w-full max-w-[640px] overflow-hidden shadow-2xl flex flex-col"
        style={{ maxHeight: '70vh' }}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-0 shrink-0">
          <span className="text-[11px] font-medium text-[var(--ag-ink-subtle)]">
            Search Everything
          </span>
          <ShortcutHints shortcutHint={shortcutHint} enterVerb="open" />
        </div>

        {/* Search input */}
        <div className="px-4 py-3 border-b border-[var(--ag-line)] shrink-0">
          <input
            ref={inputRef}
            type="search"
            role="searchbox"
            aria-label="Search query"
            aria-autocomplete="list"
            aria-controls="search-results-list"
            placeholder="Search workspaces, flows, traces, commands…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-[var(--ag-ink)] placeholder:text-[var(--ag-ink-muted)] outline-none text-sm"
          />
        </div>

        {/* Results */}
        <div
          id="search-results-list"
          role="listbox"
          aria-label="Search results"
          className="overflow-y-auto flex-1"
        >
          {results.length === 0 && query.trim().length > 0 && (
            <p className="px-4 py-6 text-center text-sm text-[var(--ag-ink-muted)]">
              No results for <strong className="text-[var(--ag-ink)]">"{query}"</strong>
            </p>
          )}

          {results.length === 0 && query.trim().length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-[var(--ag-ink-muted)]">
              Start typing to search across workspaces, flows, traces, commands, and docs.
            </p>
          )}

          {grouped.map((group) => (
            <div key={group.kind} role="group" aria-label={KIND_LABELS[group.kind]}>
              <GroupHeading kind={group.kind} />
              {group.entities.map((entity) => {
                const flatIdx = flatResults.indexOf(entity)
                return (
                  <ResultItem
                    key={entity.id}
                    entity={entity}
                    isSelected={flatIdx === selectedIndex}
                    onSelect={() => setSelectedIndex(flatIdx)}
                    onRun={() => {
                      entity.run()
                      close()
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="shrink-0 border-t border-[var(--ag-line)] px-4 py-2 text-[10px] text-[var(--ag-ink-subtle)]">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </div>
        )}
      </GlassPanel>
    </div>
  )
}
