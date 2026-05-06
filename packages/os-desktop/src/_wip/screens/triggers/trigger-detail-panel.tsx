import { formatUsd } from '../../lib/format'
import { TRIGGER_PROVIDER_LABEL } from './trigger-labels'
import { TriggerStatusPill } from './trigger-status-pill'
import type { TriggerRule } from './use-triggers'

export function TriggerDetailPanel({ trigger }: { readonly trigger: TriggerRule | null }) {
  if (trigger === null) {
    return (
      <aside className="flex min-h-[320px] flex-col justify-center rounded-xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select a trigger</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Inspect routing, provider state, agent policy, and recent run health.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <div className="border-b border-[var(--ag-line)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--ag-ink)]" title={trigger.name}>
              {trigger.name}
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={trigger.id}>
              {trigger.id}
            </p>
          </div>
          <TriggerStatusPill status={trigger.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <TriggerMetric label="Provider" value={TRIGGER_PROVIDER_LABEL[trigger.provider]} />
        <TriggerMetric label="Runs 24h" value={trigger.runs24h.toString()} />
        <TriggerMetric label="Success" value={`${trigger.successRatePct}%`} />
        <TriggerMetric label="Spend 24h" value={formatUsd(trigger.cost24hUsd)} />
      </div>

      <TriggerBlock label="Target Flow" value={trigger.targetFlow} mono />
      <TriggerBlock label="Agent Policy" value={trigger.agentPolicy} />
      <TriggerBlock label="Configuration" value={trigger.configSummary} />
    </aside>
  )
}

function TriggerMetric({ label, value }: { readonly label: string; readonly value: string }) {
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

function TriggerBlock({
  label,
  value,
  mono = false,
}: {
  readonly label: string
  readonly value: string
  readonly mono?: boolean
}) {
  return (
    <div className="border-b border-[var(--ag-line)] p-4 last:border-b-0">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
        {label}
      </h3>
      <div
        className={[
          'mt-2 rounded-lg border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]',
          mono ? 'font-mono text-xs' : '',
        ].join(' ')}
      >
        {value}
      </div>
    </div>
  )
}
