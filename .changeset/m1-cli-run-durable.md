---
"@agentskit/os-cli": minor
---

Wire `@agentskit/os-storage` into `agentskit-os run`. Two new flags:

- `--store <dir>` — enable durable mode; persist checkpoints via `FileCheckpointStore` at `<dir>`. Switches runner from `runFlow` to `resumeFlow`.
- `--resume <runId>` — restore a prior run from checkpoints (requires `--store`). Reuses the given `runId` instead of generating a new one.

Output header annotates `(durable)` when `--store` is set. `node:resumed` events render as `✓ <id> (resumed)` in trace.

`@agentskit/os-storage` added as `peerDependency`.
