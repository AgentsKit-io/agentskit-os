import { useEffect, useState } from 'react'
import { sidecarRequest } from '../../lib/sidecar'

export type FlowStatus = 'active' | 'draft' | 'paused' | 'failing'
export type FlowTrigger = 'manual' | 'cron' | 'webhook' | 'pull_request' | 'slack'

export type FlowDefinition = {
  readonly id: string
  readonly name: string
  readonly status: FlowStatus
  readonly trigger: FlowTrigger
  readonly version: string
  readonly owner: string
  readonly runs24h: number
  readonly successRatePct: number
  readonly avgDurationMs: number
  readonly lastRunAt: string
  readonly nodes: readonly string[]
  readonly edges: readonly string[]
  readonly notes: readonly string[]
}

type FlowsState = {
  readonly flows: readonly FlowDefinition[]
  readonly loading: boolean
  readonly error: string | null
}

export const MOCK_FLOWS: readonly FlowDefinition[] = [
  {
    id: 'flow-dev-orchestrator',
    name: 'Development orchestrator',
    status: 'active',
    trigger: 'pull_request',
    version: 'v0.8.2',
    owner: 'Platform Engineering',
    runs24h: 42,
    successRatePct: 93,
    avgDurationMs: 1_180_000,
    lastRunAt: '2026-05-04T19:45:00.000Z',
    nodes: ['triage', 'plan', 'fanout', 'verify', 'report'],
    edges: ['triage -> plan', 'plan -> fanout', 'fanout -> verify', 'verify -> report'],
    notes: ['Delegates Codex, Claude, and Gemini workers', 'Requires HITL when projected cost exceeds budget'],
  },
  {
    id: 'flow-clinic-triage',
    name: 'Clinic request triage',
    status: 'active',
    trigger: 'webhook',
    version: 'v0.4.1',
    owner: 'Healthcare Ops',
    runs24h: 18,
    successRatePct: 97,
    avgDurationMs: 420_000,
    lastRunAt: '2026-05-04T19:18:00.000Z',
    nodes: ['ingest', 'redact', 'route', 'summarize', 'handoff'],
    edges: ['ingest -> redact', 'redact -> route', 'route -> summarize', 'summarize -> handoff'],
    notes: ['PHI redaction enabled before model calls', 'EU routing still needs provider lock review'],
  },
  {
    id: 'flow-marketing-launch',
    name: 'Marketing launch desk',
    status: 'draft',
    trigger: 'manual',
    version: 'v0.2.0',
    owner: 'Growth',
    runs24h: 0,
    successRatePct: 0,
    avgDurationMs: 0,
    lastRunAt: '2026-05-03T21:10:00.000Z',
    nodes: ['brief', 'research', 'copy', 'review', 'publish'],
    edges: ['brief -> research', 'research -> copy', 'copy -> review', 'review -> publish'],
    notes: ['Waiting on brand voice scorer', 'Publish node is disabled until approval policy lands'],
  },
  {
    id: 'flow-nightly-benchmark',
    name: 'Nightly model benchmark',
    status: 'paused',
    trigger: 'cron',
    version: 'v0.5.3',
    owner: 'Quality',
    runs24h: 1,
    successRatePct: 88,
    avgDurationMs: 2_640_000,
    lastRunAt: '2026-05-04T03:00:00.000Z',
    nodes: ['select_tasks', 'launch_agents', 'score', 'compare', 'notify'],
    edges: ['select_tasks -> launch_agents', 'launch_agents -> score', 'score -> compare', 'compare -> notify'],
    notes: ['Paused by cost guard after Anthropic budget warning', 'Can resume with manual override'],
  },
]

function normalizeFlows(value: unknown): readonly FlowDefinition[] {
  return Array.isArray(value) ? (value as readonly FlowDefinition[]) : MOCK_FLOWS
}

export function useFlows(): FlowsState {
  const [state, setState] = useState<FlowsState>({
    flows: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    sidecarRequest<unknown>('flows.list')
      .then((result) => {
        if (!cancelled) {
          setState({ flows: normalizeFlows(result), loading: false, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            flows: MOCK_FLOWS,
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
