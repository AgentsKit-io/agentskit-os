import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import {
  MOCK_HITL_REQUESTS,
  type HitlKind,
  type HitlRequest,
  type HitlRisk,
  type HitlStatus,
  useHitlRequests,
} from './use-hitl'

const KIND_LABEL: Record<HitlKind, string> = {
  code_change: 'Code change',
  cost_exception: 'Cost exception',
  deploy_gate: 'Deploy gate',
  data_access: 'Data access',
}

const STATUS_LABEL: Record<HitlStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  denied: 'Denied',
  expired: 'Expired',
}

const RISK_LABEL: Record<HitlRisk, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const STATUS_CLASSES: Record<HitlStatus, string> = {
  pending: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
  approved: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  denied: 'border-red-500/25 bg-red-500/10 text-red-300',
  expired: 'border-zinc-500/25 bg-zinc-500/10 text-zinc-300',
}

const RISK_CLASSES: Record<HitlRisk, string> = {
  low: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  high: 'border-red-500/25 bg-red-500/10 text-red-300',
}

const FILTERS: Array<HitlStatus | 'all'> = ['all', 'pending', 'approved', 'denied', 'expired']

function Pill({
  label,
  className,
}: {
  readonly label: string
  readonly className: string
}) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[0.65rem] font-medium border ${className}`}>
      {label}
    </span>
  )
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function HitlSummary({ requests }: { readonly requests: readonly HitlRequest[] }) {
  const pending = requests.filter((request) => request.status === 'pending').length
  const highRisk = requests.filter((request) => request.risk === 'high').length
  const approved = requests.filter((request) => request.status === 'approved').length
  const denied = requests.filter((request) => request.status === 'denied').length

  const items = [
    { label: 'Pending', value: pending.toString() },
    { label: 'High risk', value: highRisk.toString() },
    { label: 'Approved', value: approved.toString() },
    { label: 'Denied', value: denied.toString() },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)] px-4 py-3">
          <div className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
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

function RequestTable({
  requests,
  selectedId,
  onSelect,
}: {
  readonly requests: readonly HitlRequest[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
}) {
  return (
    <div className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <table className="w-full border-collapse text-sm" aria-label="Human approval inbox">
        <thead>
          <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
            <th className="px-4 py-2 font-medium">Request</th>
            <th className="px-3 py-2 font-medium">Kind</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Risk</th>
            <th className="px-3 py-2 font-medium">Agent</th>
            <th className="px-4 py-2 font-medium">Expires</th>
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
                'cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
                selectedId === request.id
                  ? 'bg-[var(--ag-accent)]/10'
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
                {KIND_LABEL[request.kind]}
              </td>
              <td className="px-3 py-3">
                <Pill label={STATUS_LABEL[request.status]} className={STATUS_CLASSES[request.status]} />
              </td>
              <td className="px-3 py-3">
                <Pill label={RISK_LABEL[request.risk]} className={RISK_CLASSES[request.risk]} />
              </td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink-muted)]">{request.agent}</td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--ag-ink-subtle)]">
                {formatTime(request.expiresAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RequestDetail({ request }: { readonly request: HitlRequest | null }) {
  if (request === null) {
    return (
      <aside className="flex min-h-0 flex-col justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select an approval</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Inspect why the agent paused, what evidence it produced, and which run it belongs to.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <div className="border-b border-[var(--ag-line)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--ag-ink)]" title={request.title}>
              {request.title}
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={request.id}>
              {request.id}
            </p>
          </div>
          <Pill label={STATUS_LABEL[request.status]} className={STATUS_CLASSES[request.status]} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <DetailMetric label="Kind" value={KIND_LABEL[request.kind]} />
        <DetailMetric label="Risk" value={RISK_LABEL[request.risk]} />
        <DetailMetric label="Agent" value={request.agent} />
        <DetailMetric label="Created" value={formatTime(request.createdAt)} />
      </div>

      <DetailBlock label="Summary" value={request.summary} />
      <DetailBlock label="Requester" value={request.requester} />
      <DetailBlock label="Run" value={request.runId} mono />

      <div className="p-4">
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
          Evidence
        </h3>
        <ul className="mt-3 flex flex-col gap-2">
          {request.evidence.map((item) => (
            <li
              key={item}
              className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

function DetailMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-[var(--ag-ink)]" title={value}>
        {value}
      </div>
    </div>
  )
}

function DetailBlock({
  label,
  value,
  mono = false,
}: {
  readonly label: string
  readonly value: string
  readonly mono?: boolean
}) {
  return (
    <div className="border-b border-[var(--ag-line)] p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
        {label}
      </h3>
      <div
        className={[
          'mt-2 rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]',
          mono ? 'font-mono text-xs' : '',
        ].join(' ')}
      >
        {value}
      </div>
    </div>
  )
}

export function HitlScreen() {
  const { requests, loading, error } = useHitlRequests()
  const [filter, setFilter] = useState<HitlStatus | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_HITL_REQUESTS[1]?.id ?? null)

  const filteredRequests = useMemo(() => {
    return filter === 'all' ? requests : requests.filter((request) => request.status === filter)
  }, [filter, requests])

  const selectedRequest = useMemo(() => {
    return requests.find((request) => request.id === selectedId) ?? filteredRequests[0] ?? null
  }, [filteredRequests, requests, selectedId])

  if (loading) {
    return (
      <section aria-label="HITL Inbox" className="flex h-full items-center justify-center text-sm text-[var(--ag-ink-muted)]">
        Loading approvals...
      </section>
    )
  }

  return (
    <section aria-label="HITL Inbox" className="flex h-full min-h-0 flex-col bg-[var(--ag-surface)]">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--ag-line)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--ag-ink)]">HITL Inbox</h1>
          <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
            Review agent pauses for cost exceptions, deploy gates, data access, and code changes.
          </p>
        </div>
        <Badge variant="outline">Preview data</Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
        {error !== null && (
          <div role="status" className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            Sidecar approval queue unavailable. Showing local sample data.
          </div>
        )}

        <HitlSummary requests={requests} />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter approvals by status">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
              className={[
                'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                filter === item
                  ? 'border-[var(--ag-accent)] bg-[var(--ag-accent)]/10 text-[var(--ag-accent)]'
                  : 'border-[var(--ag-line)] text-[var(--ag-ink-muted)] hover:border-[var(--ag-accent)]/50 hover:text-[var(--ag-ink)]',
              ].join(' ')}
            >
              {item === 'all' ? 'All' : STATUS_LABEL[item]}
            </button>
          ))}
        </div>

        {filteredRequests.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No approvals match this status.</p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <RequestTable requests={filteredRequests} selectedId={selectedRequest?.id ?? null} onSelect={setSelectedId} />
            <RequestDetail request={selectedRequest} />
          </div>
        )}
      </div>
    </section>
  )
}
