/**
 * ExampleScreen — full-screen browse + run UI for the example library.
 *
 * Features:
 *   • Text search over title, description, tags
 *   • Intent filter buttons (one per canonical intent)
 *   • Grid of ExampleCards
 *   • "Try in OS" triggers useExampleRunner + shows a workspace-path toast
 */

import React, { useMemo, useState } from 'react'
import { EXAMPLES, ALL_INTENTS } from './examples-data'
import { ExampleCard } from './example-card'
import { useExampleRunner } from './use-example-runner'
import type { Example } from './example-types'

// ---------------------------------------------------------------------------
// Simple toast — ephemeral status region, no external dependency needed
// ---------------------------------------------------------------------------

function Toast({
  message,
  type,
  onDismiss,
}: {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="example-toast"
      className={[
        'fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg',
        type === 'success'
          ? 'border-[var(--ag-accent)]/30 bg-[var(--ag-panel)] text-[var(--ag-ink)]'
          : 'border-red-500/30 bg-[var(--ag-panel)] text-red-400',
      ].join(' ')}
    >
      <p className="flex-1 text-sm">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 text-[var(--ag-ink-muted)] hover:text-[var(--ag-ink)]"
      >
        ×
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Search + filter helpers
// ---------------------------------------------------------------------------

function matchesSearch(example: Example, query: string): boolean {
  if (query === '') return true
  const lower = query.toLowerCase()
  return (
    example.title.toLowerCase().includes(lower) ||
    example.description.toLowerCase().includes(lower) ||
    example.tags.some((t) => t.toLowerCase().includes(lower))
  )
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function ExampleScreen() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeIntent, setActiveIntent] = useState<string | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const { run } = useExampleRunner()

  const filtered = useMemo(() => {
    return EXAMPLES.filter((ex) => {
      if (activeIntent !== null && ex.intent !== activeIntent) return false
      return matchesSearch(ex, searchQuery)
    })
  }, [searchQuery, activeIntent])

  const handleTry = async (example: Example) => {
    setRunningId(example.id)
    try {
      // Re-create a local runner call so we can capture the result inline.
      // useExampleRunner is used at the top-level to avoid hook-in-callback.
      await run(example.templateId, example.id)
      setToast({
        message: `Workspace ready — check your Projects panel for "${example.title}".`,
        type: 'success',
      })
    } catch {
      setToast({ message: 'Failed to scaffold example. See console for details.', type: 'error' })
    } finally {
      setRunningId(null)
    }
  }

  return (
    <section aria-label="Example library" className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-[var(--ag-line)] px-6 py-5 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[var(--ag-ink)] tracking-tight">
            Example Library
          </h1>
          <p className="text-xs text-[var(--ag-ink-subtle)]">
            {filtered.length} example{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search */}
        <input
          type="search"
          role="searchbox"
          aria-label="Search examples"
          data-testid="example-search"
          placeholder="Search examples…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-1.5 text-sm text-[var(--ag-ink)] placeholder:text-[var(--ag-ink-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]"
        />

        {/* Intent filters */}
        <div
          role="group"
          aria-label="Filter by intent"
          className="flex flex-wrap gap-2"
          data-testid="intent-filters"
        >
          <button
            type="button"
            data-testid="intent-filter-all"
            onClick={() => setActiveIntent(null)}
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
              onClick={() => setActiveIntent(activeIntent === intent ? null : intent)}
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

      {/* Grid */}
      <div className="flex-1 overflow-auto px-6 py-6">
        {filtered.length === 0 ? (
          <p
            className="text-sm text-[var(--ag-ink-muted)]"
            data-testid="no-results"
          >
            No examples match your search.
          </p>
        ) : (
          <ul
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Examples"
          >
            {filtered.map((example) => (
              <li key={example.id}>
                <ExampleCard
                  example={example}
                  onTry={handleTry}
                  isRunning={runningId === example.id}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Toast */}
      {toast !== null && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </section>
  )
}
