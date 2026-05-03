/**
 * TraceList — table of recent traces.
 *
 * Displays trace id, flow, mode, started, duration, and status.
 * Highlights the selected row. Calls `onSelect` on row click.
 *
 * Data comes from `useTraces` which falls back to mock data while
 * the sidecar `traces.list` method is not implemented.
 */

import type { TraceRow } from './use-traces'
import { useTraces } from './use-traces'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TraceListProps = {
  readonly selectedTraceId: string | null
  readonly onSelect: (traceId: string) => void
  readonly className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

const formatStarted = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

const STATUS_CLASSES: Record<string, string> = {
  ok: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  error: 'bg-red-500/15 text-red-400 border-red-500/25',
  skipped: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
  paused: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
}

const MODE_CLASSES: Record<string, string> = {
  real: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  preview: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  dry_run: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  replay: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  simulate: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  deterministic: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
}

// ---------------------------------------------------------------------------
// TraceRow component
// ---------------------------------------------------------------------------

type TraceRowItemProps = {
  readonly row: TraceRow
  readonly selected: boolean
  readonly onSelect: (traceId: string) => void
}

const TraceRowItem = ({
  row,
  selected,
  onSelect,
}: TraceRowItemProps): React.JSX.Element => {
  const statusClass = STATUS_CLASSES[row.status] ?? STATUS_CLASSES['ok']
  const modeClass = MODE_CLASSES[row.runMode] ?? MODE_CLASSES['real']

  return (
    <tr
      data-testid="trace-row"
      data-trace-id={row.traceId}
      data-selected={selected ? 'true' : 'false'}
      role="row"
      aria-selected={selected}
      tabIndex={0}
      onClick={() => onSelect(row.traceId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(row.traceId)
        }
      }}
      className={[
        'cursor-pointer transition-colors',
        selected
          ? 'bg-accent/10 hover:bg-accent/15'
          : 'hover:bg-panel-alt',
      ].join(' ')}
    >
      {/* Trace ID */}
      <td className="py-2 pl-4 pr-3 text-xs font-mono text-ink-muted truncate max-w-[120px]">
        <span title={row.traceId}>{row.traceId.slice(0, 12)}…</span>
      </td>

      {/* Flow */}
      <td className="py-2 px-3 text-xs text-ink truncate max-w-[160px]">
        <span title={row.flowId}>{row.flowId}</span>
      </td>

      {/* Mode */}
      <td className="py-2 px-3">
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[0.6rem] font-medium border ${modeClass}`}
        >
          {row.runMode}
        </span>
      </td>

      {/* Started */}
      <td className="py-2 px-3 text-xs font-mono text-ink-subtle whitespace-nowrap">
        {formatStarted(row.startedAt)}
      </td>

      {/* Duration */}
      <td className="py-2 px-3 text-xs font-mono text-ink-muted tabular-nums whitespace-nowrap">
        {formatDuration(row.durationMs)}
      </td>

      {/* Status */}
      <td className="py-2 pl-3 pr-4">
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[0.6rem] font-medium border ${statusClass}`}
        >
          {row.status}
        </span>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// TraceList
// ---------------------------------------------------------------------------

export const TraceList = ({
  selectedTraceId,
  onSelect,
  className,
}: TraceListProps): React.JSX.Element => {
  const { traces, loading, error } = useTraces()

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-6 text-sm text-ink-subtle ${className ?? ''}`}>
        Loading traces…
      </div>
    )
  }

  if (error !== null) {
    return (
      <div className={`flex items-center justify-center p-6 text-sm text-red-400 ${className ?? ''}`}>
        Error: {error}
      </div>
    )
  }

  if (traces.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 p-8 text-center ${className ?? ''}`}>
        <p className="text-sm text-ink-muted">No traces yet.</p>
        <p className="text-xs text-ink-subtle max-w-xs">
          Run a flow to generate trace data. The sidecar will stream spans in real time.
        </p>
      </div>
    )
  }

  return (
    <div className={`overflow-auto ${className ?? ''}`}>
      <table
        data-testid="trace-list-table"
        aria-label="Trace list"
        className="w-full border-collapse"
      >
        <thead>
          <tr className="border-b border-line">
            <th className="py-2 pl-4 pr-3 text-left text-[0.65rem] font-medium text-ink-subtle uppercase tracking-widest">
              Trace ID
            </th>
            <th className="py-2 px-3 text-left text-[0.65rem] font-medium text-ink-subtle uppercase tracking-widest">
              Flow
            </th>
            <th className="py-2 px-3 text-left text-[0.65rem] font-medium text-ink-subtle uppercase tracking-widest">
              Mode
            </th>
            <th className="py-2 px-3 text-left text-[0.65rem] font-medium text-ink-subtle uppercase tracking-widest">
              Started
            </th>
            <th className="py-2 px-3 text-left text-[0.65rem] font-medium text-ink-subtle uppercase tracking-widest">
              Duration
            </th>
            <th className="py-2 pl-3 pr-4 text-left text-[0.65rem] font-medium text-ink-subtle uppercase tracking-widest">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/50">
          {traces.map((row) => (
            <TraceRowItem
              key={row.traceId}
              row={row}
              selected={row.traceId === selectedTraceId}
              onSelect={onSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
