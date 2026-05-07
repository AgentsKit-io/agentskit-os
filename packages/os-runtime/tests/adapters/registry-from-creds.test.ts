import { describe, expect, it } from 'vitest'
import {
  buildAdapterRegistryFromCreds,
  type HttpFetch,
} from '../../src/index.js'

const mockResponse = (body: unknown, status = 200) => ({
  status,
  text: async () => JSON.stringify(body),
})

const ctx = (): import('@agentskit/os-core').RunContext =>
  ({
    workspaceId: 'ws',
    runId: 'r',
    traceId: 't',
    mode: 'live',
  }) as never

describe('buildAdapterRegistryFromCreds (Phase A-2)', () => {
  it('routes anthropic system → x-api-key auth header', async () => {
    const calls: { url: string; headers: Record<string, string>; body: string }[] = []
    const fetchImpl: HttpFetch = async (url, init) => {
      calls.push({ url, headers: init.headers, body: init.body })
      return mockResponse({
        choices: [{ message: { content: 'hi' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 4, completion_tokens: 1 },
      })
    }
    const reg = buildAdapterRegistryFromCreds({
      secrets: { ANTHROPIC_API_KEY: 'sk-ant-test' },
      fetchImpl,
    })
    const r = await reg.llm!.invoke({
      system: 'anthropic',
      model: 'claude-opus-4-7',
      messages: [{ role: 'user', content: 'hello' }],
    }, ctx())
    expect(r.text).toBe('hi')
    expect(r.inputTokens).toBe(4)
    expect(calls[0]!.headers['x-api-key']).toBe('sk-ant-test')
    expect(calls[0]!.headers['anthropic-version']).toBe('2023-06-01')
  })

  it('routes openrouter system → bearer auth + openrouter base url', async () => {
    const seen: string[] = []
    const fetchImpl: HttpFetch = async (url, init) => {
      seen.push(url)
      return mockResponse({
        choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
      })
    }
    const reg = buildAdapterRegistryFromCreds({
      secrets: { OPENROUTER_API_KEY: 'sk-or-test' },
      fetchImpl,
    })
    await reg.llm!.invoke({
      system: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
      messages: [{ role: 'user', content: 'hi' }],
    }, ctx())
    expect(seen[0]).toContain('openrouter.ai')
  })

  it('throws when system has no matching adapter', async () => {
    const reg = buildAdapterRegistryFromCreds({
      secrets: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => mockResponse({}),
    })
    await expect(
      reg.llm!.invoke({
        system: 'cohere',
        model: 'command',
        messages: [{ role: 'user', content: '?' }],
      }, ctx()),
    ).rejects.toThrow(/no LLM adapter registered/)
  })

  it('returns finish_reason=error on http >= 400', async () => {
    const reg = buildAdapterRegistryFromCreds({
      secrets: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: async () => mockResponse({ error: 'boom' }, 500),
    })
    const r = await reg.llm!.invoke({
      system: 'openai',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: '?' }],
    }, ctx())
    expect(r.finishReason).toBe('error')
  })
})
