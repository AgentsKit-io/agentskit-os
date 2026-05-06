# Coding task report

- Generated: `2026-05-05T12:00:00.000Z`
- Source: **benchmark**
- Task kind: `edit` · dryRun: **true**
- Repo: `/tmp/dev-orch-benchmark-demo`

## Aggregate

| Metric | Value |
| --- | --- |
| Providers | 4 |
| ok / partial / fail / timeout | 3 / 0 / 1 / 0 |
| Total USD | 0.012000 |
| Total tokens (in+out) | 14210 |
| Total duration (ms) | 9842 |

## Diff summary

- Unique paths: **2**
- Preview: `src/slice-window.ts`, `tests/slice-window.test.ts`

## Providers

| Provider | Status | Score | USD | tok in/out | ms | Failure | Review | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| codex | ok | 92 | 0.0040 | 1800/620 | 2310 | — | no | Fixed off-by-one and added boundary test. |
| claude-code | ok | 88 | 0.0035 | 1700/590 | 2640 | — | no | Patched window loop. |
| cursor | ok | 81 | 0.0030 | 1620/540 | 2270 | — | no | Adjusted bound and updated test. |
| gemini | fail | 12 | 0.0015 | 1100/240 | 2622 | invalid_diff | no | Returned malformed JSON. |
