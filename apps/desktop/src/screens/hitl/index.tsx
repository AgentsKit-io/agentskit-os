import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import {
  HITL_REQUESTS_FIXTURE,
  type HitlKind,
  type HitlRequest,
  type HitlRisk,
  type HitlStatus,
  useHitlRequests,
} from './use-hitl'
import { FilterPills } from '../../components/filter-pills'
import { formatTime } from '../../lib/format'
import { compareIsoAsc, compareIsoDesc, isDueWithinMs } from '../../lib/date'

const KIND_LABEL: Record<HitlKind, string> = {
  code_change: 'Code change',
  cost_exception: 'Cost exception',
  deploy_gate: 'Deploy gate',
  data_access: 'Data access',
  clinical_review: 'Clinical review',
  client_approval: 'Client approval',
  failed_run: 'Failed run',
}

const KIND_FILTERS: Array<'all' | HitlKind> = [
  'all',
  'code_change',
  'cost_exception',
  'deploy_gate',
  'data_access',
  'clinical_review',
  'client_approval',
  'failed_run',
]

const statusLabelByStatus: Record<HitlStatus, string> = {
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

const statusClassByStatus: Record<HitlStatus, string> = {
  pending: 'border-[var(--ag-accent)]/25 bg-[var(--ag-accent)]/10 text-[var(--ag-accent)]',
  approved: 'border-[var(--ag-success)]/25 bg-[var(--ag-success)]/10 text-[var(--ag-success)]',
  denied: 'border-[var(--ag-danger)]/25 bg-[var(--ag-danger)]/10 text-[var(--ag-danger)]',
  expired: 'border-[var(--ag-ink-muted)]/25 bg-[var(--ag-ink-muted)]/10 text-[var(--ag-ink-muted)]',
}

const RISK_CLASSES: Record<HitlRisk, string> = {
  low: 'border-[var(--ag-success)]/25 bg-[var(--ag-success)]/10 text-[var(--ag-success)]',
  medium: 'border-[var(--ag-warn)]/30 bg-[var(--ag-warn)]/10 text-[var(--ag-warn)]',
  high: 'border-[var(--ag-danger)]/25 bg-[var(--ag-danger)]/10 text-[var(--ag-danger)]',
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

const filterAndSortRequests = (args: {
  requests: readonly HitlRequest[]
  filter: HitlStatus | 'all'
  kindFilter: 'all' | HitlKind
  query: string
  sortDue: 'soonest' | 'newest'
  localStatus: Partial<Record<string, HitlStatus>>
}): HitlRequest[] => {
  const { requests, filter, kindFilter, query, sortDue, localStatus } = args
  const eff = (r: HitlRequest): HitlStatus => localStatus[r.id] ?? r.status
  let rows = filter === 'all' ? [...requests] : requests.filter((request) => eff(request) === filter)
  if (kindFilter !== 'all') rows = rows.filter((r) => r.kind === kindFilter)

  const q = query.trim().toLowerCase()
  if (q.length > 0) {
    rows = rows.filter((r) => {
      return (
        r.title.toLowerCase().includes(q) ||
        r.runId.toLowerCase().includes(q) ||
        r.requester.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q)
      )
    })
  }

  rows.sort((a, b) => {
    if (sortDue === 'soonest') return compareIsoAsc(a.expiresAt, b.expiresAt)
    return compareIsoDesc(a.createdAt, b.createdAt)
  })
  return rows
}

function HitlSummary({
  requests,
  statusOf,
}: {
  readonly requests: readonly HitlRequest[]
  readonly statusOf: (r: HitlRequest) => HitlStatus
}) {
  const pending = requests.filter((request) => statusOf(request) === 'pending').length
  const highRisk = requests.filter((request) => request.risk === 'high').length
  const approved = requests.filter((request) => statusOf(request) === 'approved').length
  const denied = requests.filter((request) => statusOf(request) === 'denied').length
  const dueSoon = requests.filter(
    (request) => statusOf(request) === 'pending' && isDueWithinMs(request.expiresAt, 24 * 60 * 60 * 1000),
  ).length

  const items = [
    { label: 'Pending', value: pending.toString() },
    { label: 'Due < 24h', value: dueSoon.toString() },
    { label: 'High risk', value: highRisk.toString() },
    { label: 'Approved', value: approved.toString() },
    { label: 'Denied', value: denied.toString() },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
  statusOf,
}: {
  readonly requests: readonly HitlRequest[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
  readonly statusOf: (r: HitlRequest) => HitlStatus
}) {
  return (
    <div className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <table className="w-full border-collapse text-sm" aria-label="Human task inbox">
        <thead>
          <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
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
                <Pill label={statusLabelByStatus[statusOf(request)]} className={statusClassByStatus[statusOf(request)]} />
              </td>
              <td className="px-3 py-3">
                <Pill label={RISK_LABEL[request.risk]} className={RISK_CLASSES[request.risk]} />
              </td>
              <td className="max-w-[140px] px-3 py-3 font-mono text-[10px] text-[var(--ag-ink-muted)]">
                <span className="line-clamp-2" title={(request.policyRuleIds ?? []).join(', ')}>
                  {(() => {
                    const count = request.policyRuleIds?.length ?? 0
                    return count > 0 ? `${count} rules` : '—'
                  })()}
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
                {formatTime(request.expiresAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RequestDetail({
  request,
  statusOf,
  escalationNotes,
  onApprove,
  onReject,
  onEscalate,
}: {
  readonly request: HitlRequest | null
  readonly statusOf: (r: HitlRequest) => HitlStatus
  readonly escalationNotes: Readonly<Partial<Record<string, string>>>
  readonly onApprove: (id: string) => void
  readonly onReject: (id: string) => void
  readonly onEscalate: (id: string) => void
}) {
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
          <Pill label={statusLabelByStatus[statusOf(request)]} className={statusClassByStatus[statusOf(request)]} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <DetailMetric label="Kind" value={KIND_LABEL[request.kind]} />
        <DetailMetric label="Risk" value={RISK_LABEL[request.risk]} />
        <DetailMetric label="Agent" value={request.agent} />
        <DetailMetric label="Created" value={formatTime(request.createdAt)} />
      </div>

      {escalationNotes[request.id] !== undefined && (
        <div className="border-b border-[var(--ag-warn)]/20 bg-[var(--ag-warn)]/10 px-4 py-2 text-sm text-[var(--ag-warn)]">
          {escalationNotes[request.id]}
        </div>
      )}

      {statusOf(request) === 'pending' && (
        <div className="flex flex-wrap gap-2 border-b border-[var(--ag-line)] p-4">
          <button
            type="button"
            className="rounded-md border border-[var(--ag-success)]/40 bg-[var(--ag-success)]/15 px-3 py-1.5 text-sm font-medium text-[var(--ag-success)] hover:bg-[var(--ag-success)]/25"
            onClick={() => onApprove(request.id)}
          >
            Approve
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--ag-danger)]/40 bg-[var(--ag-danger)]/15 px-3 py-1.5 text-sm font-medium text-[var(--ag-danger)] hover:bg-[var(--ag-danger)]/25"
            onClick={() => onReject(request.id)}
          >
            Reject
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--ag-warn)]/40 bg-[var(--ag-warn)]/15 px-3 py-1.5 text-sm font-medium text-[var(--ag-warn)] hover:bg-[var(--ag-warn)]/25"
            onClick={() => onEscalate(request.id)}
          >
            Escalate
          </button>
        </div>
      )}

      <div className="border-b border-[var(--ag-line)] p-4">
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">Trace</h3>
        <a
          className="mt-2 inline-block text-sm font-medium text-[var(--ag-accent)] hover:underline"
          href={request.traceUrl ?? `#/traces/${encodeURIComponent(request.runId)}`}
        >
          Open trace for {request.runId}
        </a>
      </div>

      {(request.policyRuleIds?.length ?? 0) > 0 && (
        <div className="border-b border-[var(--ag-line)] p-4">
          <h3 className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
            Policy context
          </h3>
          <ul className="mt-2 flex flex-col gap-1">
            {(request.policyRuleIds ?? []).map((rule) => (
              <li key={rule} className="font-mono text-xs text-[var(--ag-ink-muted)]">
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}

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

function HitlLoading(): React.JSX.Element {
  return (
    <section
      aria-label="HITL Inbox"
      className="flex h-full items-center justify-center text-sm text-[var(--ag-ink-muted)]"
    >
      Loading approvals...
    </section>
  )
}

function useHitlSelection(args: {
  requests: readonly HitlRequest[]
  filteredRequests: readonly HitlRequest[]
}) {
  const { requests, filteredRequests } = args
  const [selectedId, setSelectedId] = useState<string | null>(HITL_REQUESTS_FIXTURE[1]?.id ?? null)

  const selectedRequest = useMemo(() => {
    const match = requests.find((request) => request.id === selectedId)
    if (match) return match
    return filteredRequests[0] ?? null
  }, [filteredRequests, requests, selectedId])

  useEffect(() => {
    if (filteredRequests.length === 0) return
    const stillHere = filteredRequests.some((r) => r.id === selectedId)
    if (!stillHere) {
      setSelectedId(filteredRequests[0]?.id ?? null)
    }
  }, [filteredRequests, selectedId])

  return { selectedId, setSelectedId, selectedRequest }
}

export function HitlScreen() {
  const { requests, loading, error } = useHitlRequests()
  const [filter, setFilter] = useState<HitlStatus | 'all'>('all')
  const [kindFilter, setKindFilter] = useState<'all' | HitlKind>('all')
  const [query, setQuery] = useState('')
  const [sortDue, setSortDue] = useState<'soonest' | 'newest'>('soonest')
  const [localStatus, setLocalStatus] = useState<Partial<Record<string, HitlStatus>>>({})
  const [escalationNotes, setEscalationNotes] = useState<Partial<Record<string, string>>>({})

  const statusOf = (r: HitlRequest): HitlStatus => localStatus[r.id] ?? r.status

  const filteredRequests = useMemo(() => {
    return filterAndSortRequests({ requests, filter, kindFilter, query, sortDue, localStatus })
  }, [filter, kindFilter, query, requests, localStatus, sortDue])

  const { selectedId, setSelectedId, selectedRequest } = useHitlSelection({ requests, filteredRequests })

  if (loading) {
    return <HitlLoading />
  }

  return (
    <section aria-label="HITL Inbox" className="flex h-full min-h-0 flex-col bg-[var(--ag-surface)]">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--ag-line)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--ag-ink)]">HITL Inbox</h1>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
            Human task inbox
          </p>
          <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
            Pending approvals, clinical and client review queues, policy exceptions, deploy gates, failed runs, and
            escalations — each linked to traces, policy context, requester, and due time (#337).
          </p>
        </div>
        <Badge variant="outline">Preview mode</Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
        {error !== null && (
          <div role="status" className="rounded-md border border-[var(--ag-warn)]/25 bg-[var(--ag-warn)]/10 px-3 py-2 text-sm text-[var(--ag-warn)]">
            Sidecar approval queue unavailable. Showing local sample data.
          </div>
        )}

        <HitlSummary requests={requests} statusOf={statusOf} />

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
              Search
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Title, run id, requester…"
                className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ag-ink)] placeholder:text-[var(--ag-ink-subtle)]"
              />
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
                Sort by
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-pressed={sortDue === 'soonest'}
                  onClick={() => setSortDue('soonest')}
                  className={[
                    'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                    sortDue === 'soonest'
                      ? 'border-[var(--ag-accent)] bg-[var(--ag-accent)]/10 text-[var(--ag-accent)]'
                      : 'border-[var(--ag-line)] text-[var(--ag-ink-muted)] hover:border-[var(--ag-accent)]/50',
                  ].join(' ')}
                >
                  Due soonest
                </button>
                <button
                  type="button"
                  aria-pressed={sortDue === 'newest'}
                  onClick={() => setSortDue('newest')}
                  className={[
                    'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                    sortDue === 'newest'
                      ? 'border-[var(--ag-accent)] bg-[var(--ag-accent)]/10 text-[var(--ag-accent)]'
                      : 'border-[var(--ag-line)] text-[var(--ag-ink-muted)] hover:border-[var(--ag-accent)]/50',
                  ].join(' ')}
                >
                  Newest
                </button>
              </div>
            </div>
          </div>

          <FilterPills
            items={FILTERS}
            active={filter}
            onChange={setFilter}
            ariaLabel="Filter human tasks by status"
            labelFor={(item) => (item === 'all' ? 'All statuses' : statusLabelByStatus[item])}
          />

          <FilterPills
            items={KIND_FILTERS}
            active={kindFilter}
            onChange={setKindFilter}
            ariaLabel="Filter human tasks by queue kind"
            labelFor={(item) => (item === 'all' ? 'All queues' : KIND_LABEL[item])}
          />
        </div>

        {filteredRequests.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No tasks match the current filters.</p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <RequestTable
              requests={filteredRequests}
              selectedId={selectedRequest?.id ?? null}
              onSelect={setSelectedId}
              statusOf={statusOf}
            />
            <RequestDetail
              request={selectedRequest}
              statusOf={statusOf}
              escalationNotes={escalationNotes}
              onApprove={(id) => setLocalStatus((m) => ({ ...m, [id]: 'approved' }))}
              onReject={(id) => setLocalStatus((m) => ({ ...m, [id]: 'denied' }))}
              onEscalate={(id) =>
                setEscalationNotes((n) => ({
                  ...n,
                  [id]: 'Escalated to L2 operator queue (demo — wire to sidecar in production).',
                }))
              }
            />
          </div>
        )}
      </div>
    </section>
  )
}
