// Phase A-3 — OpenRouter coding-agent provider.
// Unlike subprocess-based providers (codex, claude-code, cursor), OpenRouter
// is an HTTP API. This provider drives a single chat completion against
// OpenRouter and returns a `CodingTaskResult` with the model's response in
// `summary`. Real file edits / shell still need a paired CLI runner; this is
// the leg that lets the runtime use OpenRouter as the LLM backend (per #67's
// per-task routing intent).

import type {
  CodingAgentProvider,
  CodingAgentProviderInfo,
  CodingTaskRequest,
  CodingTaskResult,
} from '@agentskit/os-core'

export type OpenRouterFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ status: number; text: () => Promise<string> }>

export type OpenRouterProviderOptions = {
  /** Defaults to `openrouter/auto` so the router picks per the prompt. */
  readonly model?: string
  readonly apiKeyEnv?: string
  readonly apiKey?: string
  readonly baseUrl?: string
  readonly fetchImpl?: OpenRouterFetch
  /** Optional referer + title headers OpenRouter recommends. */
  readonly referer?: string
  readonly appTitle?: string
  readonly infoOverrides?: Partial<CodingAgentProviderInfo>
}

const DEFAULT_MODEL = 'openrouter/auto'
const DEFAULT_BASE = 'https://openrouter.ai/api/v1'
const DEFAULT_API_KEY_ENV = 'OPENROUTER_API_KEY'

const baseInfo = (overrides: OpenRouterProviderOptions | undefined): CodingAgentProviderInfo => ({
  id: 'openrouter',
  displayName: 'OpenRouter',
  capabilities: ['edit_files'],
  invocation: 'http',
  docsUrl: 'https://openrouter.ai/docs',
  requiredKeys: [DEFAULT_API_KEY_ENV],
  ...overrides?.infoOverrides,
})

const resolveApiKey = (opts: OpenRouterProviderOptions | undefined): string | undefined => {
  if (opts?.apiKey !== undefined && opts.apiKey.length > 0) return opts.apiKey
  const envKey = opts?.apiKeyEnv ?? DEFAULT_API_KEY_ENV
  const fromEnv = process.env[envKey]
  return fromEnv !== undefined && fromEnv.length > 0 ? fromEnv : undefined
}

const realFetch: OpenRouterFetch = async (url, init) => {
  const r = await fetch(url, init)
  return { status: r.status, text: async () => r.text() }
}

type OpenRouterChoiceMessage = {
  content?: string
}

type OpenRouterChoice = {
  message?: OpenRouterChoiceMessage
  finish_reason?: string
}

type OpenRouterUsage = {
  prompt_tokens?: number
  completion_tokens?: number
}

type OpenRouterResponse = {
  choices?: OpenRouterChoice[]
  usage?: OpenRouterUsage
}

const makeUnavailableResult = (req: CodingTaskRequest, reason: string): CodingTaskResult => ({
  providerId: 'openrouter',
  status: 'fail',
  files: [],
  shell: [],
  tools: [],
  summary: reason,
  errorCode: 'openrouter.unavailable',
  durationMs: 0,
})

export const createOpenRouterProvider = (opts?: OpenRouterProviderOptions): CodingAgentProvider => {
  const fetchImpl = opts?.fetchImpl ?? realFetch
  const baseUrl = (opts?.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '')
  const model = opts?.model ?? DEFAULT_MODEL

  return {
    info: baseInfo(opts),
    isAvailable: async () => resolveApiKey(opts) !== undefined,
    runTask: async (req: CodingTaskRequest): Promise<CodingTaskResult> => {
      const apiKey = resolveApiKey(opts)
      if (apiKey === undefined) {
        return makeUnavailableResult(req, `OpenRouter API key missing (env ${opts?.apiKeyEnv ?? DEFAULT_API_KEY_ENV})`)
      }
      const started = Date.now()
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      }
      if (opts?.referer !== undefined) headers['HTTP-Referer'] = opts.referer
      if (opts?.appTitle !== undefined) headers['X-Title'] = opts.appTitle
      try {
        const result = await fetchImpl(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: req.prompt }],
            ...(req.timeoutMs !== undefined ? {} : {}),
          }),
        })
        const body = await result.text()
        if (result.status >= 400) {
          return {
            providerId: 'openrouter',
            status: 'fail',
            files: [],
            shell: [],
            tools: [],
            summary: `openrouter http ${result.status}: ${body.slice(0, 400)}`,
            errorCode: 'openrouter.http_error',
            durationMs: Date.now() - started,
          }
        }
        const parsed = JSON.parse(body) as OpenRouterResponse
        const text = parsed.choices?.[0]?.message?.content ?? ''
        return {
          providerId: 'openrouter',
          status: 'ok',
          files: [],
          shell: [],
          tools: [],
          summary: text,
          durationMs: Date.now() - started,
          ...(parsed.usage?.prompt_tokens !== undefined ? { inputTokens: parsed.usage.prompt_tokens } : {}),
          ...(parsed.usage?.completion_tokens !== undefined ? { outputTokens: parsed.usage.completion_tokens } : {}),
        }
      } catch (err) {
        return {
          providerId: 'openrouter',
          status: 'fail',
          files: [],
          shell: [],
          tools: [],
          summary: err instanceof Error ? err.message : String(err),
          errorCode: 'openrouter.exception',
          durationMs: Date.now() - started,
        }
      }
    },
  }
}
