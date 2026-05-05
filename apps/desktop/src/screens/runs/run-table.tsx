import { formatClockTime, formatShortDuration, formatUsd } from './run-format'
import { RunStatusPill } from './run-status-pill'
import type { RunQueueItem } from './use-runs'

type RunTableProps = {
  readonly runs: readonly RunQueueItem[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
}

const ROW_BASE_CLASS = [
  'cursor-pointer transition focus-visible:outline focus-visible:outline-2',
  'focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
].join(' ')

export function RunTable({ runs, selectedId, onSelect }: RunTableProps) {
  return (
    <div className="min-h-0 overflow-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <table className="w-full min-w-[860px] border-collapse text-sm" aria-label="Run queue">
        <thead>
          <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            <th className="px-4 py-2 font-medium">Task</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Trigger</th>
            <th className="px-3 py-2 font-medium">Agents</th>
            <th className="px-3 py-2 font-medium">Duration</th>
            <th className="px-3 py-2 font-medium">Cost</th>
            <th className="px-4 py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ag-line-soft)]">
          {runs.map((run) => (
            <tr
              key={run.id}
              tabIndex={0}
              aria-selected={selectedId === run.id}
              onClick={() => onSelect(run.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(run.id)
                }
              }}
              className={[
                ROW_BASE_CLASS,
                selectedId === run.id
                  ? 'bg-[color-mix(in_srgb,var(--ag-accent)_10%,transparent)]'
                  : 'hover:bg-[var(--ag-panel-alt)]',
              ].join(' ')}
            >
              <td className="max-w-[320px] px-4 py-3">
                <div className="truncate font-medium text-[var(--ag-ink)]" title={run.task}>
                  {run.task}
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={run.branch}>
                  {run.branch}
                </div>
              </td>
              <td className="px-3 py-3">
                <RunStatusPill status={run.status} />
              </td>
              <td className="px-3 py-3 text-xs text-[var(--ag-ink-muted)]">{run.trigger}</td>
              <td className="px-3 py-3 tabular-nums text-[var(--ag-ink-muted)]">{run.agents.length}</td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink-muted)]">
                {formatShortDuration(run.durationMs)}
              </td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink-muted)]">
                {formatUsd(run.costUsd)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--ag-ink-subtle)]">
                {formatClockTime(run.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
