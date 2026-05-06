import { useEffect, useState } from 'react'
import { sidecarRequest } from '../../lib/sidecar'

export type RunStatus = 'queued' | 'running' | 'blocked' | 'succeeded' | 'failed'

export type RunAgent = {
  readonly id: string
  readonly label: string
  readonly provider: 'codex' | 'claude' | 'cursor' | 'gemini'
  readonly status: RunStatus
}

export type RunQueueItem = {
  readonly id: string
  readonly task: string
  readonly repository: string
  readonly branch: string
  readonly trigger: 'manual' | 'slack' | 'github_pr' | 'cron' | 'webhook'
  readonly status: RunStatus
  readonly startedAt: string
  readonly updatedAt: string
  readonly durationMs: number
  readonly costUsd: number
  readonly inputTokens: number
  readonly outputTokens: number
  readonly agents: readonly RunAgent[]
}

type RunsState = {
  readonly runs: readonly RunQueueItem[]
  readonly loading: boolean
  readonly error: string | null
}

export const RUNS_FIXTURE: readonly RunQueueItem[] = [
  {
    id: 'run-dev-001',
    task: 'Implement driver.js onboarding tour',
    repository: 'AgentsKit-io/agentskit-os',
    branch: 'codex/desktop-ia-onboarding-driver',
    trigger: 'manual',
    status: 'succeeded',
    startedAt: '2026-05-04T18:42:00.000Z',
    updatedAt: '2026-05-04T19:13:00.000Z',
    durationMs: 1_860_000,
    costUsd: 2.84,
    inputTokens: 128_400,
    outputTokens: 19_240,
    agents: [
      { id: 'codex-ui', label: 'Codex UI worker', provider: 'codex', status: 'succeeded' },
      { id: 'claude-review', label: 'Claude review pass', provider: 'claude', status: 'succeeded' },
    ],
  },
  {
    id: 'run-dev-002',
    task: 'Compare providers for flow editor scaffold',
    repository: 'AgentsKit-io/agentskit-os',
    branch: 'feat/os-flow-live-debugger',
    trigger: 'github_pr',
    status: 'running',
    startedAt: '2026-05-04T19:08:00.000Z',
    updatedAt: '2026-05-04T19:15:00.000Z',
    durationMs: 420_000,
    costUsd: 1.16,
    inputTokens: 74_900,
    outputTokens: 8_120,
    agents: [
      { id: 'codex-orchestrator', label: 'Codex orchestrator', provider: 'codex', status: 'running' },
      { id: 'gemini-planner', label: 'Gemini planner', provider: 'gemini', status: 'succeeded' },
      { id: 'claude-impl', label: 'Claude implementation', provider: 'claude', status: 'running' },
    ],
  },
  {
    id: 'run-dev-003',
    task: 'Draft trigger provider contracts',
    repository: 'AgentsKit-io/agentskit-os',
    branch: 'm3/triggers-contracts',
    trigger: 'slack',
    status: 'blocked',
    startedAt: '2026-05-04T18:55:00.000Z',
    updatedAt: '2026-05-04T19:02:00.000Z',
    durationMs: 360_000,
    costUsd: 0.72,
    inputTokens: 42_100,
    outputTokens: 5_380,
    agents: [
      { id: 'cursor-schema', label: 'Cursor schema pass', provider: 'cursor', status: 'blocked' },
      { id: 'codex-tests', label: 'Codex test planner', provider: 'codex', status: 'queued' },
    ],
  },
]

const normalizeRuns = (value: unknown): readonly RunQueueItem[] => {
  return Array.isArray(value) ? (value as readonly RunQueueItem[]) : RUNS_FIXTURE
}

export function useRuns(): RunsState {
  const [state, setState] = useState<RunsState>({
    runs: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    sidecarRequest<readonly RunQueueItem[]>('runs.list')
      .then((result) => {
        if (!cancelled) {
          setState({ runs: normalizeRuns(result), loading: false, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            runs: RUNS_FIXTURE,
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
