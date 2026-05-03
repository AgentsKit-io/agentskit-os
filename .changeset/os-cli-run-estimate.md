---
"@agentskit/os-cli": minor
---

Add `--estimate` and `--force` flags to `agentskit-os run`.

Implements issue #198: pre-flight cost estimate UI + block-on-budget-exceed.

**New flags:**

- `--estimate` — print a pre-flight cost breakdown table for the selected flow and exit (code 0). Does NOT execute the flow.
- `--force` — skip the `WorkspaceLimits` budget check. Intended for CI override scenarios (audited).

**Budget enforcement:**

When `workspace.limits.tokensPerRun` or `workspace.limits.usdPerRun` is configured and the pre-flight estimate exceeds it, `agentskit-os run` exits with code `5` (`os.cli.run_budget_exceeded`) before any nodes execute. `--force` bypasses the check.

**Estimate table format:**

```
cost estimate  flow=pr-review  workspace=team-a
Node                    Agents                          Tokens    Est. USD
------------------------------------------------------------------------
review                  reviewer                        4000      $0.020000
------------------------------------------------------------------------
TOTAL                                                   4000      $0.020000
```

**Price table note:**

The CLI estimate uses an empty price table by default (all USD estimates are $0 until a host registers model prices via `PriceMap`). Token counts are always computed from agent `maxTokens` (or `defaultModelTokens=2000` when absent). This is intentional — the estimator is a pure pre-flight check and does not make network calls.

**Exit codes:**

- `0` — estimate printed, or run completed
- `5` — budget exceeded (new); use `--force` to override
