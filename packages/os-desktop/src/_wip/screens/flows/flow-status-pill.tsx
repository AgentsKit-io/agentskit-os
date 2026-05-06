import type { FlowStatus } from './use-flows'

const STATUS_LABEL: Record<FlowStatus, string> = {
  active: 'Active',
  draft: 'Draft',
  failing: 'Failing',
  paused: 'Paused',
}

const STATUS_TOKEN: Record<FlowStatus, string> = {
  active: 'border-[color-mix(in_srgb,var(--ag-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-success)_12%,transparent)] text-[var(--ag-success)]',
  draft: 'border-[color-mix(in_srgb,var(--ag-accent)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-accent)_12%,transparent)] text-[var(--ag-accent)]',
  failing: 'border-[color-mix(in_srgb,var(--ag-danger)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-danger)_12%,transparent)] text-[var(--ag-danger)]',
  paused: 'border-[color-mix(in_srgb,var(--ag-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_12%,transparent)] text-[var(--ag-warning)]',
}

export function flowStatusLabel(status: FlowStatus): string {
  return STATUS_LABEL[status]
}

export function FlowStatusPill({ status }: { readonly status: FlowStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${STATUS_TOKEN[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

