import { useEffect, useState } from 'react'
import { sidecarRequest } from '../../lib/sidecar'

export type AgentProvider = 'codex' | 'claude' | 'cursor' | 'gemini'
export type AgentStatus = 'ready' | 'busy' | 'offline' | 'needs_auth'

export type AgentProfile = {
  readonly id: string
  readonly name: string
  readonly provider: AgentProvider
  readonly status: AgentStatus
  readonly model: string
  readonly cliCommand: string
  readonly version: string
  readonly capabilities: readonly string[]
  readonly activeRuns: number
  readonly successRatePct: number
  readonly avgCostUsd: number
  readonly lastRunAt: string
}

type AgentsState = {
  readonly agents: readonly AgentProfile[]
  readonly loading: boolean
  readonly error: string | null
}

export const AGENTS_FIXTURE: readonly AgentProfile[] = [
  {
    id: 'agent-codex-dev',
    name: 'Codex Development Orchestrator',
    provider: 'codex',
    status: 'ready',
    model: 'gpt-5.5',
    cliCommand: 'codex',
    version: '0.63.0',
    capabilities: ['code-edit', 'tests', 'git', 'browser-ui'],
    activeRuns: 1,
    successRatePct: 94,
    avgCostUsd: 1.42,
    lastRunAt: '2026-05-04T19:16:00.000Z',
  },
  {
    id: 'agent-claude-impl',
    name: 'Claude Implementation Worker',
    provider: 'claude',
    status: 'busy',
    model: 'claude-sonnet-4.6',
    cliCommand: 'claude',
    version: '2.0.14',
    capabilities: ['code-edit', 'architecture', 'docs'],
    activeRuns: 2,
    successRatePct: 91,
    avgCostUsd: 1.86,
    lastRunAt: '2026-05-04T19:12:00.000Z',
  },
  {
    id: 'agent-cursor-review',
    name: 'Cursor Review Assistant',
    provider: 'cursor',
    status: 'needs_auth',
    model: 'cursor-agent',
    cliCommand: 'cursor-agent',
    version: 'not linked',
    capabilities: ['repo-context', 'review', 'refactor'],
    activeRuns: 0,
    successRatePct: 87,
    avgCostUsd: 0.94,
    lastRunAt: '2026-05-04T17:40:00.000Z',
  },
  {
    id: 'agent-gemini-planner',
    name: 'Gemini Planning Scout',
    provider: 'gemini',
    status: 'ready',
    model: 'gemini-2.5-pro',
    cliCommand: 'gemini',
    version: '1.8.2',
    capabilities: ['planning', 'large-context', 'benchmark'],
    activeRuns: 0,
    successRatePct: 89,
    avgCostUsd: 0.78,
    lastRunAt: '2026-05-04T18:58:00.000Z',
  },
]

const normalizeAgents = (value: unknown): readonly AgentProfile[] => {
  return Array.isArray(value) ? (value as readonly AgentProfile[]) : AGENTS_FIXTURE
}

export function useAgents(): AgentsState {
  const [state, setState] = useState<AgentsState>({
    agents: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    sidecarRequest<readonly AgentProfile[]>('agents.list')
      .then((result) => {
        if (!cancelled) {
          setState({ agents: normalizeAgents(result), loading: false, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            agents: AGENTS_FIXTURE,
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
