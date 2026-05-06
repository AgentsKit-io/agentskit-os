# Dev Orchestrator Benchmark Demo

Public demo workspace that benchmarks AgentsKitOS's dev orchestrator across coding-agent providers.

## What it does

For each demo task — bug fix, test generation, small feature — runs the **same prompt** through every configured coding-agent provider, then emits a comparison report covering completeness, cost, duration, tokens, and tests run.

## Modes

- **Dry-run** (`AK_DEMO_MODE=dry`, default): no provider keys required; uses the built-in fake provider. Always produces a report and a deterministic diff summary.
- **Live** (`AK_DEMO_MODE=live`): runs against locally available coding-agent CLIs (`codex`, `claude`, `cursor-agent`, `gemini`, `aider`, `opencode`, `cn`). Skips providers that are unavailable.

## Quick start

```sh
# 1. Apply the workspace template
agentskit-os workspace apply ./templates/coding/dev-orchestrator-benchmark-demo

# 2. Dry-run benchmark (no credentials)
AK_DEMO_MODE=dry agentskit-os coding-agent benchmark \
  --config ./templates/coding/dev-orchestrator-benchmark-demo/fixtures/benchmark-config.json \
  --report-out ./.demo-out

# 3. Inspect outputs
ls ./.demo-out
# coding-task-report.json
# coding-task-report.md
# coding-task-dashboard.json
```

## Tasks

| Id | Type | Source | Goal |
|---|---|---|---|
| `bug-off-by-one` | Bug fix | `fixtures/issues/bug-off-by-one.md` | Fix the off-by-one in `slice` window. |
| `test-coverage-gap` | Test generation | `fixtures/issues/test-coverage-gap.md` | Add tests for empty / boundary cases. |
| `feat-formatter` | Small feature | `fixtures/issues/feat-formatter.md` | Add a `--pretty` flag that pretty-prints the report. |

## Provider matrix

The demo asks every available provider to run each task in dry-run. Providers that are not installed are reported as "unavailable" instead of failing the run. See [`fixtures/benchmark-config.json`](./fixtures/benchmark-config.json).

## Expected reports

Reference outputs (shape only, values vary):

- [`fixtures/expected-reports/coding-task-report.example.md`](./fixtures/expected-reports/coding-task-report.example.md)
- [`fixtures/expected-reports/coding-task-dashboard.example.json`](./fixtures/expected-reports/coding-task-dashboard.example.json)

## 10-minute walkthrough

See [docs/demo/dev-orchestrator-benchmark.md](../../../../docs/demo/dev-orchestrator-benchmark.md) for an investor / contributor walkthrough.

## Issues

Refs [#377](https://github.com/AgentsKit-io/agentskit-os/issues/377), [#366](https://github.com/AgentsKit-io/agentskit-os/issues/366), [#368](https://github.com/AgentsKit-io/agentskit-os/issues/368).
