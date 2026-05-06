import { HITL_RISK_LABEL, HITL_STATUS_LABEL } from './hitl-labels'
import type { HitlRisk, HitlStatus } from './use-hitl'

const STATUS_TOKEN: Record<HitlStatus, string> = {
  pending: 'border-[color-mix(in_srgb,var(--ag-accent)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-accent)_12%,transparent)] text-[var(--ag-accent)]',
  approved: 'border-[color-mix(in_srgb,var(--ag-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-success)_12%,transparent)] text-[var(--ag-success)]',
  denied: 'border-[color-mix(in_srgb,var(--ag-danger)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-danger)_12%,transparent)] text-[var(--ag-danger)]',
  expired: 'border-[color-mix(in_srgb,var(--ag-ink-subtle)_30%,transparent)] bg-[color-mix(in_srgb,var(--ag-ink-subtle)_10%,transparent)] text-[var(--ag-ink-muted)]',
}

const RISK_TOKEN: Record<HitlRisk, string> = {
  low: 'border-[color-mix(in_srgb,var(--ag-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-success)_12%,transparent)] text-[var(--ag-success)]',
  medium: 'border-[color-mix(in_srgb,var(--ag-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_12%,transparent)] text-[var(--ag-warning)]',
  high: 'border-[color-mix(in_srgb,var(--ag-danger)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-danger)_12%,transparent)] text-[var(--ag-danger)]',
}

export function HitlStatusPill({ status }: { readonly status: HitlStatus }) {
  return <HitlPill label={HITL_STATUS_LABEL[status]} className={STATUS_TOKEN[status]} />
}

export function HitlRiskPill({ risk }: { readonly risk: HitlRisk }) {
  return <HitlPill label={HITL_RISK_LABEL[risk]} className={RISK_TOKEN[risk]} />
}

function HitlPill({
  label,
  className,
}: {
  readonly label: string
  readonly className: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${className}`}
    >
      {label}
    </span>
  )
}
