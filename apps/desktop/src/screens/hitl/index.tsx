import { Badge } from '@agentskit/os-ui'
import { HitlDetailPanel } from './hitl-detail-panel'
import { HitlFilters } from './hitl-filters'
import { HitlSummary } from './hitl-summary'
import { HitlTable } from './hitl-table'
import { useHitlInbox } from './use-hitl-inbox'
import { HITL_REQUESTS_FIXTURE, useHitlRequests } from './use-hitl'

const HITL_HEADER_CLASS = [
  'sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-4',
  'border-b border-[var(--ag-line)] bg-[var(--ag-glass-strong-bg)] px-4 py-3',
  '[backdrop-filter:var(--ag-glass-blur)] sm:px-6',
].join(' ')

export function HitlScreen() {
  const { requests, loading, error } = useHitlRequests()
  const inbox = useHitlInbox({
    initialSelectedId: HITL_REQUESTS_FIXTURE[1]?.id ?? null,
    requests,
  })

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
    return (
      <section
        aria-label="HITL Inbox"
        className="flex h-full items-center justify-center text-sm text-[var(--ag-ink-muted)]"
      >
        Loading approvals...
      </section>
    )
  }

  return (
    <section aria-label="HITL Inbox" className="flex min-h-full flex-col bg-[var(--ag-surface)]">
      <div className={HITL_HEADER_CLASS}>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            Human gates
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ag-ink)]">
            HITL Inbox
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--ag-ink-muted)]">
            Pending approvals, clinical and client review queues, policy exceptions, deploy gates,
            failed runs, and escalations linked to traces, policy context, requester, and due time.
          </p>
        </div>
        <Badge variant="outline">Preview mode</Badge>
      </div>

      <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
        {error !== null && (
          <div
            role="status"
            className="rounded-xl border border-[color-mix(in_srgb,var(--ag-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_12%,transparent)] px-3 py-2 text-sm text-[var(--ag-warning)]"
          >
            Sidecar approval queue unavailable. Showing local sample data.
          </div>
        )}

        <HitlSummary requests={requests} statusOf={inbox.statusOf} />
        <HitlFilters
          query={inbox.query}
          statusFilter={inbox.statusFilter}
          kindFilter={inbox.kindFilter}
          sort={inbox.sort}
          onQuery={inbox.setQuery}
          onStatusFilter={inbox.setStatusFilter}
          onKindFilter={inbox.setKindFilter}
          onSort={inbox.setSort}
        />

        {inbox.filteredRequests.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">
              No tasks match the current filters.
            </p>
          </div>
        ) : (
          <div className="grid min-h-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <HitlTable
              requests={inbox.filteredRequests}
              selectedId={inbox.selectedRequest?.id ?? null}
              statusOf={inbox.statusOf}
              onSelect={inbox.setSelectedId}
            />
            <HitlDetailPanel
              request={inbox.selectedRequest}
              statusOf={inbox.statusOf}
              escalationNotes={inbox.escalationNotes}
              onApprove={inbox.approve}
              onReject={inbox.reject}
              onEscalate={inbox.escalate}
            />
          </div>
        )}
      </div>
    </section>
  )
}
