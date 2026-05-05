---
"@agentskit/os-core": minor
"@agentskit/os-runtime": minor
"@agentskit/os-cli": patch
"@agentskit/os-headless": patch
"@agentskit/os-flow": patch
---

refactor: centralize run-mode helpers and live handler composition

Exports shared run id + stub-mode helpers from `os-core` and consumes them across CLI/headless.
Also composes multi-agent node handlers into `os-runtime` live handler maps and clarifies human-handler contracts.

