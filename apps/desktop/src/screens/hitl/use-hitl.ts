import { useEffect, useState } from 'react'
import { sidecarRequest } from '../../lib/sidecar'

export type HitlKind = 'code_change' | 'cost_exception' | 'deploy_gate' | 'data_access'
export type HitlStatus = 'pending' | 'approved' | 'denied' | 'expired'
export type HitlRisk = 'low' | 'medium' | 'high'

export type HitlRequest = {
  readonly id: string
  readonly title: string
  readonly kind: HitlKind
  readonly status: HitlStatus
  readonly risk: HitlRisk
  readonly requester: string
  readonly runId: string
  readonly agent: string
  readonly createdAt: string
  readonly expiresAt: string
  readonly summary: string
  readonly evidence: readonly string[]
}

type HitlState = {
  readonly requests: readonly HitlRequest[]
  readonly loading: boolean
  readonly error: string | null
}

export const MOCK_HITL_REQUESTS: readonly HitlRequest[] = [
  {
    id: 'hitl-approval-001',
    title: 'Approve driver.js dependency addition',
    kind: 'code_change',
    status: 'approved',
    risk: 'medium',
    requester: 'Codex Development Orchestrator',
    runId: 'run-dev-001',
    agent: 'codex',
    createdAt: '2026-05-04T18:44:00.000Z',
    expiresAt: '2026-05-04T20:44:00.000Z',
    summary: 'A new frontend dependency is required to replace the custom onboarding modal with anchored product tours.',
    evidence: ['package.json adds driver.js', 'pnpm-lock.yaml integrity present', 'desktop lint and build passed'],
  },
  {
    id: 'hitl-approval-002',
    title: 'Allow benchmark run over budget',
    kind: 'cost_exception',
    status: 'pending',
    risk: 'high',
    requester: 'Gemini Planning Scout',
    runId: 'run-dev-002',
    agent: 'gemini',
    createdAt: '2026-05-04T19:17:00.000Z',
    expiresAt: '2026-05-04T20:17:00.000Z',
    summary: 'Parallel model benchmark needs to exceed the default task budget to compare Codex, Claude, and Gemini outputs.',
    evidence: ['$12.00 projected cost', '3 providers selected', 'benchmark issue references model completeness scoring'],
  },
  {
    id: 'hitl-approval-003',
    title: 'Release trigger provider contracts',
    kind: 'deploy_gate',
    status: 'pending',
    risk: 'medium',
    requester: 'Claude Implementation Worker',
    runId: 'run-dev-003',
    agent: 'claude',
    createdAt: '2026-05-04T19:03:00.000Z',
    expiresAt: '2026-05-04T21:03:00.000Z',
    summary: 'Trigger schemas are ready for review before exposing Slack, Teams, PR, cron, and webhook routes to production flows.',
    evidence: ['schema diff generated', 'mock trigger registry covered', 'needs owner approval'],
  },
  {
    id: 'hitl-approval-004',
    title: 'Review clinic operations data access',
    kind: 'data_access',
    status: 'denied',
    risk: 'high',
    requester: 'Healthcare Ops Domain Pack',
    runId: 'run-ops-014',
    agent: 'codex',
    createdAt: '2026-05-04T17:20:00.000Z',
    expiresAt: '2026-05-04T18:20:00.000Z',
    summary: 'A clinic workflow requested access to sensitive appointment context without a matching approved data route.',
    evidence: ['PHI policy matched', 'regional route missing', 'request denied by policy owner'],
  },
]

const normalizeHitlRequests = (value: unknown): readonly HitlRequest[] => {
  return Array.isArray(value) ? (value as readonly HitlRequest[]) : MOCK_HITL_REQUESTS
}

export function useHitlRequests(): HitlState {
  const [state, setState] = useState<HitlState>({
    requests: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    sidecarRequest<unknown>('hitl.list')
      .then((result) => {
        if (!cancelled) {
          setState({ requests: normalizeHitlRequests(result), loading: false, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            requests: MOCK_HITL_REQUESTS,
            loading: false,
            error: error instanceof Error ? error.message : null,
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
