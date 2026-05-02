---
"@agentskit/os-runtime-agentskit": minor
---

Add `createAgentskitToolExecutor(tools, opts?)` — pure mapping from AgentsKit tool contract to `os-runtime`'s `ToolExecutor`.

Behaviors:
- `knows(toolId)` — O(1) lookup via internal map
- Unknown tool → `{ kind: 'error', code: 'TOOL_NOT_FOUND', message: 'unknown tool: <id>' }`
- Schema validation lives upstream (ADR-0004); this only dispatches
- Return-shape normalization accepts:
  - `{ kind: 'ok', value }` / `{ kind: 'error', code, message }` (canonical)
  - `{ ok: true, value }` / `{ ok: false, code, message }` (shorthand)
  - any raw value → wrapped as `{ kind: 'ok', value }`
- Thrown errors caught → `{ kind: 'error', code: 'AGENTSKIT_TOOL_ERROR', message }` (override via `errorCode`)
- Non-`Error` throws coerced to string
- `idResolver(tool)` option — namespace tool ids (e.g. `ns:name`)
- Duplicate ids rejected at construction with `Error: duplicate tool id "<id>"`

13 new tests. Memory binding + `createAgentskitRegistry` follow.
