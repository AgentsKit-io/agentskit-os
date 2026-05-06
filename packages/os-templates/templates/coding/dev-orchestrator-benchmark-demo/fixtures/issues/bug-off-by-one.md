# bug: off-by-one in `slidingWindow`

`src/slice-window.ts` exports a `slidingWindow(xs, n)` that drops the **last** window.

## Repro

```ts
slidingWindow([1, 2, 3, 4], 2)
// expected: [[1,2], [2,3], [3,4]]
// actual:   [[1,2], [2,3]]
```

## Goal

- Fix `slidingWindow` so it includes the final window when `xs.length >= n`.
- Add or update a test in `tests/slice-window.test.ts` that asserts the expected output above.
- Keep public API: `slidingWindow<T>(xs: readonly T[], n: number): readonly (readonly T[])[]`.
- Out of scope: any other refactor.

Return a single coding-task JSON object as defined by the dev-orchestrator contract.
