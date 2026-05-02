# @agentskit/os-runtime-agentskit

> AgentsKitOS runtime binding for AgentsKit. Adapts `@agentskit/adapters` to `@agentskit/os-runtime` contracts.

**Distribution:** `public` · **Stability:** `alpha`

Per [ADR-0015](../../docs/adr/0015-agentskit-binding.md), this package provides a thin, pure mapping between AgentsKit's chat-adapter shape and `os-runtime`'s `LlmAdapter` interface. No retry, caching, or auth logic — those live upstream.

## Install

```bash
pnpm add @agentskit/os-runtime-agentskit @agentskit/os-runtime @agentskit/os-core zod
```

## Usage

```ts
import { createAnthropicAdapter } from '@agentskit/adapters'
import { createAgentskitLlmAdapter } from '@agentskit/os-runtime-agentskit'

const llm = createAgentskitLlmAdapter(
  createAnthropicAdapter({ apiKey: process.env.ANTHROPIC_KEY! }),
)

// llm: LlmAdapter — pass to os-runtime's createAgentHandler
```

## Roadmap

- ✅ `createAgentskitLlmAdapter`
- ✅ `createAgentskitToolExecutor` — wraps `@agentskit/tools`
- ✅ `createAgentskitMemoryAdapter` — wraps `@agentskit/memory`
- ✅ `createAgentskitRegistry` — convenience bundler

## One-liner registry

```ts
import { buildLiveHandlers } from '@agentskit/os-runtime'
import { createAgentskitRegistry } from '@agentskit/os-runtime-agentskit'

const handlers = buildLiveHandlers({
  registry: createAgentskitRegistry({
    llm: anthropicAdapter,
    tools: [webSearch, calculator],
    memory: redisStore,
  }),
})
```
