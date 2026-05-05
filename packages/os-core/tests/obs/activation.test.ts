import { describe, expect, it } from 'vitest'
import {
  ActivationEvent,
  buildActivationFunnel,
  buildRetentionCohorts,
  decideEmitActivation,
  parseActivationEvent,
} from '../../src/obs/activation.js'

const installA = '11111111-1111-4111-8111-111111111111'
const installB = '22222222-2222-4222-8222-222222222222'
const installC = '33333333-3333-4333-8333-333333333333'
const wsHash = 'a'.repeat(32)

const event = (
  installId: string,
  kind: ActivationEvent['kind'],
  at: string,
  extra: Partial<ActivationEvent> = {},
): ActivationEvent => ({
  installId,
  kind,
  at,
  workspaceIdHash: wsHash,
  ...extra,
})

describe('decideEmitActivation', () => {
  it('drops when consent is unset', () => {
    expect(decideEmitActivation({ state: 'unset' })).toBe('drop')
  })
  it('drops when consent is disabled', () => {
    expect(decideEmitActivation({ state: 'disabled' })).toBe('drop')
  })
  it('emits when consent is enabled', () => {
    expect(decideEmitActivation({ state: 'enabled' })).toBe('emit')
  })
})

describe('parseActivationEvent', () => {
  it('rejects raw workspace ids (must be a hex digest)', () => {
    expect(() =>
      parseActivationEvent({
        kind: 'workspace.created',
        at: '2026-01-01T00:00:00.000Z',
        installId: installA,
        workspaceIdHash: 'plain-text-id',
      }),
    ).toThrow()
  })

  it('accepts a 32-char hex digest', () => {
    const parsed = parseActivationEvent({
      kind: 'workspace.created',
      at: '2026-01-01T00:00:00.000Z',
      installId: installA,
      workspaceIdHash: wsHash,
    })
    expect(parsed.kind).toBe('workspace.created')
  })
})

describe('buildActivationFunnel', () => {
  it('reports zero installs at every stage when there are no events', () => {
    const funnel = buildActivationFunnel([])
    expect(funnel.every((stage) => stage.installs === 0)).toBe(true)
    expect(funnel.map((s) => s.stage)).toEqual([
      'workspace.created',
      'workspace.first_agent_created',
      'workspace.first_provider_connected',
      'workspace.first_run_succeeded',
      'workspace.first_pr_generated',
    ])
  })

  it('counts distinct installs per stage', () => {
    const events = [
      event(installA, 'workspace.created', '2026-01-01T00:00:00.000Z'),
      event(installB, 'workspace.created', '2026-01-01T01:00:00.000Z'),
      event(installA, 'workspace.first_agent_created', '2026-01-02T00:00:00.000Z'),
      event(installA, 'workspace.first_provider_connected', '2026-01-03T00:00:00.000Z'),
      event(installA, 'workspace.first_provider_connected', '2026-01-04T00:00:00.000Z'),
      event(installA, 'workspace.first_run_succeeded', '2026-01-05T00:00:00.000Z'),
    ]
    const funnel = buildActivationFunnel(events)
    expect(funnel.find((s) => s.stage === 'workspace.created')?.installs).toBe(2)
    expect(funnel.find((s) => s.stage === 'workspace.first_agent_created')?.installs).toBe(1)
    expect(funnel.find((s) => s.stage === 'workspace.first_provider_connected')?.installs).toBe(1)
    expect(funnel.find((s) => s.stage === 'workspace.first_run_succeeded')?.installs).toBe(1)
    expect(funnel.find((s) => s.stage === 'workspace.first_pr_generated')?.installs).toBe(0)
  })
})

describe('buildRetentionCohorts', () => {
  it('returns no cohorts when there are no creates', () => {
    const cohorts = buildRetentionCohorts({
      activations: [],
      repeatRuns: [],
      horizonWeeks: 4,
    })
    expect(cohorts).toEqual([])
  })

  it('groups installs by their first workspace.created date', () => {
    const activations: readonly ActivationEvent[] = [
      event(installA, 'workspace.created', '2026-01-01T00:00:00.000Z'),
      event(installB, 'workspace.created', '2026-01-01T12:00:00.000Z'),
      event(installC, 'workspace.created', '2026-01-08T00:00:00.000Z'),
    ]
    const cohorts = buildRetentionCohorts({
      activations,
      repeatRuns: [],
      horizonWeeks: 1,
    })
    expect(cohorts).toEqual([
      { cohortDate: '2026-01-01', size: 2, retentionByWeek: { w0: 0, w1: 0 } },
      { cohortDate: '2026-01-08', size: 1, retentionByWeek: { w0: 0, w1: 0 } },
    ])
  })

  it('counts repeat runs in the correct weekly bucket', () => {
    const activations: readonly ActivationEvent[] = [
      event(installA, 'workspace.created', '2026-01-01T00:00:00.000Z'),
      event(installB, 'workspace.created', '2026-01-01T00:00:00.000Z'),
    ]
    const repeatRuns: readonly ActivationEvent[] = [
      event(installA, 'workspace.repeat_run', '2026-01-02T00:00:00.000Z'),
      event(installA, 'workspace.repeat_run', '2026-01-09T00:00:00.000Z'),
      event(installB, 'workspace.repeat_run', '2026-01-15T00:00:00.000Z'),
    ]
    const cohorts = buildRetentionCohorts({
      activations,
      repeatRuns,
      horizonWeeks: 3,
    })
    expect(cohorts).toEqual([
      {
        cohortDate: '2026-01-01',
        size: 2,
        retentionByWeek: { w0: 1, w1: 1, w2: 1, w3: 0 },
      },
    ])
  })

  it('clamps the horizon to 26 weeks', () => {
    const activations: readonly ActivationEvent[] = [
      event(installA, 'workspace.created', '2026-01-01T00:00:00.000Z'),
    ]
    const cohorts = buildRetentionCohorts({
      activations,
      repeatRuns: [],
      horizonWeeks: 999,
    })
    expect(Object.keys(cohorts[0]!.retentionByWeek).length).toBe(27)
  })
})
