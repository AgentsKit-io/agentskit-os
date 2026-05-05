import { describe, expect, it, vi } from 'vitest'
import { parseFlowConfig, WebhookTrigger, parseWorkspaceConfig, signWebhookRequest } from '@agentskit/os-core'
import type { AdapterRegistry } from '@agentskit/os-runtime'

import { createHeadlessRunner } from '../src/runner.js'
import { createWebhookServer } from '../src/webhook-server.js'

const workspace = parseWorkspaceConfig({ schemaVersion: 1, id: 'ws', name: 'WS' })

describe('createWebhookServer', () => {
  it('returns 401 when signing enabled but signature missing', async () => {
    const trigger = WebhookTrigger.parse({
      id: 't1',
      name: 't1',
      enabled: true,
      flow: 'f1',
      tags: [],
      kind: 'webhook',
      path: '/in',
      method: 'POST',
      secret: 's',
      signing: {},
    })

    const runFlow = vi.fn().mockResolvedValue({
      status: 'completed',
      outcomes: new Map(),
      reason: undefined,
      flowId: 'f1',
      runId: 'r1',
      workspaceId: workspace.id,
      mode: 'real',
    })

    const server = createWebhookServer({ triggers: [trigger], runner: { runFlow } as any })
    const addr = await server.listen()
    const res = await fetch(`http://${addr.host}:${addr.port}/in`, { method: 'POST', body: '{}' })
    expect(res.status).toBe(401)
    expect(runFlow).not.toHaveBeenCalled()
    await server.close()
  })

  it('accepts valid signature and calls runner', async () => {
    const trigger = WebhookTrigger.parse({
      id: 't1',
      name: 't1',
      enabled: true,
      flow: 'f1',
      tags: [],
      kind: 'webhook',
      path: '/in',
      method: 'POST',
      secret: 's',
      signing: { toleranceSeconds: 0 },
    })

    const runFlow = vi.fn().mockResolvedValue({
      status: 'completed',
      outcomes: new Map(),
      reason: undefined,
      flowId: 'f1',
      runId: 'r1',
      workspaceId: workspace.id,
      mode: 'real',
    })

    const server = createWebhookServer({ triggers: [trigger], runner: { runFlow } as any })
    const addr = await server.listen()

    const body = '{"ok":true}'
    const timestamp = '10'
    const signed = signWebhookRequest({ secret: 's', body, timestamp, config: trigger.signing })

    const res = await fetch(`http://${addr.host}:${addr.port}/in`, {
      method: 'POST',
      body,
      headers: signed.headers,
    })

    expect(res.status).toBe(200)
    expect(runFlow).toHaveBeenCalledOnce()
    await server.close()
  })

  it('runs a workspace flow through createHeadlessRunner after verified POST', async () => {
    const ws = parseWorkspaceConfig({
      schemaVersion: 1,
      id: 'ws-hook',
      name: 'WS',
    })
    const tinyFlow = parseFlowConfig({
      id: 'tiny-hook',
      name: 'Tiny',
      entry: 'cond',
      nodes: [
        { id: 'cond', kind: 'condition', expression: 'true' },
        { id: 'noop', kind: 'tool', tool: 'noop' },
      ],
      edges: [{ from: 'cond', to: 'noop', on: 'true' }],
    })
    const adapters: AdapterRegistry = {
      tool: {
        knows: (id) => id === 'noop',
        invoke: async () => ({ kind: 'ok', value: null }),
      },
    }
    const runner = createHeadlessRunner({
      config: ws,
      flows: new Map([['tiny-hook', tinyFlow]]),
      adapters,
    })

    const trigger = WebhookTrigger.parse({
      id: 't1',
      name: 't1',
      enabled: true,
      flow: 'tiny-hook',
      tags: [],
      kind: 'webhook',
      path: '/hook',
      method: 'POST',
      secret: 's',
      signing: { toleranceSeconds: 0 },
    })

    const server = createWebhookServer({ triggers: [trigger], runner })
    const addr = await server.listen()
    const body = '{}'
    const signed = signWebhookRequest({ secret: 's', body, timestamp: '20', config: trigger.signing })
    const res = await fetch(`http://${addr.host}:${addr.port}/hook`, {
      method: 'POST',
      body,
      headers: signed.headers,
    })
    expect(res.status).toBe(200)
    const jsonBody = (await res.json()) as { status: string; runId: string; flowId: string }
    expect(jsonBody.flowId).toBe('tiny-hook')
    expect(['completed', 'skipped']).toContain(jsonBody.status)
    await server.close()
    await runner.dispose()
  })
})

