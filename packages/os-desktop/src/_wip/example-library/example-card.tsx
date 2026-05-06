/**
 * ExampleCard — per-example card component.
 *
 * Displays:
 *   • Intent badge (top-left)
 *   • Title + description
 *   • Estimated cost pill (when available)
 *   • "Try in OS" button (disabled + "Coming soon" label when templateId is null)
 */

import React from 'react'
import type { Example } from './example-types'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function IntentBadge({ intent }: { intent: string }) {
  return (
    <span
      className="inline-block rounded-full border border-[var(--ag-accent)]/30 bg-[var(--ag-accent)]/10 px-2.5 py-0.5 text-[11px] font-medium text-[var(--ag-accent)]"
      aria-label={`Intent: ${intent}`}
    >
      {intent}
    </span>
  )
}

function CostPill({ estCostUsd }: { estCostUsd: number }) {
  return (
    <span
      className="inline-block rounded border border-[var(--ag-line)] bg-[var(--ag-panel)] px-2 py-0.5 text-[11px] tabular-nums text-[var(--ag-ink-muted)]"
      title="Estimated cost per run"
    >
      ~${estCostUsd.toFixed(3)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ExampleCardProps = {
  readonly example: Example
  /** Called when the user clicks "Try in OS". */
  readonly onTry: (example: Example) => void
  /** Whether the runner is currently in-flight for this card. */
  readonly isRunning?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExampleCard({ example, onTry, isRunning = false }: ExampleCardProps) {
  const isComingSoon = example.templateId === null

  return (
    <article
      data-testid={`example-card-${example.id}`}
      className="flex flex-col gap-3 rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)] p-4 shadow-sm transition-shadow hover:shadow-md"
      aria-label={example.title}
    >
      {/* Intent badge */}
      <IntentBadge intent={example.intent} />

      {/* Title */}
      <h3 className="text-sm font-semibold text-[var(--ag-ink)] leading-snug">
        {example.title}
      </h3>

      {/* Description */}
      <p className="flex-1 text-xs text-[var(--ag-ink-muted)] leading-relaxed">
        {example.description}
      </p>

      {/* Footer: cost pill + CTA */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          {example.estCostUsd !== undefined && (
            <CostPill estCostUsd={example.estCostUsd} />
          )}
        </div>

        {isComingSoon ? (
          <span
            className="rounded-md border border-[var(--ag-line)] px-3 py-1 text-xs text-[var(--ag-ink-subtle)]"
            aria-label="Template coming soon"
          >
            Coming soon
          </span>
        ) : (
          <button
            type="button"
            data-testid={`try-btn-${example.id}`}
            onClick={() => onTry(example)}
            disabled={isRunning}
            aria-busy={isRunning}
            className={[
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              isRunning
                ? 'cursor-not-allowed bg-[var(--ag-accent)]/40 text-[var(--ag-accent)]'
                : 'bg-[var(--ag-accent)] text-white hover:bg-[var(--ag-accent-hover)]',
            ].join(' ')}
          >
            {isRunning ? 'Running…' : 'Try in OS'}
          </button>
        )}
      </div>
    </article>
  )
}
