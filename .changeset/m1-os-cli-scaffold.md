---
"@agentskit/os-cli": minor
---

Scaffold `@agentskit/os-cli` package. First commands: `config validate <path>` (YAML or JSON), `--version`, `--help`. Two-segment command routing (e.g. `config validate`). Pluggable `CliIo` for testability — all router behavior covered by unit tests without touching the real filesystem. Consumes `@agentskit/os-core` as a peer dependency per ADR-0002.
