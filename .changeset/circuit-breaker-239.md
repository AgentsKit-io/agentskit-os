---
'@agentskit/os-flow': patch
---

#239: add `createCircuitBreaker` — pure three-state breaker (`closed`/`open`/`half-open`) keyed per provider/tool/sub-flow. Caller-supplied clock + threshold + cooldown; surfaces `tryAcquire`, `recordSuccess`, `recordFailure`, and a snapshot for observability.
