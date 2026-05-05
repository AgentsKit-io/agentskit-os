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
import { formatMdHms } from '../../lib/time'
import { formatShortDuration } from '../../lib/format'

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

const statusClassByStatus: Record<string, string> = {
  ok: 'bg-[var(--ag-success)]/15 text-[var(--ag-success)] border-[var(--ag-success)]/25',
  error: 'bg-[var(--ag-danger)]/15 text-[var(--ag-danger)] border-[var(--ag-danger)]/25',
  skipped: 'bg-[var(--ag-ink-muted)]/15 text-[var(--ag-ink-muted)] border-[var(--ag-ink-muted)]/25',
  paused: 'bg-[var(--ag-warn)]/15 text-[var(--ag-warn)] border-[var(--ag-warn)]/25',
}

const modeClassByMode: Record<string, string> = {
  real: 'bg-[var(--ag-accent)]/10 text-[var(--ag-accent)] border-[var(--ag-accent)]/20',
  preview: 'bg-[var(--ag-accent)]/10 text-[var(--ag-accent)] border-[var(--ag-accent)]/20',
  dry_run: 'bg-[var(--ag-ink-muted)]/10 text-[var(--ag-ink-muted)] border-[var(--ag-ink-muted)]/20',
  replay: 'bg-[var(--ag-accent)]/10 text-[var(--ag-accent)] border-[var(--ag-accent)]/20',
  simulate: 'bg-[var(--ag-warn)]/10 text-[var(--ag-warn)] border-[var(--ag-warn)]/20',
  deterministic: 'bg-[var(--ag-accent)]/10 text-[var(--ag-accent)] border-[var(--ag-accent)]/20',
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
  const statusClass = statusClassByStatus[row.status] ?? statusClassByStatus['ok']
  const modeClass = modeClassByMode[row.runMode] ?? modeClassByMode['real']

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
        {formatMdHms(row.startedAt)}
      </td>

      {/* Duration */}
      <td className="py-2 px-3 text-xs font-mono text-ink-muted tabular-nums whitespace-nowrap">
        {formatShortDuration(row.durationMs)}
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
      <div className={`flex items-center justify-center p-6 text-sm text-[var(--ag-danger)] ${className ?? ''}`}>
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
