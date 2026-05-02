---
"@agentskit/os-core": minor
---

Add `EventBus` interface + `InMemoryEventBus` reference implementation per ADR-0005. Topic-pattern matching: exact, single-segment wildcard (`agent.*`, `agent.*.completed`), or `*` for all events. Handler errors isolated via injectable `onHandlerError` sink. Async handlers awaited. `close()` prevents further publish/subscribe. New subpath export `@agentskit/os-core/events/bus`.
