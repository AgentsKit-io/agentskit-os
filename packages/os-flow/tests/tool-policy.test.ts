import { describe, expect, it, vi } from 'vitest'
import { parseFlowConfig, parseRunContext } from '@agentskit/os-core'
import {
  createPolicyToolHandler,
  InMemoryToolManifestRegistry,
  runFlow,
  type NodeHandlerMap,
  type ToolPolicyDecisionEvent,
} from '../src/index.js'

const flow = parseFlowConfig({
  id: 'f',
  name: 'F',
  entry: 't',
  nodes: [{ id: 't', kind: 'tool', tool: 'echo' }],
  edges: [],
})

const ctxOf = (runMode: 'real' | 'preview' | 'dry_run' | 'replay' | 'simulate' | 'deterministic') =>
  parseRunContext({
    runMode,
    workspaceId: 'w',
    runId: `run_${runMode}`,
    startedAt: '2026-05-03T00:00:00.000Z',
  })

describe('createPolicyToolHandler', () => {
  it('invokes the real handler in real mode for a read-only tool', async () => {
    const registry = new InMemoryToolManifestRegistry([
      { id: 'echo', name: 'echo', sideEffects: ['read'] },
    ])
    const real = vi.fn(async () => ({ kind: 'ok' as const, value: 'ok' }))
    const decisions: ToolPolicyDecisionEvent[] = []
    const handlers: NodeHandlerMap = {
      tool: createPolicyToolHandler({
        registry,
        realHandler: real,
        onDecision: (e) => decisions.push(e),
      }),
    }
    const r = await runFlow(flow, { handlers, ctx: ctxOf('real') })
    expect(r.status).toBe('completed')
    expect(real).toHaveBeenCalledOnce()
    expect(decisions[0]).toMatchObject({ kind: 'allowed', sandbox: 'process' })
  })

  it('blocks a write tool in preview mode', async () => {
    const registry = new InMemoryToolManifestRegistry([
      { id: 'echo', name: 'echo', sideEffects: ['write'] },
    ])
    const real = vi.fn(async () => ({ kind: 'ok' as const, value: 'never' }))
    const decisions: ToolPolicyDecisionEvent[] = []
    const handlers: NodeHandlerMap = {
      tool: createPolicyToolHandler({
        registry,
        realHandler: real,
        onDecision: (e) => decisions.push(e),
      }),
    }
    const r = await runFlow(flow, { handlers, ctx: ctxOf('preview') })
    expect(r.status).toBe('failed')
    expect(r.reason).toBe('os.security.tool_blocked')
    expect(real).not.toHaveBeenCalled()
    expect(decisions[0]).toMatchObject({ kind: 'denied' })
  })

  it('blocks a destructive tool in preview mode', async () => {
    const registry = new InMemoryToolManifestRegistry([
      { id: 'echo', name: 'echo', sideEffects: ['destructive'] },
    ])
    const handlers: NodeHandlerMap = {
      tool: createPolicyToolHandler({
        registry,
        realHandler: async () => ({ kind: 'ok', value: null }),
      }),
    }
    const r = await runFlow(flow, { handlers, ctx: ctxOf('preview') })
    expect(r.status).toBe('failed')
    expect(r.reason).toBe('os.security.tool_blocked')
  })

  it('skips invocation in dry_run mode regardless of declared effects', async () => {
    const registry = new InMemoryToolManifestRegistry([
      { id: 'echo', name: 'echo', sideEffects: ['destructive'] },
    ])
    const real = vi.fn(async () => ({ kind: 'ok' as const, value: null }))
    const handlers: NodeHandlerMap = {
      tool: createPolicyToolHandler({ registry, realHandler: real }),
    }
    const r = await runFlow(flow, { handlers, ctx: ctxOf('dry_run') })
    expect(r.status).toBe('skipped')
    expect(real).not.toHaveBeenCalled()
  })

  it('treats missing manifest as external (most restrictive)', async () => {
    const registry = new InMemoryToolManifestRegistry()
    const decisions: ToolPolicyDecisionEvent[] = []
    const handlers: NodeHandlerMap = {
      tool: createPolicyToolHandler({
        registry,
        realHandler: async () => ({ kind: 'ok', value: null }),
        onDecision: (e) => decisions.push(e),
      }),
    }
    const r = await runFlow(flow, { handlers, ctx: ctxOf('preview') })
    expect(r.status).toBe('failed')
    expect(r.reason).toBe('os.security.tool_blocked')
    expect(decisions[0]).toMatchObject({ kind: 'denied', severity: 'external' })
  })

  it('escalates sandbox when manifest minSandbox exceeds default', async () => {
    const registry = new InMemoryToolManifestRegistry([
      { id: 'echo', name: 'echo', sideEffects: ['read'], minSandbox: 'container' },
    ])
    const decisions: ToolPolicyDecisionEvent[] = []
    const handlers: NodeHandlerMap = {
      tool: createPolicyToolHandler({
        registry,
        realHandler: async () => ({ kind: 'ok', value: null }),
        onDecision: (e) => decisions.push(e),
      }),
    }
    const r = await runFlow(flow, { handlers, ctx: ctxOf('real') })
    expect(r.status).toBe('completed')
    expect(decisions[0]).toMatchObject({ kind: 'allowed', sandbox: 'container' })
  })

  it('rejects when requested sandbox is below minimum without force', async () => {
    const registry = new InMemoryToolManifestRegistry([
      { id: 'echo', name: 'echo', sideEffects: ['destructive'] },
    ])
    const handlers: NodeHandlerMap = {
      tool: createPolicyToolHandler({
        registry,
        realHandler: async () => ({ kind: 'ok', value: null }),
        requestedSandbox: 'process',
      }),
    }
    const r = await runFlow(flow, { handlers, ctx: ctxOf('real') })
    expect(r.status).toBe('failed')
    expect(r.reason).toBe('os.security.sandbox_reject')
  })

  it('respects forceWeakSandbox=true to weaken below the minimum', async () => {
    const registry = new InMemoryToolManifestRegistry([
      { id: 'echo', name: 'echo', sideEffects: ['destructive'] },
    ])
    const decisions: ToolPolicyDecisionEvent[] = []
    const handlers: NodeHandlerMap = {
      tool: createPolicyToolHandler({
        registry,
        realHandler: async () => ({ kind: 'ok', value: null }),
        requestedSandbox: 'process',
        forceWeakSandbox: true,
        onDecision: (e) => decisions.push(e),
      }),
    }
    const r = await runFlow(flow, { handlers, ctx: ctxOf('real') })
    expect(r.status).toBe('completed')
    expect(decisions[0]).toMatchObject({ kind: 'escalated', applied: 'process' })
    expect(decisions[0].reason).toContain('WARN')
  })

  it('mocks tool calls in simulate mode', async () => {
    const registry = new InMemoryToolManifestRegistry([
      { id: 'echo', name: 'echo', sideEffects: ['external'] },
    ])
    const real = vi.fn(async () => ({ kind: 'ok' as const, value: null }))
    const handlers: NodeHandlerMap = {
      tool: createPolicyToolHandler({ registry, realHandler: real }),
    }
    const r = await runFlow(flow, { handlers, ctx: ctxOf('simulate') })
    expect(r.status).toBe('skipped')
    expect(r.outcomes.get('t')).toMatchObject({ kind: 'skipped', reason: 'simulate' })
    expect(real).not.toHaveBeenCalled()
  })
})
