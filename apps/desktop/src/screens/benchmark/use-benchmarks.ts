import { useEffect, useState } from 'react'
import { sidecarRequest } from '../../lib/sidecar'

export type BenchmarkProvider = 'codex' | 'claude' | 'cursor' | 'gemini'
export type BenchmarkStatus = 'complete' | 'running' | 'failed'

export type BenchmarkResult = {
  readonly id: string
  readonly task: string
  readonly provider: BenchmarkProvider
  readonly model: string
  readonly status: BenchmarkStatus
  readonly completenessPct: number
  readonly testsPassedPct: number
  readonly durationMs: number
  readonly costUsd: number
  readonly tokens: number
  readonly completedAt: string
  readonly summary: string
  readonly strengths: readonly string[]
  readonly gaps: readonly string[]
}

type BenchmarksState = {
  readonly results: readonly BenchmarkResult[]
  readonly loading: boolean
  readonly error: string | null
}

export const MOCK_BENCHMARK_RESULTS: readonly BenchmarkResult[] = [
  {
    id: 'bench-onboarding-codex',
    task: 'Implement desktop onboarding tour',
    provider: 'codex',
    model: 'gpt-5.5',
    status: 'complete',
    completenessPct: 96,
    testsPassedPct: 100,
    durationMs: 1_420_000,
    costUsd: 2.84,
    tokens: 147_640,
    completedAt: '2026-05-04T19:13:00.000Z',
    summary: 'Delivered production code, tests, lockfile update, and PR workflow with minimal follow-up.',
    strengths: ['Best end-to-end completion', 'Strong test coverage', 'Handled local dev sidecar edge cases'],
    gaps: ['Bundle size increased after new UI surfaces'],
  },
  {
    id: 'bench-onboarding-claude',
    task: 'Implement desktop onboarding tour',
    provider: 'claude',
    model: 'claude-sonnet-4.6',
    status: 'complete',
    completenessPct: 89,
    testsPassedPct: 94,
    durationMs: 1_760_000,
    costUsd: 3.12,
    tokens: 162_880,
    completedAt: '2026-05-04T19:08:00.000Z',
    summary: 'Produced clean architecture notes and implementation plan, but needed integration fixes.',
    strengths: ['Strong design critique', 'Good accessibility recommendations'],
    gaps: ['Missed runtime fallback behavior', 'Required manual integration pass'],
  },
  {
    id: 'bench-onboarding-gemini',
    task: 'Implement desktop onboarding tour',
    provider: 'gemini',
    model: 'gemini-2.5-pro',
    status: 'complete',
    completenessPct: 84,
    testsPassedPct: 88,
    durationMs: 1_250_000,
    costUsd: 1.94,
    tokens: 138_300,
    completedAt: '2026-05-04T18:58:00.000Z',
    summary: 'Useful broad comparison and edge-case list; implementation needed tightening.',
    strengths: ['Fast planning', 'Good cross-provider comparison'],
    gaps: ['Less precise React integration', 'Missed command palette restart flow'],
  },
  {
    id: 'bench-flow-editor-cursor',
    task: 'Design visual flow editor shell',
    provider: 'cursor',
    model: 'cursor-agent',
    status: 'running',
    completenessPct: 72,
    testsPassedPct: 68,
    durationMs: 980_000,
    costUsd: 1.38,
    tokens: 91_450,
    completedAt: '2026-05-04T19:20:00.000Z',
    summary: 'Still running; early result shows useful repo-aware component mapping.',
    strengths: ['Good local file context', 'Fast refactor sketch'],
    gaps: ['No final verification yet'],
  },
]

const normalizeBenchmarkResults = (value: unknown): readonly BenchmarkResult[] => {
  return Array.isArray(value) ? (value as readonly BenchmarkResult[]) : MOCK_BENCHMARK_RESULTS
}

export function useBenchmarks(): BenchmarksState {
  const [state, setState] = useState<BenchmarksState>({
    results: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    sidecarRequest<unknown>('benchmarks.list')
      .then((result) => {
        if (!cancelled) {
          setState({ results: normalizeBenchmarkResults(result), loading: false, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            results: MOCK_BENCHMARK_RESULTS,
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
