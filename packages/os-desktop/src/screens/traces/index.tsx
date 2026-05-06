/**
 * TracesScreen — read-only trace viewer (G-5).
 *
 * Split layout:
 *   Left  — TraceList: table of recent traces (id, flow, mode, started, duration, status)
 *   Right — Selected trace details + SpanTree
 *
 * Replay button is a stub (see replay-button.tsx); full execution is
 * gated on sidecar implementing `traces.replay` (#206).
 *
 * Sidecar `traces.list` / `traces.get` are TODO — mock data is used
 * until the sidecar lands those methods.
 */

import { useEffect, useState } from 'react'
import { TraceList } from './trace-list'
import { SpanTree } from './span-tree'
import { ReplayButton } from './replay-button'
import { useTraceSpans } from './use-traces'
import { useTraceLiveSession } from './use-trace-live'
import { TraceStatusBadge } from './trace-badges'
import { formatCompactNumber, formatShortDuration, formatUsd } from '../../lib/format'
import { useSelection } from '../../lib/selection-store'

const TRACES_HEADER_CLASS = [
  'sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-4',
  'border-b border-[var(--ag-line)] bg-[var(--ag-glass-strong-bg)] px-4 py-3',
  '[backdrop-filter:var(--ag-glass-blur)] sm:px-6',
].join(' ')

const TRACE_CANCEL_RUN_BUTTON_CLASS = [
  'rounded-md border border-[var(--ag-danger)]/40',
  'bg-[color-mix(in_srgb,var(--ag-danger)_10%,transparent)]',
  'px-2 py-0.5 text-[0.68rem] font-medium text-[var(--ag-danger)]',
  'hover:bg-[color-mix(in_srgb,var(--ag-danger)_18%,transparent)]',
].join(' ')

// ---------------------------------------------------------------------------
// Detail panel (right side)
// ---------------------------------------------------------------------------

type TraceDetailProps = {
  readonly traceId: string
}

const TraceDetail = ({ traceId }: TraceDetailProps): React.JSX.Element => {
  const { spans, loading, error } = useTraceSpans(traceId)
  const { totalUsd, inputTokens, outputTokens, runActive, cancelRun } = useTraceLiveSession(traceId)

  const totalDuration = spans.reduce((acc, s) => {
    // Use root span (no parent) duration as total; fallback to max.
    if (s.parentSpanId === undefined) return s.durationMs
    return Math.max(acc, s.durationMs)
  }, 0)

  const spanCount = spans.length
  const rootSpan = spans.find((s) => s.parentSpanId === undefined)
  const status = rootSpan?.status ?? 'ok'

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Detail header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--ag-line)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="shrink-0 text-xs font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            Trace
          </h2>
          <span
            className="truncate font-mono text-xs text-[var(--ag-ink)]"
            title={traceId}
          >
            {traceId}
          </span>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <TraceStatusBadge status={status} />

          {(runActive || totalUsd > 0 || inputTokens > 0 || outputTokens > 0) && (
            <span
              className="font-mono text-[0.68rem] tabular-nums text-[var(--ag-ink-muted)]"
              title="Live cumulative LLM cost and tokens for this trace"
            >
              {formatCompactNumber(inputTokens + outputTokens)} tok · {formatUsd(totalUsd, 4)}
            </span>
          )}

          {runActive && (
            <button
              type="button"
              className={TRACE_CANCEL_RUN_BUTTON_CLASS}
              onClick={() => {
                void cancelRun()
              }}
            >
              Cancel run
            </button>
          )}

          {/* Duration */}
          {totalDuration > 0 && (
            <span className="font-mono text-xs text-[var(--ag-ink-muted)] tabular-nums">
              {formatShortDuration(totalDuration)}
            </span>
          )}

          {/* Span count */}
          <span className="text-xs text-[var(--ag-ink-subtle)]">
            {spanCount} span{spanCount !== 1 ? 's' : ''}
          </span>

          {/* Replay stub */}
          <ReplayButton traceId={traceId} />
        </div>
      </div>

      {/* Span tree body */}
      <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {loading && (
          <p className="p-4 text-sm text-[var(--ag-ink-subtle)]">Loading spans...</p>
        )}
        {error !== null && (
          <p className="p-4 text-sm text-[var(--ag-danger)]">Error: {error}</p>
        )}
        {!loading && error === null && (
          <SpanTree spans={spans} />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state (no trace selected)
// ---------------------------------------------------------------------------

const NoSelection = (): React.JSX.Element => (
  <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
    <p className="text-sm text-[var(--ag-ink-muted)]">Select a trace to inspect its spans.</p>
    <p className="max-w-xs text-xs text-[var(--ag-ink-subtle)]">
      Click any row on the left to open the span tree and view{' '}
      <span className="font-mono">gen_ai.*</span> attributes.
    </p>
  </div>
)

// ---------------------------------------------------------------------------
// TracesScreen
// ---------------------------------------------------------------------------

export const TracesScreen = (): React.JSX.Element => {
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null)
  const { selectedTraceId: globalSelected, setSelectedTraceId: setGlobalSelected } = useSelection()

  useEffect(() => {
    if (selectedTraceId === null && globalSelected) {
      setSelectedTraceId(globalSelected)
    }
  }, [globalSelected, selectedTraceId])

  return (
    <section aria-label="Traces" className="flex min-h-full flex-col bg-[var(--ag-surface)]">
      <div className={TRACES_HEADER_CLASS}>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            Debug mode
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ag-ink)]">Traces</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ag-ink-muted)]">
            Inspect span trees and replay runs.
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 px-4 py-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)] sm:px-6">
        <div role="region" aria-label="Trace list" className="min-w-0">
          <TraceList
            selectedTraceId={selectedTraceId}
            onSelect={(id) => {
              setSelectedTraceId(id)
              setGlobalSelected(id)
            }}
            className="h-full"
          />
        </div>

        <div
          role="region"
          aria-label="Trace detail"
          className="min-h-[420px] min-w-0 overflow-hidden rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]"
        >
          {selectedTraceId !== null ? (
            <TraceDetail traceId={selectedTraceId} />
          ) : (
            <NoSelection />
          )}
        </div>
      </div>
    </section>
  )
}
