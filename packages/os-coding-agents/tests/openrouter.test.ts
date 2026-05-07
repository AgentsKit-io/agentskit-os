import { describe, expect, it } from 'vitest'
import { createOpenRouterProvider, type OpenRouterFetch } from '../src/openrouter.js'

const okBody = (text: string) =>
  JSON.stringify({
    choices: [{ message: { content: text }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 12, completion_tokens: 4 },
  })

const fakeReq = () => ({
  kind: 'free-form' as const,
  prompt: 'hello',
  cwd: '/r',
  readScope: ['**/*'],
  writeScope: [],
  granted: ['edit_files' as const],
  timeoutMs: 1000,
  dryRun: true,
})

describe('createOpenRouterProvider (Phase A-3)', () => {
  it('reports unavailable when no API key resolved', async () => {
    const provider = createOpenRouterProvider({
      apiKeyEnv: 'NEVER_SET_OPENROUTER_KEY_FOR_TEST',
      fetchImpl: async () => ({ status: 200, text: async () => '{}' }),
    })
    expect(await provider.isAvailable()).toBe(false)
    const r = await provider.runTask(fakeReq() as never)
    expect(r.status).toBe('fail')
    expect(r.errorCode).toBe('openrouter.unavailable')
  })

  it('returns ok summary on 200', async () => {
    const fetchImpl: OpenRouterFetch = async () => ({
      status: 200,
      text: async () => okBody('here is the diff'),
    })
    const provider = createOpenRouterProvider({ apiKey: 'sk-or-test', fetchImpl })
    const r = await provider.runTask(fakeReq() as never)
    expect(r.status).toBe('ok')
    expect(r.summary).toBe('here is the diff')
    expect(r.inputTokens).toBe(12)
  })

  it('returns http_error on >= 400 status', async () => {
    const fetchImpl: OpenRouterFetch = async () => ({
      status: 500,
      text: async () => 'boom',
    })
    const provider = createOpenRouterProvider({ apiKey: 'sk-or-test', fetchImpl })
    const r = await provider.runTask(fakeReq() as never)
    expect(r.status).toBe('fail')
    expect(r.errorCode).toBe('openrouter.http_error')
  })

  it('uses configurable model + base URL', async () => {
    const seen: string[] = []
    const fetchImpl: OpenRouterFetch = async (url, init) => {
      seen.push(url)
      const body = JSON.parse(init.body) as { model: string }
      seen.push(body.model)
      return { status: 200, text: async () => okBody('') }
    }
    const provider = createOpenRouterProvider({
      apiKey: 'k',
      model: 'anthropic/claude-3.5-sonnet',
      baseUrl: 'https://example.com/v1',
      fetchImpl,
    })
    await provider.runTask(fakeReq() as never)
    expect(seen[0]).toBe('https://example.com/v1/chat/completions')
    expect(seen[1]).toBe('anthropic/claude-3.5-sonnet')
  })
})
