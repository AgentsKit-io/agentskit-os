---
"@agentskit/os-cli": patch
"@agentskit/os-core": patch
"@agentskit/os-flow": patch
---

M2/M3 foundation batch: scaffolding for the desktop M2 vertical and the
flow orchestrator M3 milestone.

- `os-core`: activation observability hooks; visual flow schema scaffold.
- `os-flow`: git-diff tool primitive for human-readable patch previews.
- `os-cli`: `flow new` scaffold command + tests.

Lays groundwork for the M3 visual flow editor (ADR-0019) without
shipping the editor itself.
