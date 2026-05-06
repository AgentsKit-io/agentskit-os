import { formatDateTime } from '../../lib/format'
import { TRIGGER_PROVIDER_LABEL } from './trigger-labels'
import { TriggerStatusPill } from './trigger-status-pill'
import type { TriggerRule } from './use-triggers'

type TriggerTableProps = {
  readonly triggers: readonly TriggerRule[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
}

const ROW_BASE_CLASS = [
  'cursor-pointer transition focus-visible:outline focus-visible:outline-2',
  'focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
].join(' ')

export function TriggerTable({ triggers, selectedId, onSelect }: TriggerTableProps) {
  return (
    <div className="min-h-0 overflow-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <table className="w-full min-w-[780px] border-collapse text-sm" aria-label="Trigger rules">
        <thead>
          <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            <th className="px-4 py-2 font-medium">Trigger</th>
            <th className="px-3 py-2 font-medium">Provider</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Runs 24h</th>
            <th className="px-3 py-2 font-medium">Success</th>
            <th className="px-4 py-2 font-medium">Last fired</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ag-line-soft)]">
          {triggers.map((trigger) => (
            <tr
              key={trigger.id}
              tabIndex={0}
              aria-selected={selectedId === trigger.id}
              onClick={() => onSelect(trigger.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(trigger.id)
                }
              }}
              className={[
                ROW_BASE_CLASS,
                selectedId === trigger.id
                  ? 'bg-[color-mix(in_srgb,var(--ag-accent)_10%,transparent)]'
                  : 'hover:bg-[var(--ag-panel-alt)]',
              ].join(' ')}
            >
              <td className="max-w-[320px] px-4 py-3">
                <div className="truncate font-medium text-[var(--ag-ink)]" title={trigger.name}>
                  {trigger.name}
                </div>
                <div
                  className="mt-0.5 truncate font-mono text-xs text-[var(--ag-ink-subtle)]"
                  title={trigger.targetFlow}
                >
                  {trigger.targetFlow}
                </div>
              </td>
              <td className="px-3 py-3 text-xs text-[var(--ag-ink-muted)]">
                {TRIGGER_PROVIDER_LABEL[trigger.provider]}
              </td>
              <td className="px-3 py-3">
                <TriggerStatusPill status={trigger.status} />
              </td>
              <td className="px-3 py-3 tabular-nums text-[var(--ag-ink-muted)]">
                {trigger.runs24h}
              </td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink-muted)]">
                {trigger.successRatePct}%
              </td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--ag-ink-subtle)]">
                {formatDateTime(trigger.lastFiredAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
