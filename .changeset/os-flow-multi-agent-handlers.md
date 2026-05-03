---
"@agentskit/os-flow": minor
---

Add default in-memory handlers for five multi-agent flow node kinds (RFC-0003).

Ships `createCompareHandler`, `createVoteHandler`, `createDebateHandler`, `createAuctionHandler`, and `createBlackboardHandler` in `packages/os-flow/src/multi-agent-handlers.ts`.

- **compare** — fan-out to N agents, select winner via `manual` (HITL), `eval` (host evaluator), `judge` (agent judger), `first` (fastest/cheapest), or `all` (concat/merge).
- **vote** — fan-out ballot with `majority`, `weighted`, `unanimous`, and `quorum` modes; `onTie` resolves via `human` (HITL), `first`, or `judge`.
- **debate** — alternating proponent/opponent for configurable rounds; judge resolves verdict; `earlyExit` modes `judge-decides` and `on-agreement` supported.
- **auction** — bidders race for a task; scored by `lowest-cost`, `highest-confidence`, `fastest`, or `custom` criteria; `reservePrice` filtering, `timeout`, and `fallback` agent supported.
- **blackboard** — shared scratchpad with `round-robin`, `volunteer`, and `priority` schedules; terminates by `rounds`, `consensus`, `agent-signal`, or `budget` limits.

Ships `InMemoryScratchpadStore` for in-process scratchpad use in tests and lightweight deployments. Host injects `runAgent` — no LLM client imported. All handlers are pure orchestration.

Closes #207, #208, #209, #210, #211. Refs RFC-0003.
