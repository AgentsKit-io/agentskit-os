---
"@agentskit/os-core": minor
---

Add cost meter primitive per ADR-0012 `cost-meter` extension point. Pure schema + computation; no live API calls in core. Pricing tables registered by plugins.

`ModelPricing` Zod schema (provider + model + optional pinnedVersion + per-million input/output/cached-input rates + optional images-per-call + audio-per-second + Currency + effectiveFrom/effectiveTo windows + source URL).

`computeCost(usage, pricing)` returns typed `CostBreakdown` (currency + per-component costs + total). Cached tokens auto-deducted from billable input.

`CostMeter` class: register/unregister/lookup/meter. Falls back to unpinned model when pinnedVersion not registered. Honors `effectiveFrom`/`effectiveTo` time windows.

`checkBudget(input, prospectiveCost?)` returns `BudgetDecision` (`within | exceeded`) with scope (`daily | monthly`), limit, projected spent. Daily takes precedence when both exceeded.

`Currency` enum: USD/EUR/GBP/BRL/JPY/CNY.

New subpath export `@agentskit/os-core/cost/cost-meter`.
