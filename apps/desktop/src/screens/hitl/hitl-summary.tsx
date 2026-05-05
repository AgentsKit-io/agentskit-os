import { isDueWithin24h } from './use-hitl-inbox'
import type { HitlRequest, HitlStatus } from './use-hitl'

export function HitlSummary({
  requests,
  statusOf,
}: {
  readonly requests: readonly HitlRequest[]
  readonly statusOf: (request: HitlRequest) => HitlStatus
}) {
  const pending = requests.filter((request) => statusOf(request) === 'pending').length
  const highRisk = requests.filter((request) => request.risk === 'high').length
  const approved = requests.filter((request) => statusOf(request) === 'approved').length
  const denied = requests.filter((request) => statusOf(request) === 'denied').length
  const dueSoon = requests.filter(
    (request) => statusOf(request) === 'pending' && isDueWithin24h(request.expiresAt),
  ).length

  const items = [
    { label: 'Pending', value: pending.toString() },
    { label: 'Due < 24h', value: dueSoon.toString() },
    { label: 'High risk', value: highRisk.toString() },
    { label: 'Approved', value: approved.toString() },
    { label: 'Denied', value: denied.toString() },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[var(--ag-line)] bg-[var(--ag-glass-bg)] px-4 py-3 shadow-sm [backdrop-filter:var(--ag-glass-blur)]"
        >
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            {item.label}
          </div>
          <div className="mt-1 text-xl font-semibold text-[var(--ag-ink)] tabular-nums">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}
