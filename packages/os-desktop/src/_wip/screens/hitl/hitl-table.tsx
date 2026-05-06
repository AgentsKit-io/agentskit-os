import { formatDateTime } from '../../lib/format'
import { HITL_KIND_LABEL } from './hitl-labels'
import { HitlRiskPill, HitlStatusPill } from './hitl-pills'
import type { HitlRequest, HitlStatus } from './use-hitl'

type HitlTableProps = {
  readonly requests: readonly HitlRequest[]
  readonly selectedId: string | null
  readonly statusOf: (request: HitlRequest) => HitlStatus
  readonly onSelect: (id: string) => void
}

const ROW_BASE_CLASS = [
  'cursor-pointer transition focus-visible:outline focus-visible:outline-2',
  'focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
].join(' ')

export function HitlTable({ requests, selectedId, statusOf, onSelect }: HitlTableProps) {
  return (
    <div className="min-h-0 overflow-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <table className="w-full min-w-[980px] border-collapse text-sm" aria-label="Human task inbox">
        <thead>
          <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            <th className="px-4 py-2 font-medium">Request</th>
            <th className="px-3 py-2 font-medium">Kind</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Risk</th>
            <th className="px-3 py-2 font-medium">Policy</th>
            <th className="px-3 py-2 font-medium">Agent</th>
            <th className="px-3 py-2 font-medium">Trace</th>
            <th className="px-4 py-2 font-medium">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ag-line-soft)]">
          {requests.map((request) => (
            <tr
              key={request.id}
              tabIndex={0}
              aria-selected={selectedId === request.id}
              onClick={() => onSelect(request.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(request.id)
                }
              }}
              className={[
                ROW_BASE_CLASS,
                selectedId === request.id
                  ? 'bg-[color-mix(in_srgb,var(--ag-accent)_10%,transparent)]'
                  : 'hover:bg-[var(--ag-panel-alt)]',
              ].join(' ')}
            >
              <td className="max-w-[320px] px-4 py-3">
                <div className="truncate font-medium text-[var(--ag-ink)]" title={request.title}>
                  {request.title}
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={request.runId}>
                  {request.runId}
                </div>
              </td>
              <td className="px-3 py-3 text-xs text-[var(--ag-ink-muted)]">
                {HITL_KIND_LABEL[request.kind]}
              </td>
              <td className="px-3 py-3">
                <HitlStatusPill status={statusOf(request)} />
              </td>
              <td className="px-3 py-3">
                <HitlRiskPill risk={request.risk} />
              </td>
              <td className="max-w-[140px] px-3 py-3 font-mono text-[10px] text-[var(--ag-ink-muted)]">
                <span className="line-clamp-2" title={(request.policyRuleIds ?? []).join(', ')}>
                  {policyRuleCountLabel(request)}
                </span>
              </td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink-muted)]">{request.agent}</td>
              <td className="px-3 py-3">
                <a
                  className="text-xs font-medium text-[var(--ag-accent)] hover:underline"
                  href={request.traceUrl ?? `#/traces/${encodeURIComponent(request.runId)}`}
                >
                  Open
                </a>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--ag-ink-subtle)]">
                {formatDateTime(request.expiresAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function policyRuleCountLabel(request: HitlRequest): string {
  const count = request.policyRuleIds?.length ?? 0
  return count > 0 ? `${count} rules` : '-'
}
