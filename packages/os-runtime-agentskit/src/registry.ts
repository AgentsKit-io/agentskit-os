// ADR-0015 — convenience bundler. Composes the three primitives into
// a single AdapterRegistry suitable for buildLiveHandlers in os-runtime.
// No new behavior; pure delegation.

import type { AdapterRegistry } from '@agentskit/os-runtime'
import {
  createAgentskitLlmAdapter,
  type AgentskitChatAdapter,
  type AgentskitLlmAdapterOptions,
} from './llm-adapter.js'
import {
  createAgentskitToolExecutor,
  type AgentskitTool,
  type AgentskitToolExecutorOptions,
} from './tool-executor.js'
import {
  createAgentskitMemoryAdapter,
  type AgentskitMemoryStore,
  type AgentskitMemoryAdapterOptions,
} from './memory-adapter.js'

export type AgentskitRegistryOptions = {
  readonly llm?: AgentskitChatAdapter
  readonly llmOptions?: AgentskitLlmAdapterOptions
  readonly tools?: readonly AgentskitTool[]
  readonly toolOptions?: AgentskitToolExecutorOptions
  readonly memory?: AgentskitMemoryStore
  readonly memoryOptions?: AgentskitMemoryAdapterOptions
}

export const createAgentskitRegistry = (
  opts: AgentskitRegistryOptions,
): AdapterRegistry => ({
  ...(opts.llm ? { llm: createAgentskitLlmAdapter(opts.llm, opts.llmOptions) } : {}),
  ...(opts.tools ? { tool: createAgentskitToolExecutor(opts.tools, opts.toolOptions) } : {}),
  ...(opts.memory ? { memory: createAgentskitMemoryAdapter(opts.memory, opts.memoryOptions) } : {}),
})
