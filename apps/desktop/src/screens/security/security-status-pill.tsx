import { SECURITY_STATUS_LABEL } from './security-labels'
import type { SecurityStatus } from './use-security'

const STATUS_TOKEN: Record<SecurityStatus, string> = {
  healthy: 'border-[color-mix(in_srgb,var(--ag-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-success)_12%,transparent)] text-[var(--ag-success)]',
  watch: 'border-[color-mix(in_srgb,var(--ag-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_12%,transparent)] text-[var(--ag-warning)]',
  blocked: 'border-[color-mix(in_srgb,var(--ag-danger)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-danger)_12%,transparent)] text-[var(--ag-danger)]',
}

export function SecurityStatusPill({ status }: { readonly status: SecurityStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${STATUS_TOKEN[status]}`}
    >
      {SECURITY_STATUS_LABEL[status]}
    </span>
  )
}
