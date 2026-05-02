# @agentskit/os-runtime

Handler factories for AgentsKitOS flow execution. Pluggable adapters: `LlmAdapter`, `ToolExecutor`, `HumanReviewer`, `MemoryAdapter`. No AgentsKit dependency in core — implementers plug in.

## Status

Pre-1.0 alpha. M1.

## Quick start

```ts
import { runFlow } from '@agentskit/os-flow'
import { buildLiveHandlers } from '@agentskit/os-runtime'

const handlers = buildLiveHandlers({
  adapters: {
    llm: myAnthropicAdapter,
    tool: myToolExecutor,
    human: mySlackReviewer,
  },
  lookupAgent: (id) => config.agents.find((a) => a.id === id),
})

await runFlow(flow, { handlers, ctx })
```

## License

MIT
