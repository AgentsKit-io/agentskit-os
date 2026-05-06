# Issue → PR demo (10-minute walkthrough)

This guide covers the **#364** vertical slice: issue → plan → worktree → implement → tests → review → draft PR, without touching production GitHub remotes until you opt in.

## Prerequisites

- AgentsKitOS CLI built or installed from this repo.
- Optional: local git repo path for `--repo` (defaults to `process.cwd()` in examples).

## 1. Dry-run trace (2 min)

Emit a JSON report with phased events, plan summary, stubbed provider log / diff / tests, review text, and PR draft metadata:

```sh
agentskit-os dev issue-pr \
  --issue 'https://github.com/your-org/your-repo/issues/1' \
  --repo "$(pwd)" \
  --providers codex,claude-code \
  --json | head -c 2000
```

No network calls to GitHub or coding-agent CLIs are made in this mode.

## 2. Apply the workspace template (3 min)

```sh
agentskit-os workspace apply ./packages/os-templates/templates/coding/dev-issue-to-pr-workspace
```

Inspect `template.yaml`: flow nodes mirror the pipeline (issue fetch → plan → worktree → implement → tests → summarize → HITL → draft PR).

## 3. Pair with the programmatic template (2 min)

The pack id `dev-issue-to-pr` ships in `@agentskit/os-templates` (`findTemplate('dev-issue-to-pr')`) for gallery / CLI scaffolding. The filesystem workspace above adds a ready-to-apply config tree.

## 4. Benchmark demo & task reports (3 min)

For multi-provider comparison and **#368** task reports (markdown, JSON, dashboard JSON), run the benchmark demo:

```sh
# See packages/os-templates/templates/coding/dev-orchestrator-benchmark-demo/README.md
```

Coding task report helpers are also available from **`@agentskit/os-observability/coding-task-report`** when `@agentskit/os-dev-orchestrator` is installed (optional peer).

## Issues

Refs [#364](https://github.com/AgentsKit-io/agentskit-os/issues/364), [#368](https://github.com/AgentsKit-io/agentskit-os/issues/368), [#377](https://github.com/AgentsKit-io/agentskit-os/issues/377).
