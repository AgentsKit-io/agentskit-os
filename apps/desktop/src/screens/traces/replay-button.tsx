/**
 * ReplayButton — stub for triggering a trace replay.
 *
 * Emits a `traces.replay` JSON-RPC request to the sidecar.
 * Visually disabled with tooltip "needs sidecar support" until the
 * sidecar implements the `traces.replay` method.
 *
 * On success, returns the new run id via the `onReplay` callback.
 *
 * TODO: enable once sidecar lands traces.replay (#206).
 */

import { useState } from 'react'
import { useReplayTrace } from './use-replay-trace'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReplayButtonProps = {
  readonly traceId: string
  readonly onReplay?: (newRunId: string) => void
  readonly className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ReplayButton = ({
  traceId,
  onReplay,
  className,
}: ReplayButtonProps): React.JSX.Element => {
  const [replaying, setReplaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const replayTrace = useReplayTrace()

  const handleReplay = async (): Promise<void> => {
    setReplaying(true)
    setError(null)
    try {
      const newRunId = await replayTrace(traceId)
      onReplay?.(newRunId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setReplaying(false)
    }
  }

  // Sidecar method not yet available — show disabled stub with tooltip.
  const isStub = true // TODO: set to false once sidecar implements traces.replay (#206)

  return (
    <span className="relative inline-flex group">
      <button
        type="button"
        onClick={isStub ? undefined : () => void handleReplay()}
        disabled={isStub || replaying}
        aria-label={isStub ? 'Replay (needs sidecar support)' : 'Replay trace'}
        className={[
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium',
          'border border-line transition-colors select-none',
          isStub
            ? 'cursor-not-allowed text-ink-subtle bg-panel opacity-50'
            : 'text-ink bg-panel hover:bg-panel-alt cursor-pointer',
          replaying ? 'opacity-70' : '',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Play icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="h-3.5 w-3.5 shrink-0"
          aria-hidden
        >
          <path d="M3 3.732a1.5 1.5 0 0 1 2.305-1.265l6.706 4.269a1.5 1.5 0 0 1 0 2.528l-6.706 4.27A1.5 1.5 0 0 1 3 12.268V3.732Z" />
        </svg>
        {replaying ? 'Replaying…' : 'Replay'}
      </button>

      {/* Tooltip — always shown for stub */}
      {isStub && (
        <span
          role="tooltip"
          className={[
            'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
            'rounded-md border border-line bg-panel px-2.5 py-1.5',
            'text-xs text-ink whitespace-nowrap shadow-lg',
            'opacity-0 group-hover:opacity-100 transition-opacity',
          ].join(' ')}
        >
          needs sidecar support
        </span>
      )}

      {/* Inline error feedback */}
      {error !== null && (
        <span className="ml-2 text-xs text-[var(--ag-danger)]" aria-live="polite">
          {error}
        </span>
      )}
    </span>
  )
}
