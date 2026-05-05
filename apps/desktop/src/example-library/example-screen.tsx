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
import { EXAMPLES } from './examples-data'
import { ExampleCard } from './example-card'
import { useExampleRunner } from './use-example-runner'
import type { Example } from './example-types'
import { ExampleScreenHeader } from './example-screen-header'

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
          : 'border-[var(--ag-danger)]/30 bg-[var(--ag-panel)] text-[var(--ag-danger)]',
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
      <ExampleScreenHeader
        filteredCount={filtered.length}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        activeIntent={activeIntent}
        onToggleIntent={(intent) => setActiveIntent(activeIntent === intent ? null : intent)}
        onClearIntent={() => setActiveIntent(null)}
      />

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
