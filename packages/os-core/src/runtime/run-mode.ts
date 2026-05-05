// Per ADR-0009. Pure types + transition policy. No I/O.

import { z } from 'zod'

export const RUN_MODES = ['real', 'preview', 'dry_run', 'replay', 'simulate', 'deterministic'] as const
export type RunMode = (typeof RUN_MODES)[number]
export const RunMode = z.enum(RUN_MODES)

export type RunModePolicy = {
  readonly llm: 'live' | 'mocked' | 'event-log' | 'live-pinned'
  readonly sideEffects: 'all' | 'read-only' | 'none' | 'event-log' | 'mocked' | 'stubbed'
  readonly persistState: boolean
  readonly chargeCost: boolean
}

export const RUN_MODE_POLICY: Readonly<Record<RunMode, RunModePolicy>> = {
  real: { llm: 'live', sideEffects: 'all', persistState: true, chargeCost: true },
  preview: { llm: 'live', sideEffects: 'read-only', persistState: true, chargeCost: true },
  dry_run: { llm: 'mocked', sideEffects: 'none', persistState: false, chargeCost: false },
  replay: { llm: 'event-log', sideEffects: 'event-log', persistState: false, chargeCost: false },
  simulate: { llm: 'mocked', sideEffects: 'mocked', persistState: false, chargeCost: false },
  deterministic: { llm: 'live-pinned', sideEffects: 'stubbed', persistState: true, chargeCost: true },
}

export type EscalationRule = 'allowed' | 'allowed-with-hitl' | 'forbidden-must-branch' | 'forbidden-must-reauthor' | 'forbidden-must-demote'

export const escalationRule = (from: RunMode, to: RunMode): EscalationRule => {
  if (from === to) return 'allowed'
  if (from === 'dry_run' && to === 'real') return 'allowed'
  if (from === 'preview' && to === 'real') return 'allowed-with-hitl'
  if (from === 'replay' && to === 'real') return 'forbidden-must-branch'
  if (from === 'simulate' && to === 'real') return 'forbidden-must-reauthor'
  if (from === 'deterministic' && to === 'real') return 'forbidden-must-demote'
  if (to === 'dry_run' || to === 'preview' || to === 'simulate' || to === 'replay') return 'allowed'
  return 'allowed'
}

export type DeterminismIssue = {
  readonly path: readonly (string | number)[]
  readonly code:
    | 'non_zero_temperature'
    | 'unpinned_model'
    | 'missing_stub'
    | 'uncontrolled_randomness'
  readonly message: string
}

export type DeterminismCheckInput = {
  readonly agents: ReadonlyArray<{
    id: string
    model: { provider: string; model: string; temperature: number | undefined }
  }> | undefined
  readonly tools: ReadonlyArray<{ id: string; deterministicStub: boolean | undefined }> | undefined
  readonly randomnessSources: ReadonlyArray<string> | undefined
}

const DETERMINISTIC_PINNED = /[-@](\d+(\.\d+)+|\d{4}-\d{2}-\d{2}|v\d+)/

export const checkDeterminism = (input: DeterminismCheckInput): readonly DeterminismIssue[] => {
  const issues: DeterminismIssue[] = []
  const agents = input.agents !== undefined ? input.agents : []
  const tools = input.tools !== undefined ? input.tools : []
  const randomness = input.randomnessSources !== undefined ? input.randomnessSources : []

  agents.forEach((a, i) => {
    const t = a.model.temperature !== undefined ? a.model.temperature : 0
    if (t !== 0) {
      issues.push({
        path: ['agents', i, 'model', 'temperature'],
        code: 'non_zero_temperature',
        message: `agent "${a.id}" uses temperature ${t}; deterministic mode requires 0`,
      })
    }
    if (!DETERMINISTIC_PINNED.test(a.model.model)) {
      issues.push({
        path: ['agents', i, 'model', 'model'],
        code: 'unpinned_model',
        message: `agent "${a.id}" model "${a.model.model}" is not version-pinned`,
      })
    }
  })

  tools.forEach((t, i) => {
    if (t.deterministicStub === false) {
      issues.push({
        path: ['tools', i],
        code: 'missing_stub',
        message: `tool "${t.id}" has no deterministic stub registered`,
      })
    }
  })

  randomness.forEach((src, i) => {
    issues.push({
      path: ['randomnessSources', i],
      code: 'uncontrolled_randomness',
      message: `uncontrolled randomness source "${src}"; inject via clock`,
    })
  })

  return issues
}

export const RunContext = z.object({
  runMode: RunMode,
  workspaceId: z.string().min(1).max(64),
  runId: z.string().min(1).max(64),
  parentRunId: z.string().min(1).max(64).optional(),
  startedAt: z.string().datetime({ offset: true }),
})
export type RunContext = z.infer<typeof RunContext>

export const parseRunContext = (input: unknown): RunContext => RunContext.parse(input)
export const safeParseRunContext = (input: unknown) => RunContext.safeParse(input)

/** Run modes where hosts use stub/skipped handlers instead of live I/O (ADR-0009). */
export const STUB_RUN_MODES = ['dry_run', 'simulate', 'replay', 'preview'] as const
export type StubRunMode = (typeof STUB_RUN_MODES)[number]

export const isStubRunMode = (mode: RunMode): mode is StubRunMode =>
  (STUB_RUN_MODES as readonly string[]).includes(mode)

/** Default `run_*` id generator shared by CLI and headless runners. */
export const createDefaultRunId = (): string => {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 8)
  return `run_${t}_${r}`
}
