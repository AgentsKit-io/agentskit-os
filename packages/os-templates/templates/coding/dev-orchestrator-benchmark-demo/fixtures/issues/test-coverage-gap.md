# test: coverage gap in `slidingWindow`

`tests/slice-window.test.ts` covers the happy path only. The boundary cases below are untested.

## Goal

- Add tests in `tests/slice-window.test.ts` for:
  - empty input (`[]`)
  - `n` larger than the input length
  - `n <= 0`
  - input length exactly equal to `n`
- Do **not** modify `src/slice-window.ts` as part of this task.
- Use `vitest` style (`describe`, `it`, `expect`).

Return a single coding-task JSON object as defined by the dev-orchestrator contract.
