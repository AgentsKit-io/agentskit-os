# `@agentskit/os-coding-agents`

Reference **subprocess adapters** for external coding-agent CLIs. Each adapter implements the `CodingAgentProvider` contract from `@agentskit/os-core` (`runTask`, `isAvailable`, optional `cancelTask`).

## Built-in providers

| Provider id   | CLI (typical)   | Capabilities (declared) |
|---------------|-----------------|-------------------------|
| `codex`       | OpenAI Codex    | edit, shell, tests, git |
| `claude-code` | Claude Code     | edit, shell, tests, git |
| `cursor`      | Cursor agent    | edit, shell, tests, git |
| `gemini`      | Gemini CLI      | edit, shell, tests, git |

Exact capability sets are defined on each provider’s `info.capabilities`. Unsupported modes (e.g. PR creation) must fail predictably with a stable `errorCode` where applicable.

## Certification & conformance

Providers are expected to pass the **os-core conformance suite** (`runConformance`):

- Happy-path task, no-diff, failing tests, permission denied, artifacts, timeout, cooperative cancel (when implemented).

**CLI (from `@agentskit/os-cli`):**

```bash
agentskit-os coding-agent conformance --provider codex
agentskit-os coding-agent conformance --provider claude-code --json
```

Exit code `0` means `certified: true` in the JSON report. Use `--json` for CI gates and marketplace “verified adapter” badges.

**Library tests:** see `tests/conformance.test.ts` (mock subprocess runner; no real CLI required).

## Unsupported / planned adapters

Additional provider ids (Aider, OpenCode, Continue) are tracked separately; follow the same contract and add conformance coverage before marking stable.

## Links

- Threat model for orchestration: [`docs/security/threat-model-external-coding-agents.md`](../../docs/security/threat-model-external-coding-agents.md)
- Core contract: `packages/os-core` — `CodingAgentProvider`, `CodingTaskRequest`, `runConformance`
