import { useEffect, useState } from 'react'
import { sidecarRequest } from '../../lib/sidecar'

export type CostProvider = 'openai' | 'anthropic' | 'google' | 'cursor'
export type BudgetStatus = 'healthy' | 'watch' | 'exceeded'

export type CostBudget = {
  readonly id: string
  readonly name: string
  readonly provider: CostProvider
  readonly status: BudgetStatus
  readonly spendUsd: number
  readonly limitUsd: number
  readonly tokens: number
  readonly runs: number
  readonly resetAt: string
  readonly owner: string
  readonly policy: string
  readonly quotaNotes: readonly string[]
}

type CostState = {
  readonly budgets: readonly CostBudget[]
  readonly loading: boolean
  readonly error: string | null
}

export const MOCK_COST_BUDGETS: readonly CostBudget[] = [
  {
    id: 'budget-openai-dev',
    name: 'OpenAI development tasks',
    provider: 'openai',
    status: 'healthy',
    spendUsd: 84.2,
    limitUsd: 250,
    tokens: 4_820_000,
    runs: 148,
    resetAt: '2026-06-01T00:00:00.000Z',
    owner: 'Platform Engineering',
    policy: 'Allow normal runs, require HITL above $12 per task.',
    quotaNotes: ['gpt-5.5 default for Codex', 'hard cap at 90% monthly spend'],
  },
  {
    id: 'budget-anthropic-review',
    name: 'Anthropic review workers',
    provider: 'anthropic',
    status: 'watch',
    spendUsd: 196.7,
    limitUsd: 225,
    tokens: 3_940_000,
    runs: 96,
    resetAt: '2026-06-01T00:00:00.000Z',
    owner: 'Code Review',
    policy: 'Pause new review fan-out at 85%, allow single reviewer runs.',
    quotaNotes: ['Claude implementation workers near cap', 'benchmark jobs need approval'],
  },
  {
    id: 'budget-google-planning',
    name: 'Google planning and benchmark',
    provider: 'google',
    status: 'healthy',
    spendUsd: 52.4,
    limitUsd: 180,
    tokens: 5_460_000,
    runs: 74,
    resetAt: '2026-06-01T00:00:00.000Z',
    owner: 'Quality',
    policy: 'Use for large-context planning and nightly comparison runs.',
    quotaNotes: ['Gemini planner has lowest average cost', 'nightly benchmark paused unless approved'],
  },
  {
    id: 'budget-cursor-local',
    name: 'Cursor local repository agents',
    provider: 'cursor',
    status: 'exceeded',
    spendUsd: 121.8,
    limitUsd: 100,
    tokens: 1_220_000,
    runs: 32,
    resetAt: '2026-06-01T00:00:00.000Z',
    owner: 'Desktop UI',
    policy: 'Block new Cursor runs until auth and quota owner review.',
    quotaNotes: ['Provider is over monthly quota', 'new runs require HITL cost exception'],
  },
]

function normalizeCostBudgets(value: unknown): readonly CostBudget[] {
  return Array.isArray(value) ? (value as readonly CostBudget[]) : MOCK_COST_BUDGETS
}

export function useCostBudgets(): CostState {
  const [state, setState] = useState<CostState>({
    budgets: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    sidecarRequest<unknown>('cost.budgets')
      .then((result) => {
        if (!cancelled) {
          setState({ budgets: normalizeCostBudgets(result), loading: false, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            budgets: MOCK_COST_BUDGETS,
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
