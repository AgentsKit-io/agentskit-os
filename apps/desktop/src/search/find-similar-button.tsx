/**
 * FindSimilarButton — stub UI for the AI "find similar" feature.
 *
 * Calls `sidecarRequest('search.findSimilar', { entityId })` when clicked.
 * The sidecar method is not yet implemented.
 *
 * TODO(#91): implement sidecar `search.findSimilar` with embedding-based
 * similarity search. This stub wires the UI surface so the frontend is ready
 * once the backend lands.
 */

import { useState } from 'react'
import { sidecarRequest } from '../lib/sidecar'

export type FindSimilarButtonProps = {
  /** The entity id to find similar results for. */
  readonly entityId: string
  /** Optional CSS class name. */
  readonly className?: string
}

export function FindSimilarButton({
  entityId,
  className,
}: FindSimilarButtonProps): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      await sidecarRequest('search.findSimilar', { entityId })
    } catch (err) {
      // Sidecar method not implemented yet — surface a friendly hint.
      setError(err instanceof Error ? err.message : 'Sidecar unavailable')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleClick()}
        aria-label={`Find similar to ${entityId}`}
        title="AI find similar — needs sidecar (TODO #91)"
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[var(--ag-ink-muted)] border border-[var(--ag-line)] hover:border-[var(--ag-accent)] hover:text-[var(--ag-accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span aria-hidden>✦</span>
        {loading ? 'Searching…' : 'AI find similar'}
      </button>
      {error !== null && (
        <p
          role="alert"
          className="mt-1 text-[10px] text-[var(--ag-ink-muted)]"
          title={error}
        >
          Stub — sidecar not yet available (TODO #91)
        </p>
      )}
    </div>
  )
}
