---
'@agentskit/os-dev-orchestrator': minor
'@agentskit/os-observability': minor
'@agentskit/os-templates': minor
---

Advance **#367** (trace/diff collector): per-provider `provider_started` artifact, optional
`unifiedDiffTruncated` on completion when HEAD moves, `run_cancelled` bundle when a
benchmark run stops early with `--capture-run-artifacts`, filename suffixes per phase,
`tryUnifiedDiffPreview` + `formatUnifiedDiffPreview`.

**#368**: optional subpath `@agentskit/os-observability/coding-task-report` re-exporting
task report builders (optional peer on `@agentskit/os-dev-orchestrator`).

**#364**: richer `IssueToPrDryRunReport` (plan, logs, diff/test stubs, review, PR draft);
filesystem workspace `dev-issue-to-pr-workspace` + gallery entry; demo doc
`docs/demo/dev-issue-to-pr.md`.

**#377**: fix benchmark demo README link to the walkthrough doc.
