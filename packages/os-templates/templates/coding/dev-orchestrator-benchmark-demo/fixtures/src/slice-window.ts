/**
 * Returns a sliding window of size `n` over `xs`.
 *
 * Known issue: off-by-one — the last window is missing.
 * The benchmark task `bug-off-by-one` asks providers to fix this.
 */
export const slidingWindow = <T>(xs: readonly T[], n: number): readonly (readonly T[])[] => {
  if (n <= 0) return []
  const out: T[][] = []
  for (let i = 0; i < xs.length - n; i++) {
    out.push(xs.slice(i, i + n))
  }
  return out
}
