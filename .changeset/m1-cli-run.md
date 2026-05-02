---
"@agentskit/os-cli": minor
---

Add `agentskit-os run <config> --flow <id> [--mode] [--workspace] [--quiet]` command. Loads + validates config, picks the named flow, builds a `RunContext` with new `runId`, registers `defaultStubHandlers` for the run mode (default `dry_run`), and executes via `@agentskit/os-flow`. Streams per-node trace to stdout (suppressible with `--quiet`). Exit codes: 0 ok, 1 failed/invalid, 2 usage, 3 read, 4 paused.

`@agentskit/os-flow` added as `peerDependency`.
