---
"@agentskit/os-core": minor
---

Add `FlowConfig` Zod schema with DAG validation. 5 node kinds (`agent`, `tool`, `human`, `condition`, `parallel`) discriminated on `kind`. Edges validated for missing endpoints, duplicate node ids, and cycles via `superRefine`. Includes shared `RetryPolicy`. New subpath export `@agentskit/os-core/schema/flow`.
