/**
 * ForkButton — places a "Fork" button on the trace detail view.
 *
 * Calls the `forkFromTrace` callback from the nearest ForkProvider context
 * (or an explicit prop) to open the fork panel for the given traceId.
 */

import { useContext } from 'react'
import { ForkContext } from './fork-provider'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ForkButtonProps = {
  readonly traceId: string
  readonly className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ForkButton({ traceId, className }: ForkButtonProps): React.JSX.Element {
  const ctx = useContext(ForkContext)

  const handleFork = () => {
    ctx?.forkFromTrace(traceId)
  }

  return (
    <button
      type="button"
      data-testid="fork-button"
      aria-label={`Fork trace ${traceId} as flow`}
      onClick={handleFork}
      disabled={ctx === undefined}
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium',
        'border border-[var(--ag-line)] transition-colors select-none',
        ctx !== undefined
          ? 'text-[var(--ag-ink)] bg-[var(--ag-panel)] hover:bg-[var(--ag-panel-alt)] cursor-pointer'
          : 'cursor-not-allowed text-[var(--ag-ink-subtle)] bg-[var(--ag-panel)] opacity-50',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Fork icon — two branches diverging */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-3.5 w-3.5 shrink-0"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm0 2.122a2.25 2.25 0 1 0-1.5 0v.878A2.25 2.25 0 0 0 5.75 8.5h1.5v2.128a2.251 2.251 0 1 0 1.5 0V8.5h1.5a2.25 2.25 0 0 0 2.25-2.25v-.878a2.25 2.25 0 1 0-1.5 0v.878a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 5 6.25v-.878Zm3.75 7.378a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm3-8.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
          clipRule="evenodd"
        />
      </svg>
      Fork
    </button>
  )
}
