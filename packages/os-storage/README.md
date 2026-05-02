# @agentskit/os-storage

File-backed storage adapters for AgentsKitOS. Pure node:fs (no native deps).

## Status

Pre-1.0 alpha.

## Adapters

- `FileCheckpointStore` — implements `CheckpointStore` from `@agentskit/os-flow`. Per-run JSONL append.
- `LockfileStore` — read/write `agentskit-os.lock` via YAML.

Sqlite/redis/postgres backends ship as separate packages later.

## Usage

```ts
import { resumeFlow } from '@agentskit/os-flow'
import { FileCheckpointStore } from '@agentskit/os-storage'

const store = new FileCheckpointStore({ dir: '.agentskitos/runs' })
await resumeFlow(flow, { handlers, ctx, store })
```

## License

MIT
