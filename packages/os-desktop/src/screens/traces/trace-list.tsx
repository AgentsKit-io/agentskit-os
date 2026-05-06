/**
 * TraceList - table of recent traces.
 *
 * Displays trace id, flow, mode, started, duration, and status.
 * Highlights the selected row. Calls `onSelect` on row click.
 *
 * Data comes from `useTraces` which falls back to mock data while
 * the sidecar `traces.list` method is not implemented.
 */

import type { TraceRow } from './use-traces'
import { useTraces } from './use-traces'
import { TraceModeBadge, TraceStatusBadge } from './trace-badges'
import { formatDateTime, formatShortDuration } from '../../lib/format'

export type TraceListProps = {
  readonly selectedTraceId: string | null
  readonly onSelect: (traceId: string) => void
  readonly className?: string
}

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
        'cursor-pointer transition focus-visible:outline focus-visible:outline-2',
        'focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
        selected
          ? 'bg-[color-mix(in_srgb,var(--ag-accent)_10%,transparent)]'
          : 'hover:bg-[var(--ag-panel-alt)]',
      ].join(' ')}
    >
      {/* Trace ID */}
      <td className="max-w-[120px] truncate py-2 pl-4 pr-3 font-mono text-xs text-[var(--ag-ink-muted)]">
        <span title={row.traceId}>{row.traceId.slice(0, 12)}...</span>
      </td>

      {/* Flow */}
      <td className="max-w-[160px] truncate px-3 py-2 text-xs text-[var(--ag-ink)]">
        <span title={row.flowId}>{row.flowId}</span>
      </td>

      {/* Mode */}
      <td className="py-2 px-3">
        <TraceModeBadge mode={row.runMode} />
      </td>

      {/* Started */}
      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-[var(--ag-ink-subtle)]">
        {formatDateTime(row.startedAt)}
      </td>

      {/* Duration */}
      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-[var(--ag-ink-muted)] tabular-nums">
        {formatShortDuration(row.durationMs)}
      </td>

      {/* Status */}
      <td className="py-2 pl-3 pr-4">
        <TraceStatusBadge status={row.status} />
      </td>
    </tr>
  )
}

export const TraceList = ({
  selectedTraceId,
  onSelect,
  className,
}: TraceListProps): React.JSX.Element => {
  const { traces, loading, error } = useTraces()

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-6 text-sm text-ink-subtle ${className ?? ''}`}>
        Loading traces...
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
    <div className={`overflow-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)] ${className ?? ''}`}>
      <table
        data-testid="trace-list-table"
        aria-label="Trace list"
        className="w-full min-w-[760px] border-collapse"
      >
        <thead>
          <tr className="border-b border-[var(--ag-line)]">
            <th className="py-2 pl-4 pr-3 text-left text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
              Trace ID
            </th>
            <th className="px-3 py-2 text-left text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
              Flow
            </th>
            <th className="px-3 py-2 text-left text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
              Mode
            </th>
            <th className="px-3 py-2 text-left text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
              Started
            </th>
            <th className="px-3 py-2 text-left text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
              Duration
            </th>
            <th className="py-2 pl-3 pr-4 text-left text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ag-line-soft)]">
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
