import { useEffect, useState } from 'react'
import { sidecarRequest } from '../../lib/sidecar'

export type TriggerProvider = 'slack' | 'discord' | 'teams' | 'cron' | 'github_pr' | 'webhook'
export type TriggerStatus = 'active' | 'paused' | 'failing' | 'needs_auth'

export type TriggerRule = {
  readonly id: string
  readonly name: string
  readonly provider: TriggerProvider
  readonly status: TriggerStatus
  readonly targetFlow: string
  readonly agentPolicy: string
  readonly lastFiredAt: string
  readonly runs24h: number
  readonly successRatePct: number
  readonly cost24hUsd: number
  readonly configSummary: string
}

type TriggersState = {
  readonly triggers: readonly TriggerRule[]
  readonly loading: boolean
  readonly error: string | null
}

export const TRIGGERS_FIXTURE: readonly TriggerRule[] = [
  {
    id: 'trigger-slack-prd',
    name: 'Slack product request intake',
    provider: 'slack',
    status: 'active',
    targetFlow: 'dev-orchestrator.prd-to-issues',
    agentPolicy: 'Codex primary, Claude reviewer',
    lastFiredAt: '2026-05-04T19:18:00.000Z',
    runs24h: 9,
    successRatePct: 96,
    cost24hUsd: 4.18,
    configSummary: '#product-requests, mentions + thread replies',
  },
  {
    id: 'trigger-github-pr',
    name: 'GitHub PR implementation review',
    provider: 'github_pr',
    status: 'active',
    targetFlow: 'dev-orchestrator.pr-review',
    agentPolicy: 'Claude review, Codex patch planner',
    lastFiredAt: '2026-05-04T19:11:00.000Z',
    runs24h: 14,
    successRatePct: 91,
    cost24hUsd: 6.72,
    configSummary: 'AgentsKit-io/agentskit-os, opened + synchronize',
  },
  {
    id: 'trigger-nightly-benchmark',
    name: 'Nightly model benchmark',
    provider: 'cron',
    status: 'paused',
    targetFlow: 'quality.model-benchmark',
    agentPolicy: 'Codex, Claude, Gemini parallel',
    lastFiredAt: '2026-05-03T03:00:00.000Z',
    runs24h: 0,
    successRatePct: 88,
    cost24hUsd: 0,
    configSummary: '0 3 * * *, America/Sao_Paulo',
  },
  {
    id: 'trigger-teams-clinic',
    name: 'Teams clinic operations request',
    provider: 'teams',
    status: 'needs_auth',
    targetFlow: 'ops.clinic-request-triage',
    agentPolicy: 'Domain pack: healthcare operations',
    lastFiredAt: '2026-05-02T16:24:00.000Z',
    runs24h: 0,
    successRatePct: 82,
    cost24hUsd: 0,
    configSummary: 'Care ops channel, auth refresh required',
  },
  {
    id: 'trigger-webhook-marketing',
    name: 'Marketing agency webhook',
    provider: 'webhook',
    status: 'failing',
    targetFlow: 'marketing.campaign-brief',
    agentPolicy: 'Gemini planner, Codex formatter',
    lastFiredAt: '2026-05-04T18:45:00.000Z',
    runs24h: 3,
    successRatePct: 67,
    cost24hUsd: 1.24,
    configSummary: '/webhooks/agency/campaign-brief, schema mismatch',
  },
]

const normalizeTriggers = (value: unknown): readonly TriggerRule[] => {
  return Array.isArray(value) ? (value as readonly TriggerRule[]) : TRIGGERS_FIXTURE
}

export function useTriggers(): TriggersState {
  const [state, setState] = useState<TriggersState>({
    triggers: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    sidecarRequest<readonly TriggerRule[]>('triggers.list')
      .then((result) => {
        if (!cancelled) {
          setState({ triggers: normalizeTriggers(result), loading: false, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            triggers: TRIGGERS_FIXTURE,
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
