# Issue → PR workspace (demo)

Vertical slice for **#364**: GitHub issue → plan → worktree → implementation → tests → review summary → draft PR, with HITL before opening the PR.

## Dry-run trace (no remotes)

Use the CLI to emit a full JSON trace (plan, provider log stub, diff stub, tests stub, review summary, PR draft metadata):

```sh
agentskit-os dev issue-pr \
  --issue "$(cat ./templates/coding/dev-issue-to-pr-workspace/fixtures/sample-issue-ref.txt | tr -d '\n')" \
  --repo "$(pwd)" \
  --providers codex,claude-code \
  --json
```

Persist to disk:

```sh
agentskit-os dev issue-pr --issue 'org/repo#7' --repo . --persist ./issue-pr-dry-run.json
```

## Workspace apply

```sh
agentskit-os workspace apply ./templates/coding/dev-issue-to-pr-workspace
```

## Related

- Flow pack id `dev-issue-to-pr` in `@agentskit/os-templates` (programmatic template).
- Benchmark demo: `templates/coding/dev-orchestrator-benchmark-demo` (**#377**).
- Walkthrough: [docs/demo/dev-issue-to-pr.md](../../../../docs/demo/dev-issue-to-pr.md).

## Issues

Refs [#364](https://github.com/AgentsKit-io/agentskit-os/issues/364), [#377](https://github.com/AgentsKit-io/agentskit-os/issues/377).
