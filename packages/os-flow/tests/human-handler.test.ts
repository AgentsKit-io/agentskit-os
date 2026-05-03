// Tests for #188 — two-person HITL approval
import { describe, expect, it, vi } from 'vitest'
import { parseFlowConfig, parseRunContext } from '@agentskit/os-core'
import {
  runFlow,
  createHumanHandler,
  type NodeHandlerMap,
  type ApproverGate,
} from '../src/index.js'
import type { HumanNode } from '@agentskit/os-core'

const ctx = parseRunContext({
  runMode: 'real',
  workspaceId: 'team-a',
  runId: 'run_hitl',
  startedAt: '2026-05-02T00:00:00.000Z',
})

const makeFlow = (quorum?: number) =>
  parseFlowConfig({
    id: 'f-hitl',
    name: 'HITL Flow',
    entry: 'approve',
    nodes: [
      {
        id: 'approve',
        kind: 'human',
        prompt: 'Please approve this action.',
        approvers: ['alice', 'bob'],
        ...(quorum != null ? { quorum } : {}),
      },
      { id: 'after', kind: 'tool', tool: 'proceed' },
    ],
    edges: [{ from: 'approve', to: 'after' }],
  })

const afterHandlers: NodeHandlerMap = {
  tool: async () => ({ kind: 'ok', value: 'done' }),
}

describe('createHumanHandler', () => {
  it('1-person approval (default quorum=1): single signer is sufficient', async () => {
    const gate: ApproverGate = vi.fn(async () => ({
      status: 'approved',
      signers: ['alice'],
    }))
    const humanHandler = createHumanHandler({ approverGate: gate })
    const node = makeFlow().nodes[0] as HumanNode
    const outcome = await humanHandler(node, undefined, ctx)
    expect(outcome.kind).toBe('ok')
    expect((outcome as Extract<typeof outcome, { kind: 'ok' }>).value).toMatchObject({
      status: 'approved',
      signers: ['alice'],
    })
    expect(gate).toHaveBeenCalledWith(node, ctx)
  })

  it('2-person quorum required: both signers → approved', async () => {
    const gate: ApproverGate = vi.fn(async () => ({
      status: 'approved',
      signers: ['alice', 'bob'],
    }))
    const humanHandler = createHumanHandler({ approverGate: gate })
    const node = makeFlow(2).nodes[0] as HumanNode
    const outcome = await humanHandler(node, undefined, ctx)
    expect(outcome.kind).toBe('ok')
  })

  it('2-person quorum: only 1 signer → paused', async () => {
    const gate: ApproverGate = vi.fn(async () => ({
      status: 'approved',
      signers: ['alice'], // only 1 — not enough
    }))
    const humanHandler = createHumanHandler({ approverGate: gate })
    const node = makeFlow(2).nodes[0] as HumanNode
    const outcome = await humanHandler(node, undefined, ctx)
    expect(outcome.kind).toBe('paused')
    expect((outcome as Extract<typeof outcome, { kind: 'paused' }>).reason).toBe('hitl')
  })

  it('rejection short-circuits the flow', async () => {
    const gate: ApproverGate = vi.fn(async () => ({
      status: 'rejected',
      signers: ['alice'],
    }))
    const humanHandler = createHumanHandler({ approverGate: gate })
    const flow = makeFlow()
    const handlers: NodeHandlerMap = {
      ...afterHandlers,
      human: humanHandler as NodeHandlerMap['human'],
    }
    const r = await runFlow(flow, { handlers, ctx })
    expect(r.status).toBe('failed')
    expect(r.reason).toBe('os.flow.hitl_quorum_unmet')
    // 'after' node should NOT have run
    expect(r.executedOrder).not.toContain('after')
  })

  it('approved flow continues to downstream nodes', async () => {
    const gate: ApproverGate = vi.fn(async () => ({
      status: 'approved',
      signers: ['alice'],
    }))
    const humanHandler = createHumanHandler({ approverGate: gate })
    const flow = makeFlow()
    const handlers: NodeHandlerMap = {
      ...afterHandlers,
      human: humanHandler as NodeHandlerMap['human'],
    }
    const r = await runFlow(flow, { handlers, ctx })
    expect(r.status).toBe('completed')
    expect(r.executedOrder).toContain('after')
  })

  it('gate throwing returns hitl_quorum_unmet failure', async () => {
    const gate: ApproverGate = vi.fn(async () => {
      throw new Error('gate exploded')
    })
    const humanHandler = createHumanHandler({ approverGate: gate })
    const node = makeFlow().nodes[0] as HumanNode
    const outcome = await humanHandler(node, undefined, ctx)
    expect(outcome.kind).toBe('failed')
    expect((outcome as Extract<typeof outcome, { kind: 'failed' }>).error.code).toBe('os.flow.hitl_quorum_unmet')
  })
})

describe('HumanNode quorum schema', () => {
  it('defaults to quorum=1 when not specified', () => {
    const flow = makeFlow()
    const node = flow.nodes[0] as HumanNode
    expect(node.quorum).toBe(1)
  })

  it('accepts quorum=2', () => {
    const flow = makeFlow(2)
    const node = flow.nodes[0] as HumanNode
    expect(node.quorum).toBe(2)
  })
})
