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

import { useState } from 'react'
import { TraceList } from './trace-list'
import { SpanTree } from './span-tree'
import { ReplayButton } from './replay-button'
import { useTraceSpans } from './use-traces'
import { ForkButton } from '../../fork/fork-button'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

// ---------------------------------------------------------------------------
// Detail panel (right side)
// ---------------------------------------------------------------------------

type TraceDetailProps = {
  readonly traceId: string
}

const TraceDetail = ({ traceId }: TraceDetailProps): React.JSX.Element => {
  const { spans, loading, error } = useTraceSpans(traceId)

  const totalDuration = spans.reduce((acc, s) => {
    // Use root span (no parent) duration as total; fallback to max.
    if (s.parentSpanId === undefined) return s.durationMs
    return Math.max(acc, s.durationMs)
  }, 0)

  const spanCount = spans.length
  const rootSpan = spans.find((s) => s.parentSpanId === undefined)
  const status = rootSpan?.status ?? 'ok'

  const STATUS_COLORS: Record<string, string> = {
    ok: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    error: 'bg-red-500/15 text-red-400 border-red-500/25',
    skipped: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
    paused: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  }
  const statusClass = STATUS_COLORS[status] ?? STATUS_COLORS['ok']

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Detail header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-xs font-medium text-ink-subtle uppercase tracking-widest shrink-0">
            Trace
          </h2>
          <span
            className="text-xs font-mono text-ink truncate"
            title={traceId}
          >
            {traceId}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status badge */}
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[0.6rem] font-medium border ${statusClass}`}
          >
            {status}
          </span>

          {/* Duration */}
          {totalDuration > 0 && (
            <span className="text-xs font-mono text-ink-muted tabular-nums">
              {formatDuration(totalDuration)}
            </span>
          )}

          {/* Span count */}
          <span className="text-xs text-ink-subtle">
            {spanCount} span{spanCount !== 1 ? 's' : ''}
          </span>

          {/* Replay stub */}
          <ReplayButton traceId={traceId} />

          {/* Fork as flow */}
          <ForkButton traceId={traceId} />
        </div>
      </div>

      {/* Span tree body */}
      <div className="flex-1 min-h-0 overflow-auto px-2 py-2">
        {loading && (
          <p className="text-sm text-ink-subtle p-4">Loading spans…</p>
        )}
        {error !== null && (
          <p className="text-sm text-red-400 p-4">Error: {error}</p>
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
  <div className="flex flex-col items-center justify-center h-full gap-2 p-8 text-center">
    <p className="text-sm text-ink-muted">Select a trace to inspect its spans.</p>
    <p className="text-xs text-ink-subtle max-w-xs">
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

  return (
    <section aria-label="Traces" className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
        <h1 className="text-lg font-semibold text-ink tracking-tight">Traces</h1>
        <p className="text-xs text-ink-subtle">
          Read-only viewer — select a trace to inspect its span tree.
        </p>
      </div>

      {/* Split body */}
      <div className="flex flex-1 min-h-0 divide-x divide-line">
        {/* Left: trace list */}
        <div role="region" aria-label="Trace list" className="w-[55%] min-w-0 flex flex-col">
          <TraceList
            selectedTraceId={selectedTraceId}
            onSelect={setSelectedTraceId}
            className="flex-1"
          />
        </div>

        {/* Right: span tree / detail */}
        <div role="region" aria-label="Trace detail" className="flex-1 min-w-0 bg-surface/50">
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
