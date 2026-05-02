---
"@agentskit/os-runtime-agentskit": patch
---

Add end-to-end integration test suite — `createAgentskitRegistry` → `buildLiveHandlers` (os-runtime) → handler invocation. Locks the binding's wire shape against `os-runtime`'s contract so future drift in either side surfaces immediately.

`@agentskit/os-flow` added as devDep (transitively required by `os-runtime` for `parseFlowConfig`-based fixtures).

8 new tests.
