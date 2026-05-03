---
"@agentskit/os-flow": minor
---

Add `estimateFlowCost` — pre-flight cost estimator for FlowConfig.

New export: `packages/os-flow/src/cost-estimator.ts`

- `estimateFlowCost({ flow, agents, prices, defaultModelTokens? })` walks every `FlowNode` and projects token + USD cost before execution.
- Single-agent nodes (`agent`) resolve one agent; multi-agent nodes (`compare`, `vote`, `debate`, `auction`, `blackboard`) fan out across each agent slot. `debate` nodes additionally multiply by `rounds`.
- Uses `computeCost` from `@agentskit/os-core` cost-meter for USD computation.
- Missing agents or missing price-table entries produce zero-cost lines — host surfaces warnings.
- `priceKey(provider, model)` helper exported for building `PriceMap`.
- Fully pure; no I/O; prices and agent specs are caller-injected.

Types exported: `NodeCostEstimate`, `FlowCostEstimate`, `AgentMap`, `PriceMap`, `EstimateOptions`.
