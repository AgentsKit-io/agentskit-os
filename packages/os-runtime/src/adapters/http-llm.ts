// Phase A-2 — generic HTTP LLM adapter for OpenAI-compatible APIs.
// Targets the chat.completions schema, which Anthropic / OpenAI / OpenRouter /
// Groq / Together / Mistral all expose. Pure: caller injects fetch, base url,
// api key. Maps `LlmCall` → request body and the response back to `LlmResult`.

import type { LlmAdapter, LlmCall, LlmResult } from '../adapters.js'

export type HttpFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ status: number; text: () => Promise<string> }>

export type HttpLlmAdapterOpts = {
  /** Adapter id surfaced in traces (e.g. `openrouter`, `anthropic`). */
  readonly id: string
  /** API base URL — must end with the chat-completions endpoint host. */
  readonly baseUrl: string
  /** Path appended to baseUrl; defaults to `/chat/completions`. */
  readonly path?: string
  readonly apiKey: string
  /** Optional auth header name + scheme; defaults to `Authorization: Bearer`. */
  readonly authHeader?: { name: string; scheme: 'Bearer' | 'raw' }
  /** Extra headers (e.g. `OpenAI-Organization`, `HTTP-Referer` for OpenRouter). */
  readonly extraHeaders?: Readonly<Record<string, string>>
  readonly fetchImpl: HttpFetch
}

const DEFAULT_PATH = '/chat/completions'

const buildAuthHeaders = (opts: HttpLlmAdapterOpts): Record<string, string> => {
  const h: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.authHeader !== undefined && opts.authHeader.scheme === 'raw') {
    h[opts.authHeader.name] = opts.apiKey
  } else {
    const name = opts.authHeader?.name ?? 'Authorization'
    h[name] = `Bearer ${opts.apiKey}`
  }
  for (const [k, v] of Object.entries(opts.extraHeaders ?? {})) h[k] = v
  return h
}

const buildBody = (call: LlmCall): string =>
  JSON.stringify({
    model: call.model,
    messages: call.messages.map((m) => ({ role: m.role, content: m.content })),
    ...(call.maxTokens !== undefined ? { max_tokens: call.maxTokens } : {}),
    ...(call.temperature !== undefined ? { temperature: call.temperature } : {}),
    ...(call.stopSequences !== undefined ? { stop: [...call.stopSequences] } : {}),
  })

type ChatChoiceMessage = {
  content?: string
}

type ChatChoice = {
  message?: ChatChoiceMessage
  finish_reason?: string
}

type ChatUsage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

type ChatResponse = {
  choices?: ChatChoice[]
  usage?: ChatUsage
}

const mapFinishReason = (raw: string | undefined): LlmResult['finishReason'] => {
  if (raw === 'stop') return 'stop'
  if (raw === 'length') return 'length'
  if (raw === 'tool_calls') return 'tool_calls'
  if (raw === 'content_filter') return 'content_filter'
  return 'error'
}

const parseResponse = (raw: string): LlmResult => {
  const parsed = JSON.parse(raw) as ChatResponse
  const choice = parsed.choices?.[0]
  return {
    text: choice?.message?.content ?? '',
    finishReason: mapFinishReason(choice?.finish_reason),
    ...(parsed.usage?.prompt_tokens !== undefined ? { inputTokens: parsed.usage.prompt_tokens } : {}),
    ...(parsed.usage?.completion_tokens !== undefined ? { outputTokens: parsed.usage.completion_tokens } : {}),
  }
}

export const createHttpLlmAdapter = (opts: HttpLlmAdapterOpts): LlmAdapter => ({
  id: opts.id,
  invoke: async (call) => {
    const url = `${opts.baseUrl.replace(/\/$/, '')}${opts.path ?? DEFAULT_PATH}`
    const result = await opts.fetchImpl(url, {
      method: 'POST',
      headers: buildAuthHeaders(opts),
      body: buildBody(call),
    })
    const body = await result.text()
    if (result.status >= 400) {
      return {
        text: '',
        finishReason: 'error',
      }
    }
    return parseResponse(body)
  },
})
