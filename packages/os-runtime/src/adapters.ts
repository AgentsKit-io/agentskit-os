// Pure adapter interfaces. AgentsKit packages plug in by implementing.
// os-runtime never imports AgentsKit directly — keeps ADR-0002 strict.

import type { RunContext } from '@agentskit/os-core'

export type LlmCall = {
  readonly system: string
  readonly model: string
  readonly messages: ReadonlyArray<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }>
  readonly maxTokens?: number
  readonly temperature?: number
  readonly stopSequences?: readonly string[]
}

export type LlmResult = {
  readonly text: string
  readonly finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error'
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly costUsd?: number
}

export interface LlmAdapter {
  readonly id: string
  invoke(call: LlmCall, ctx: RunContext): Promise<LlmResult>
}

export type ToolCall = {
  readonly toolId: string
  readonly args: Record<string, unknown>
}

export type ToolResult =
  | { kind: 'ok'; value: unknown }
  | { kind: 'error'; code: string; message: string }

export interface ToolExecutor {
  invoke(call: ToolCall, ctx: RunContext): Promise<ToolResult>
  knows(toolId: string): boolean
}

export interface MemoryAdapter {
  readonly id: string
  read(ref: string, ctx: RunContext): Promise<unknown>
  write(ref: string, value: unknown, ctx: RunContext): Promise<void>
}

export interface HumanReviewer {
  request(prompt: string, approvers: readonly string[], ctx: RunContext): Promise<{
    decision: 'approved' | 'rejected'
    note?: string
  } | { decision: 'pending'; ticketId: string }>
}

export type AdapterRegistry = {
  readonly llm?: LlmAdapter
  readonly tool?: ToolExecutor
  readonly memory?: MemoryAdapter
  readonly human?: HumanReviewer
}
