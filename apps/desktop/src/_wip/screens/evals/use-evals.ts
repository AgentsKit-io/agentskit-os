import { useEffect, useState } from 'react'
import { sidecarRequest } from '../../lib/sidecar'

export type EvalStatus = 'passing' | 'regressed' | 'running' | 'failing'
export type EvalCadence = 'on_pr' | 'nightly' | 'manual'

export type EvalSuite = {
  readonly id: string
  readonly name: string
  readonly status: EvalStatus
  readonly cadence: EvalCadence
  readonly dataset: string
  readonly scorer: string
  readonly targetFlow: string
  readonly cases: number
  readonly passRatePct: number
  readonly regressionCount: number
  readonly avgCostUsd: number
  readonly lastRunAt: string
  readonly notes: readonly string[]
}

type EvalsState = {
  readonly suites: readonly EvalSuite[]
  readonly loading: boolean
  readonly error: string | null
}

export const EVAL_SUITES_FIXTURE: readonly EvalSuite[] = [
  {
    id: 'eval-pr-review-quality',
    name: 'PR review quality gate',
    status: 'passing',
    cadence: 'on_pr',
    dataset: 'desktop-pr-review-fixtures',
    scorer: 'rubric.completeness-v2',
    targetFlow: 'dev-orchestrator.pr-review',
    cases: 48,
    passRatePct: 96,
    regressionCount: 0,
    avgCostUsd: 0.42,
    lastRunAt: '2026-05-04T19:22:00.000Z',
    notes: ['Catches missing tests', 'Scores severity accuracy', 'Runs on changed desktop packages'],
  },
  {
    id: 'eval-trigger-routing',
    name: 'Trigger routing contracts',
    status: 'regressed',
    cadence: 'nightly',
    dataset: 'trigger-provider-contracts',
    scorer: 'schema.route-match',
    targetFlow: 'triggers.dispatch',
    cases: 62,
    passRatePct: 87,
    regressionCount: 3,
    avgCostUsd: 0.28,
    lastRunAt: '2026-05-04T03:00:00.000Z',
    notes: ['Webhook payload mismatch', 'Teams auth refresh edge case', 'Cron timezone fixture failed'],
  },
  {
    id: 'eval-clinic-triage',
    name: 'Clinic request triage safety',
    status: 'passing',
    cadence: 'manual',
    dataset: 'healthcare-ops-redacted',
    scorer: 'policy.phi-safe-routing',
    targetFlow: 'ops.clinic-request-triage',
    cases: 36,
    passRatePct: 94,
    regressionCount: 0,
    avgCostUsd: 0.51,
    lastRunAt: '2026-05-04T17:30:00.000Z',
    notes: ['No PHI leakage detected', 'Regional routing evidence present'],
  },
  {
    id: 'eval-benchmark-scorer',
    name: 'Benchmark scorer consistency',
    status: 'running',
    cadence: 'nightly',
    dataset: 'multi-provider-implementation-tasks',
    scorer: 'rubric.model-completeness-v1',
    targetFlow: 'quality.model-benchmark',
    cases: 24,
    passRatePct: 79,
    regressionCount: 1,
    avgCostUsd: 1.12,
    lastRunAt: '2026-05-04T19:25:00.000Z',
    notes: ['Validating scoring drift', 'Cursor run still incomplete'],
  },
]

const normalizeEvalSuites = (value: unknown): readonly EvalSuite[] => {
  return Array.isArray(value) ? (value as readonly EvalSuite[]) : EVAL_SUITES_FIXTURE
}

export function useEvals(): EvalsState {
  const [state, setState] = useState<EvalsState>({
    suites: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    sidecarRequest<readonly EvalSuite[]>('evals.list')
      .then((result) => {
        if (!cancelled) {
          setState({ suites: normalizeEvalSuites(result), loading: false, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            suites: EVAL_SUITES_FIXTURE,
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
