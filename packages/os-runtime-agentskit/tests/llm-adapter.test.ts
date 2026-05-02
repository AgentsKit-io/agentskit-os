import { describe, expect, it } from 'vitest'
import { parseRunContext } from '@agentskit/os-core'
import type { LlmCall } from '@agentskit/os-runtime'
import {
  createAgentskitLlmAdapter,
  type AgentskitChatAdapter,
  type AgentskitChatRequest,
  type AgentskitChatResponse,
} from '../src/index.js'

const ctx = parseRunContext({
  runMode: 'real',
  workspaceId: 'team-a',
  runId: 'run_1',
  startedAt: '2026-05-01T00:00:00.000Z',
})

const baseCall: LlmCall = {
  system: 'You are a critic.',
  model: 'claude-opus-4-7',
  messages: [
    { role: 'user', content: 'rate this haiku' },
  ],
}

const fakeAdapter = (
  res: AgentskitChatResponse,
  capture?: { req?: AgentskitChatRequest },
): AgentskitChatAdapter => ({
  id: 'fake',
  chat: async (req) => {
    if (capture) capture.req = req
    return res
  },
})

describe('createAgentskitLlmAdapter', () => {
  it('prefixes id with agentskit:<source-id>', () => {
    const a = createAgentskitLlmAdapter(fakeAdapter({ text: '' }))
    expect(a.id).toBe('agentskit:fake')
  })

  it('honors id override', () => {
    const a = createAgentskitLlmAdapter(fakeAdapter({ text: '' }), { id: 'custom' })
    expect(a.id).toBe('custom')
  })

  it('forwards system/model/messages', async () => {
    const cap: { req?: AgentskitChatRequest } = {}
    const a = createAgentskitLlmAdapter(fakeAdapter({ text: 'ok' }, cap))
    await a.invoke(baseCall, ctx)
    expect(cap.req?.system).toBe('You are a critic.')
    expect(cap.req?.model).toBe('claude-opus-4-7')
    expect(cap.req?.messages.length).toBe(1)
  })

  it('omits optional fields when LlmCall omits them', async () => {
    const cap: { req?: AgentskitChatRequest } = {}
    const a = createAgentskitLlmAdapter(fakeAdapter({ text: 'ok' }, cap))
    await a.invoke(baseCall, ctx)
    expect(cap.req).not.toHaveProperty('maxTokens')
    expect(cap.req).not.toHaveProperty('temperature')
    expect(cap.req).not.toHaveProperty('stopSequences')
  })

  it('forwards optional fields when present', async () => {
    const cap: { req?: AgentskitChatRequest } = {}
    const a = createAgentskitLlmAdapter(fakeAdapter({ text: 'ok' }, cap))
    await a.invoke({
      ...baseCall,
      maxTokens: 256,
      temperature: 0.2,
      stopSequences: ['\n\n'],
    }, ctx)
    expect(cap.req?.maxTokens).toBe(256)
    expect(cap.req?.temperature).toBe(0.2)
    expect(cap.req?.stopSequences).toEqual(['\n\n'])
  })

  it('omits system field when LlmCall.system is empty', async () => {
    const cap: { req?: AgentskitChatRequest } = {}
    const a = createAgentskitLlmAdapter(fakeAdapter({ text: 'ok' }, cap))
    await a.invoke({ ...baseCall, system: '' }, ctx)
    expect(cap.req).not.toHaveProperty('system')
  })

  it('returns text + finishReason from response', async () => {
    const a = createAgentskitLlmAdapter(
      fakeAdapter({ text: 'hello', finishReason: 'length' }),
    )
    const r = await a.invoke(baseCall, ctx)
    expect(r.text).toBe('hello')
    expect(r.finishReason).toBe('length')
  })

  it('falls back to "stop" when adapter omits finishReason', async () => {
    const a = createAgentskitLlmAdapter(fakeAdapter({ text: 'hello' }))
    const r = await a.invoke(baseCall, ctx)
    expect(r.finishReason).toBe('stop')
  })

  it('honors defaultFinishReason override', async () => {
    const a = createAgentskitLlmAdapter(
      fakeAdapter({ text: 'hello' }),
      { defaultFinishReason: 'error' },
    )
    const r = await a.invoke(baseCall, ctx)
    expect(r.finishReason).toBe('error')
  })

  it('passes through usage tokens + cost', async () => {
    const a = createAgentskitLlmAdapter(
      fakeAdapter({
        text: 'hi',
        usage: { inputTokens: 10, outputTokens: 4, costUsd: 0.0002 },
      }),
    )
    const r = await a.invoke(baseCall, ctx)
    expect(r.inputTokens).toBe(10)
    expect(r.outputTokens).toBe(4)
    expect(r.costUsd).toBe(0.0002)
  })

  it('omits cost fields when adapter omits usage', async () => {
    const a = createAgentskitLlmAdapter(fakeAdapter({ text: 'hi' }))
    const r = await a.invoke(baseCall, ctx)
    expect(r).not.toHaveProperty('inputTokens')
    expect(r).not.toHaveProperty('outputTokens')
    expect(r).not.toHaveProperty('costUsd')
  })

  it('omits unset usage subfields independently', async () => {
    const a = createAgentskitLlmAdapter(
      fakeAdapter({ text: 'hi', usage: { inputTokens: 5 } }),
    )
    const r = await a.invoke(baseCall, ctx)
    expect(r.inputTokens).toBe(5)
    expect(r).not.toHaveProperty('outputTokens')
    expect(r).not.toHaveProperty('costUsd')
  })

  it('propagates adapter rejection', async () => {
    const broken: AgentskitChatAdapter = {
      id: 'broken',
      chat: async () => { throw new Error('boom') },
    }
    const a = createAgentskitLlmAdapter(broken)
    await expect(a.invoke(baseCall, ctx)).rejects.toThrow('boom')
  })
})
