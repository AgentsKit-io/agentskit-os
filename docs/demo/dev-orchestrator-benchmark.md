# Dev Orchestrator Benchmark — 10-minute walkthrough

A guided demo of AgentsKitOS's dev orchestrator for investors, contributors, and design partners. Public, reproducible, and runs end-to-end in **dry-run** without any provider credentials.

**Issue:** [#377](https://github.com/AgentsKit-io/agentskit-os/issues/377)
**Template:** [`packages/os-templates/templates/coding/dev-orchestrator-benchmark-demo`](../../packages/os-templates/templates/coding/dev-orchestrator-benchmark-demo)

---

## Why watch this

In ten minutes you will:

1. See a real coding-agent task fan out to **multiple providers** in parallel.
2. Read a side-by-side report comparing **completeness, cost, duration, tokens, and tests run**.
3. See how **failure taxonomy + permission profiles** keep the orchestrator safe in production.

If you only have **two minutes**, jump to [§3 The benchmark report](#3-the-benchmark-report).

---

## 0. Prereqs (2 min)

- Node 20+ and `pnpm` installed.
- (Optional, for live mode) one or more of: `codex`, `claude`, `cursor-agent`, `gemini`, `aider`, `opencode`, `cn`.

```sh
git clone https://github.com/AgentsKit-io/agentskit-os
cd agentskit-os
pnpm install
pnpm build
```

---

## 1. Apply the demo workspace (1 min)

```sh
agentskit-os workspace apply \
  ./packages/os-templates/templates/coding/dev-orchestrator-benchmark-demo
```

Inspect what just landed:

```sh
ls packages/os-templates/templates/coding/dev-orchestrator-benchmark-demo
# README.md  metadata.json  template.yaml  fixtures/
```

The fixture repo carries:

- `fixtures/src/slice-window.ts` — has a deliberate off-by-one bug.
- `fixtures/src/format-report.ts` — has a missing `--pretty` mode.
- `fixtures/issues/*.md` — three task prompts (bug fix, test gen, small feature).
- `fixtures/benchmark-config.json` — the provider matrix and report config.
- `fixtures/expected-reports/*` — reference shape of the outputs.

---

## 2. Run the benchmark — dry mode (3 min)

```sh
AK_DEMO_MODE=dry agentskit-os coding-agent benchmark \
  --config ./packages/os-templates/templates/coding/dev-orchestrator-benchmark-demo/fixtures/benchmark-config.json \
  --report-out ./.demo-out
```

Dry mode uses the built-in fake provider — no API keys needed, deterministic output. You should see:

- A run artifact per provider/task with redacted prompts, diffs, and trace ids.
- A markdown + JSON task report (see §3).
- A dashboard payload suitable for the trace viewer.

To go live (only providers actually installed will run; others are skipped):

```sh
AK_DEMO_MODE=live agentskit-os coding-agent benchmark \
  --config ./packages/os-templates/templates/coding/dev-orchestrator-benchmark-demo/fixtures/benchmark-config.json \
  --report-out ./.demo-out
```

---

## 3. The benchmark report (2 min)

`./.demo-out/coding-task-report.md` looks like the reference in [`fixtures/expected-reports/coding-task-report.example.md`](../../packages/os-templates/templates/coding/dev-orchestrator-benchmark-demo/fixtures/expected-reports/coding-task-report.example.md). Highlights to point out:

- **Aggregate** — total cost, tokens, duration across providers.
- **Providers table** — completeness score, USD, tokens, ms, **failure** classification, **human review** flag, and a one-line summary.
- **Diff summary** — unique paths touched, with a preview list.
- **Failure recovery** — when a provider trips a known failure (e.g. `invalid_diff`, `provider_timeout`, `secret_leak`), the orchestrator emits the suggested recovery from the [failure taxonomy](../../packages/os-dev-orchestrator/src/coding-failure-taxonomy.ts).

The dashboard payload at `./.demo-out/coding-task-dashboard.json` is a flatter shape ready for the trace viewer or any external analytics surface.

---

## 4. Safety story (1 min)

Each task in the demo runs under a **permission profile** so you can show how the dev orchestrator stays safe even when the prompt source is untrusted:

- `read_only_review` — review only, no writes, no shell.
- `edit_without_shell` — autopatch, edits in scope only.
- `test_runner` — runs tests, no edits outside `coverage/` and `.cache/`.
- `full_sandbox` — broad scope inside the sandbox; egress allowlisted.
- `release_manager` — push + tag + release, HITL recommended.

Switch the profile in `fixtures/benchmark-config.json` and re-run — denied operations show up as audit events with `providerId`, `taskId`, `command/tool`, and `policy.*` reason codes.

---

## 5. What it proves (1 min)

- **Multi-provider** is real — the same prompt, the same scope, side-by-side numbers.
- **Cost + observability** are first-class — every run emits tokens, USD, traces, and a diff summary.
- **Safety profiles** ride on policy-as-code — providers can be sandboxed without bespoke per-CLI configuration.
- **Reproducible** — the demo runs without credentials, in CI, deterministically.

This is the same surface area used by the [issue→PR pipeline](../../packages/os-dev-orchestrator/src/issue-pr-pipeline.ts) and the trigger presets in [`dev-trigger-presets`](../../packages/os-dev-orchestrator/src/dev-trigger-presets.ts).
