# @agentskit/os-flow

DAG executor for AgentsKitOS flow configs. Pure async, run-mode aware, durable via checkpoint callback.

## Install (when published)

```bash
pnpm add @agentskit/os-flow @agentskit/os-core
```

## Quick start

```ts
import { parseFlowConfig, parseRunContext } from '@agentskit/os-core'
import { runFlow } from '@agentskit/os-flow'

const flow = parseFlowConfig({ /* ... */ })
const ctx = parseRunContext({ /* ... */ })

const result = await runFlow(flow, {
  handlers: { tool: async (n) => ({ kind: 'ok', value: 'done' }) },
  ctx,
  checkpoint: async (id, outcome) => savedToDb(id, outcome),
  onEvent: (e) => console.log(e),
})
```

## Status

Pre-1.0 alpha. M1.

## License

MIT
