import type { RunStatus } from './use-runs'

const STATUS_LABEL: Record<RunStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  blocked: 'Blocked',
  succeeded: 'Succeeded',
  failed: 'Failed',
}

const STATUS_TOKEN: Record<RunStatus, string> = {
  queued: 'border-[color-mix(in_srgb,var(--ag-ink-subtle)_30%,transparent)] bg-[color-mix(in_srgb,var(--ag-ink-subtle)_10%,transparent)] text-[var(--ag-ink-muted)]',
  running: 'border-[color-mix(in_srgb,var(--ag-accent)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-accent)_12%,transparent)] text-[var(--ag-accent)]',
  blocked: 'border-[color-mix(in_srgb,var(--ag-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_12%,transparent)] text-[var(--ag-warning)]',
  succeeded: 'border-[color-mix(in_srgb,var(--ag-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-success)_12%,transparent)] text-[var(--ag-success)]',
  failed: 'border-[color-mix(in_srgb,var(--ag-danger)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-danger)_12%,transparent)] text-[var(--ag-danger)]',
}

export function runStatusLabel(status: RunStatus): string {
  return STATUS_LABEL[status]
}

export function RunStatusPill({ status }: { readonly status: RunStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${STATUS_TOKEN[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
