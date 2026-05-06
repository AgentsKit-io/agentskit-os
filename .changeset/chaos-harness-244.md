---
'@agentskit/os-flow': patch
---

#244: add `runUnderChaos` — pure fault-injection harness that wraps any async fn under a `ChaosPlan` of `throw` / `delay-ms` / `timeout-ms` / `corrupt` rules. Caller-supplied RNG keeps test runs reproducible; outcomes carry every fired rule id for assertion + observability.
