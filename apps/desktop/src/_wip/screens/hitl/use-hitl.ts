import { useEffect, useState } from 'react'
import { sidecarRequest } from '../../lib/sidecar'

export type HitlKind =
  | 'code_change'
  | 'cost_exception'
  | 'deploy_gate'
  | 'data_access'
  /** Review queues called out in #337 (clinical / regulated workflows). */
  | 'clinical_review'
  /** External or customer sign-off before merge or release. */
  | 'client_approval'
  /** Failed automation run that needs retry, skip, or manual recovery. */
  | 'failed_run'
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
  /** Deep link into traces UI (#337). */
  readonly traceUrl?: string
  /** Matched workspace policy rule ids (#336). */
  readonly policyRuleIds?: readonly string[]
}

type HitlState = {
  readonly requests: readonly HitlRequest[]
  readonly loading: boolean
  readonly error: string | null
}

export const HITL_REQUESTS_FIXTURE: readonly HitlRequest[] = [
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
    traceUrl: '#/traces/run-dev-001',
    policyRuleIds: ['workspacePolicy.toolsDeny'],
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
    traceUrl: '#/traces/run-dev-002',
    policyRuleIds: ['workspacePolicy.irreversibleToolTags', 'cost.per_flow'],
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
  {
    id: 'hitl-approval-005',
    title: 'Clinical protocol deviation — chart review',
    kind: 'clinical_review',
    status: 'pending',
    risk: 'high',
    requester: 'Clinical Safety Orchestrator',
    runId: 'run-clin-220',
    agent: 'claude',
    createdAt: '2026-05-04T20:05:00.000Z',
    expiresAt: '2026-05-04T21:30:00.000Z',
    summary: 'Automated triage flagged a dosage suggestion outside the approved protocol branch; a licensed reviewer must confirm before the flow resumes.',
    evidence: ['protocol v3.2 matched', 'deviation reason: renal adjustment edge case', 'HITL required by domain pack'],
    traceUrl: '#/traces/run-clin-220',
    policyRuleIds: ['domainPack.clinical.hitl', 'workspacePolicy.irreversibleToolTags'],
  },
  {
    id: 'hitl-approval-006',
    title: 'Client approval — public API scope change',
    kind: 'client_approval',
    status: 'pending',
    risk: 'medium',
    requester: 'Delivery PM (Acme Corp)',
    runId: 'run-client-88',
    agent: 'codex',
    createdAt: '2026-05-04T20:10:00.000Z',
    expiresAt: '2026-05-05T12:00:00.000Z',
    summary: 'The generated implementation expands REST surface area beyond the signed SOW. Awaiting named client approver before merge.',
    evidence: ['SOW §4.2 attachment hash verified', 'diff touches 6 public routes', 'legal template attached'],
    traceUrl: '#/traces/run-client-88',
    policyRuleIds: ['clientApproval.required'],
  },
  {
    id: 'hitl-approval-007',
    title: 'Failed run — staging deploy verification',
    kind: 'failed_run',
    status: 'pending',
    risk: 'high',
    requester: 'Release Flow (staging)',
    runId: 'run-fail-901',
    agent: 'gemini',
    createdAt: '2026-05-04T19:55:00.000Z',
    expiresAt: '2026-05-04T22:00:00.000Z',
    summary: 'Post-deploy health checks failed twice; the run is paused until an operator retries, skips the gate, or rolls back.',
    evidence: ['exit code 2 from smoke suite', 'last good deploy: build-4412', 'no automatic rollback policy in this workspace'],
    traceUrl: '#/traces/run-fail-901',
    policyRuleIds: ['flow.deploy_gate', 'observability.alert_hook'],
  },
]

const normalizeHitlRequests = (value: unknown): readonly HitlRequest[] => {
  return Array.isArray(value) ? (value as readonly HitlRequest[]) : HITL_REQUESTS_FIXTURE
}

export function useHitlRequests(): HitlState {
  const [state, setState] = useState<HitlState>({
    requests: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    sidecarRequest<readonly HitlRequest[]>('hitl.list')
      .then((result) => {
        if (!cancelled) {
          setState({ requests: normalizeHitlRequests(result), loading: false, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            requests: HITL_REQUESTS_FIXTURE,
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
