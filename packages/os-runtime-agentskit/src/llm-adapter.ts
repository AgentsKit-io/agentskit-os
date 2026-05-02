// ADR-0015 — pure mapping from AgentsKit's chat adapter contract to
// os-runtime's LlmAdapter. No retry, no caching, no auth — those live
// upstream. This file is structural-typed so we don't import AgentsKit
// at build time; the binding type matches @agentskit/adapters' public
// shape and will tighten when AgentsKit reaches a stable version pin.

import type { LlmAdapter, LlmCall, LlmResult } from '@agentskit/os-runtime'

export type AgentskitMessage = {
  readonly role: 'system' | 'user' | 'assistant' | 'tool'
  readonly content: string
}

export type AgentskitChatRequest = {
  readonly model: string
  readonly system?: string
  readonly messages: readonly AgentskitMessage[]
  readonly maxTokens?: number
  readonly temperature?: number
  readonly stopSequences?: readonly string[]
}

export type AgentskitUsage = {
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly costUsd?: number
}

export type AgentskitChatResponse = {
  readonly text: string
  readonly finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error'
  readonly usage?: AgentskitUsage
}

export interface AgentskitChatAdapter {
  readonly id: string
  chat(req: AgentskitChatRequest): Promise<AgentskitChatResponse>
}

export type AgentskitLlmAdapterOptions = {
  readonly id?: string
  readonly defaultFinishReason?: LlmResult['finishReason']
}

const DEFAULT_FINISH: LlmResult['finishReason'] = 'stop'

export const createAgentskitLlmAdapter = (
  source: AgentskitChatAdapter,
  opts: AgentskitLlmAdapterOptions = {},
): LlmAdapter => {
  const id = opts.id ?? `agentskit:${source.id}`
  const fallbackFinish = opts.defaultFinishReason ?? DEFAULT_FINISH
  return {
    id,
    invoke: async (call: LlmCall): Promise<LlmResult> => {
      const req: AgentskitChatRequest = {
        model: call.model,
        ...(call.system ? { system: call.system } : {}),
        messages: call.messages,
        ...(call.maxTokens !== undefined ? { maxTokens: call.maxTokens } : {}),
        ...(call.temperature !== undefined ? { temperature: call.temperature } : {}),
        ...(call.stopSequences !== undefined ? { stopSequences: call.stopSequences } : {}),
      }
      const res = await source.chat(req)
      const usage = res.usage
      return {
        text: res.text,
        finishReason: res.finishReason ?? fallbackFinish,
        ...(usage?.inputTokens !== undefined ? { inputTokens: usage.inputTokens } : {}),
        ...(usage?.outputTokens !== undefined ? { outputTokens: usage.outputTokens } : {}),
        ...(usage?.costUsd !== undefined ? { costUsd: usage.costUsd } : {}),
      }
    },
  }
}
