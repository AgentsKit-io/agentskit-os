import { describe, expect, it } from 'vitest'
import { parseFlowConfig, parseRunContext } from '@agentskit/os-core'
import {
  applyModeStubs,
  runFlow,
  validateDeterministicFlow,
  type NodeHandlerMap,
} from '../src/index.js'

const flowWithToolAndAgent = parseFlowConfig({
  id: 'f',
  name: 'F',
  entry: 'a',
  nodes: [
    { id: 'a', kind: 'tool', tool: 'echo' },
    { id: 'b', kind: 'agent', agent: 'researcher' },
  ],
  edges: [{ from: 'a', to: 'b' }],
})

const ctxOf = (runMode: 'real' | 'preview' | 'dry_run' | 'replay' | 'simulate' | 'deterministic') =>
  parseRunContext({
    runMode,
    workspaceId: 'team-a',
    runId: `run_${runMode}`,
    startedAt: '2026-05-03T00:00:00.000Z',
  })

const liveTool: NodeHandlerMap = {
  tool: async () => ({ kind: 'ok', value: 'live' }),
}

describe('applyModeStubs', () => {
  it('passes handlers through unchanged in real mode', () => {
    const out = applyModeStubs(liveTool, 'real')
    expect(out).toBe(liveTool)
  })

  it('passes handlers through unchanged in deterministic mode', () => {
    const out = applyModeStubs(liveTool, 'deterministic')
    expect(out).toBe(liveTool)
  })

  it('fills missing handler kinds in dry_run with skipped stubs', () => {
    const out = applyModeStubs(liveTool, 'dry_run')
    expect(out.tool).toBe(liveTool.tool)
    expect(out.agent).toBeDefined()
    expect(out.human).toBeDefined()
    expect(out.compare).toBeDefined()
  })

  it('user handler wins over default stub', async () => {
    const handlers: NodeHandlerMap = {
      tool: async () => ({ kind: 'ok', value: 'mine' }),
    }
    const out = applyModeStubs(handlers, 'replay')
    const outcome = await out.tool!(
      { id: 'a', kind: 'tool', tool: 'x' },
      undefined,
      ctxOf('replay'),
    )
    expect(outcome).toEqual({ kind: 'ok', value: 'mine' })
  })
})

describe('runFlow with run modes', () => {
  it('skips agent node automatically in dry_run when only tool handler is provided', async () => {
    const r = await runFlow(flowWithToolAndAgent, {
      handlers: liveTool,
      ctx: ctxOf('dry_run'),
    })
    expect(r.status).toBe('completed')
    expect(r.outcomes.get('b')).toEqual({ kind: 'skipped', reason: 'dry_run' })
  })

  it('fails in real mode when a handler is missing', async () => {
    const r = await runFlow(flowWithToolAndAgent, {
      handlers: liveTool,
      ctx: ctxOf('real'),
    })
    expect(r.status).toBe('failed')
    expect(r.stoppedAt).toBe('b')
    expect(r.reason).toBe('flow.handler_missing')
  })

  it('rejects deterministic run when registry is missing entries', async () => {
    const r = await runFlow(flowWithToolAndAgent, {
      handlers: {
        tool: async () => ({ kind: 'ok', value: null }),
        agent: async () => ({ kind: 'ok', value: null }),
      },
      ctx: ctxOf('deterministic'),
    })
    expect(r.status).toBe('failed')
    expect(r.reason).toMatch(/^flow\.determinism_violation:/)
  })

  it('runs deterministic when registry is well-formed', async () => {
    const r = await runFlow(flowWithToolAndAgent, {
      handlers: {
        tool: async () => ({ kind: 'ok', value: null }),
        agent: async () => ({ kind: 'ok', value: null }),
      },
      ctx: ctxOf('deterministic'),
      deterministic: {
        agents: [
          {
            id: 'researcher',
            model: { provider: 'anthropic', model: 'claude-3-7-sonnet-2026-01-15', temperature: 0 },
          },
        ],
        tools: [{ id: 'echo', deterministicStub: true }],
      },
    })
    expect(r.status).toBe('completed')
  })

  it('reports deterministic violation for non-zero temperature', async () => {
    const r = await runFlow(flowWithToolAndAgent, {
      handlers: {
        tool: async () => ({ kind: 'ok', value: null }),
        agent: async () => ({ kind: 'ok', value: null }),
      },
      ctx: ctxOf('deterministic'),
      deterministic: {
        agents: [
          {
            id: 'researcher',
            model: { provider: 'anthropic', model: 'claude-3-7-sonnet-2026-01-15', temperature: 0.7 },
          },
        ],
        tools: [{ id: 'echo', deterministicStub: true }],
      },
    })
    expect(r.status).toBe('failed')
    expect(r.reason).toContain('non_zero_temperature')
  })
})

describe('validateDeterministicFlow', () => {
  it('reports missing agent registry entries', () => {
    const issues = validateDeterministicFlow({ flow: flowWithToolAndAgent })
    const codes = issues.map((i) => i.code)
    expect(codes).toContain('unpinned_model')
    expect(codes).toContain('missing_stub')
  })

  it('passes when registry is complete', () => {
    const issues = validateDeterministicFlow({
      flow: flowWithToolAndAgent,
      agents: [
        {
          id: 'researcher',
          model: { provider: 'anthropic', model: 'claude-3-7-sonnet-2026-01-15', temperature: 0 },
        },
      ],
      tools: [{ id: 'echo', deterministicStub: true }],
    })
    expect(issues).toEqual([])
  })
})
