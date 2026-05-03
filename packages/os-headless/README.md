# @agentskit/os-headless

**Distribution tier:** `public` | **Stability:** `alpha` (pre-1.0, API may change)

First-class headless agent runner for AgentsKitOS. Bridge a workspace config and injected adapters to a running agent — no UI required.

## Installation

```bash
pnpm add @agentskit/os-headless
```

## Quickstart

```ts
import { createHeadlessRunner } from '@agentskit/os-headless'
import type { FlowConfig, WorkspaceConfig } from '@agentskit/os-core'

const workspace: WorkspaceConfig = { schemaVersion: 1, id: 'my-ws', name: 'My Workspace', isolation: 'strict', tags: [] }

const myFlow: FlowConfig = {
  id: 'greet',
  name: 'Greet',
  entry: 'step-1',
  nodes: [{ id: 'step-1', kind: 'tool', tool: 'greet' }],
  edges: [],
}

const runner = createHeadlessRunner({
  config: workspace,
  flows: new Map([['greet', myFlow]]),
  adapters: {
    // inject your LLM / tool adapters here
  },
})

const result = await runner.runFlow('greet', { mode: 'dry_run' })
console.log(result.status) // 'skipped' (dry_run stubs all nodes)

await runner.dispose()
```

## API

### `createHeadlessRunner(opts): HeadlessRunner`

Creates a headless runner. Options:

| Field | Type | Required | Description |
|---|---|---|---|
| `config` | `WorkspaceConfig` | Yes | Workspace id and limits. |
| `flows` | `Map<string, FlowConfig> \| Record<string, FlowConfig>` | No | Flow registry. Required if you call `runFlow(flowId: string)`. |
| `adapters` | `AdapterRegistry` | Yes | LLM, tool, human, memory adapters from `@agentskit/os-runtime`. |
| `lookupAgent` | `AgentLookup` | No | Resolves agent id → AgentConfig. Required for agent nodes in real mode. |
| `sandbox` | `SandboxRegistry` | No | Reserved for future policy enforcement. |
| `audit` | `AuditEmitter` | No | Flushed on `dispose()`. |
| `observability` | `(event) => void` | No | Called for each `node:start` / `node:end` flow event. |
| `newRunId` | `() => string` | No | Custom run ID generator. |

### `HeadlessRunner`

- **`runFlow(flow, opts?)`** — Run a flow by id or `FlowConfig`. Returns `WorkspaceRunResult`.
  - `flow`: `string` (looked up from `options.flows`) or `FlowConfig` directly.
  - `opts.mode`: Run mode (`'dry_run'` default). Live modes use real adapters; stub modes use `defaultStubHandlers`.
  - `opts.signal`: `AbortSignal` for cancellation.
  - `opts.checkpoint`: Optional checkpoint callback (durable runs).
- **`runAgent(agentId, input, opts?)`** — Run a single agent as a minimal 1-node flow. Returns the agent output or throws on failure.
- **`dispose()`** — Flushes audit batches, releases handles.

### `runWorkspace(opts)` / `runFlowHeadless(opts)`

Convenience single-call wrapper: creates a runner, runs a flow, disposes.

```ts
import { runWorkspace } from '@agentskit/os-headless'

const result = await runWorkspace({
  config: workspace,
  flows: new Map([['greet', myFlow]]),
  adapters: {},
  flowId: 'greet',
  mode: 'dry_run',
})
```

## Run modes

| Mode | Behaviour |
|---|---|
| `real` | Live LLM + tools, costs charged, state persisted. |
| `deterministic` | Live LLM (version-pinned), stubbed side effects. |
| `preview` | Live LLM, read-only side effects. |
| `dry_run` | All nodes stubbed — no LLM calls, no cost. |
| `simulate` | All nodes mocked. |
| `replay` | Reads from event log. |

## License

MIT
