import type { EvalSuite } from './use-evals'

export function EvalSummary({ suites }: { readonly suites: readonly EvalSuite[] }) {
  const passing = suites.filter((suite) => suite.status === 'passing').length
  const regressed = suites.filter((suite) => suite.status === 'regressed').length
  const cases = suites.reduce((total, suite) => total + suite.cases, 0)
  const avgPass = suites.length === 0
    ? 0
    : suites.reduce((total, suite) => total + suite.passRatePct, 0) / suites.length

  const items = [
    { label: 'Passing', value: passing.toString() },
    { label: 'Regressed', value: regressed.toString() },
    { label: 'Cases', value: cases.toString() },
    { label: 'Avg pass', value: `${avgPass.toFixed(0)}%` },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[var(--ag-line)] bg-[var(--ag-glass-bg)] px-4 py-3 shadow-sm [backdrop-filter:var(--ag-glass-blur)]"
        >
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            {item.label}
          </div>
          <div className="mt-1 text-xl font-semibold text-[var(--ag-ink)] tabular-nums">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}
