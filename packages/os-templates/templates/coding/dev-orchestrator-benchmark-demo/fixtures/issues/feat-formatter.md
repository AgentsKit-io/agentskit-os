# feat: pretty-print mode for `formatReport`

`src/format-report.ts` currently emits compact JSON. Add an optional pretty mode.

## Goal

- Extend `formatReport(report, opts?: { pretty?: boolean })`.
- When `pretty: true`, return a multi-line table-style string with provider, status, cost ($USD), and duration (ms).
- Default behavior (no opts, or `pretty: false`) must remain compact JSON — existing callers should not break.
- Add tests covering both modes.

Return a single coding-task JSON object as defined by the dev-orchestrator contract.
