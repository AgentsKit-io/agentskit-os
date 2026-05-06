import { TRIGGER_STATUS_LABEL } from './trigger-labels'
import type { TriggerStatus } from './use-triggers'

const STATUS_TOKEN: Record<TriggerStatus, string> = {
  active: 'border-[color-mix(in_srgb,var(--ag-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-success)_12%,transparent)] text-[var(--ag-success)]',
  paused: 'border-[color-mix(in_srgb,var(--ag-ink-subtle)_30%,transparent)] bg-[color-mix(in_srgb,var(--ag-ink-subtle)_10%,transparent)] text-[var(--ag-ink-muted)]',
  failing: 'border-[color-mix(in_srgb,var(--ag-danger)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-danger)_12%,transparent)] text-[var(--ag-danger)]',
  needs_auth: 'border-[color-mix(in_srgb,var(--ag-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_12%,transparent)] text-[var(--ag-warning)]',
}

export function TriggerStatusPill({ status }: { readonly status: TriggerStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${STATUS_TOKEN[status]}`}
    >
      {TRIGGER_STATUS_LABEL[status]}
    </span>
  )
}
