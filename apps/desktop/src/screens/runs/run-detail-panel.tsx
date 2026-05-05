import { formatRunTokens, formatShortDuration, formatUsd } from './run-format'
import { RunStatusPill } from './run-status-pill'
import type { RunQueueItem } from './use-runs'

export function RunDetailPanel({ run }: { readonly run: RunQueueItem | null }) {
  if (run === null) {
    return (
      <aside className="flex min-h-[320px] flex-col justify-center rounded-xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select a run</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Inspect agents, spend, tokens, and trigger context for the selected task.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <div className="border-b border-[var(--ag-line)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--ag-ink)]" title={run.task}>
              {run.task}
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={run.id}>
              {run.id}
            </p>
          </div>
          <RunStatusPill status={run.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <RunMetric label="Duration" value={formatShortDuration(run.durationMs)} />
        <RunMetric label="Cost" value={formatUsd(run.costUsd)} />
        <RunMetric label="Tokens" value={formatRunTokens(run)} />
        <RunMetric label="Trigger" value={run.trigger} />
      </div>

      <div className="p-4">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
          Agents
        </h3>
        <div className="mt-3 flex flex-col gap-2">
          {run.agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-[var(--ag-ink)]">{agent.label}</div>
                <div className="font-mono text-xs text-[var(--ag-ink-subtle)]">{agent.provider}</div>
              </div>
              <RunStatusPill status={agent.status} />
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

function RunMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-[var(--ag-ink)]" title={value}>
        {value}
      </div>
    </div>
  )
}
