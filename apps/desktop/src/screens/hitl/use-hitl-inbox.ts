import { useEffect, useMemo, useState } from 'react'
import type { HitlKind, HitlRequest, HitlStatus } from './use-hitl'

export const HITL_STATUS_FILTERS = ['all', 'pending', 'approved', 'denied', 'expired'] as const
export const HITL_KIND_FILTERS = [
  'all',
  'code_change',
  'cost_exception',
  'deploy_gate',
  'data_access',
  'clinical_review',
  'client_approval',
  'failed_run',
] as const

export type HitlStatusFilter = (typeof HITL_STATUS_FILTERS)[number]
export type HitlKindFilter = (typeof HITL_KIND_FILTERS)[number]
export type HitlSort = 'soonest' | 'newest'

export function isDueWithin24h(iso: string): boolean {
  const dueAt = new Date(iso).getTime()
  const now = Date.now()
  return dueAt > now && dueAt - now < 24 * 60 * 60 * 1000
}

function resolveStatus(
  request: HitlRequest,
  localStatus: Readonly<Partial<Record<string, HitlStatus>>>,
): HitlStatus {
  return localStatus[request.id] ?? request.status
}

function matchesHitlSearch(request: HitlRequest, query: string): boolean {
  if (query.length === 0) return true

  return [request.title, request.runId, request.requester, request.summary].some((value) =>
    value.toLowerCase().includes(query),
  )
}

function matchesHitlFilters({
  request,
  status,
  statusFilter,
  kindFilter,
  query,
}: {
  readonly request: HitlRequest
  readonly status: HitlStatus
  readonly statusFilter: HitlStatusFilter
  readonly kindFilter: HitlKindFilter
  readonly query: string
}): boolean {
  const matchesStatus = statusFilter === 'all' || status === statusFilter
  const matchesKind = kindFilter === 'all' || request.kind === kindFilter
  return matchesStatus && matchesKind && matchesHitlSearch(request, query)
}

function sortHitlRequests(rows: readonly HitlRequest[], sort: HitlSort): readonly HitlRequest[] {
  return [...rows].sort((a, b) => {
    if (sort === 'soonest') {
      return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export function useHitlInbox({
  requests,
  initialSelectedId,
}: {
  readonly requests: readonly HitlRequest[]
  readonly initialSelectedId: string | null
}) {
  const [statusFilter, setStatusFilter] = useState<HitlStatusFilter>('all')
  const [kindFilter, setKindFilter] = useState<HitlKindFilter>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<HitlSort>('soonest')
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId)
  const [localStatus, setLocalStatus] = useState<Partial<Record<string, HitlStatus>>>({})
  const [escalationNotes, setEscalationNotes] = useState<Partial<Record<string, string>>>({})

  const statusOf = (request: HitlRequest): HitlStatus => localStatus[request.id] ?? request.status

  const filteredRequests = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = requests.filter((request) =>
      matchesHitlFilters({
        kindFilter,
        query: q,
        request,
        status: resolveStatus(request, localStatus),
        statusFilter,
      }),
    )

    return sortHitlRequests(rows, sort)
  }, [kindFilter, localStatus, query, requests, sort, statusFilter])

  const selectedRequest = useMemo(() => {
    const match = requests.find((request) => request.id === selectedId)
    if (match) return match
    return filteredRequests[0] ?? null
  }, [filteredRequests, requests, selectedId])

  useEffect(() => {
    if (filteredRequests.length === 0) return
    const stillHere = filteredRequests.some((request) => request.id === selectedId)
    if (!stillHere) {
      setSelectedId(filteredRequests[0]?.id ?? null)
    }
  }, [filteredRequests, selectedId])

  return {
    escalationNotes,
    filteredRequests,
    kindFilter,
    query,
    selectedRequest,
    setKindFilter,
    setQuery,
    setSelectedId,
    setSort,
    setStatusFilter,
    sort,
    statusFilter,
    statusOf,
    approve: (id: string) => setLocalStatus((state) => ({ ...state, [id]: 'approved' })),
    reject: (id: string) => setLocalStatus((state) => ({ ...state, [id]: 'denied' })),
    escalate: (id: string) =>
      setEscalationNotes((state) => ({
        ...state,
        [id]: 'Escalated to L2 operator queue (demo — wire to sidecar in production).',
      })),
  }
}
