import { formatDateTime } from '../../lib/format'
import { EVAL_CADENCE_LABEL } from './eval-labels'
import { EvalStatusPill } from './eval-status-pill'
import type { EvalSuite } from './use-evals'

type EvalTableProps = {
  readonly suites: readonly EvalSuite[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
}

const ROW_BASE_CLASS = [
  'cursor-pointer transition focus-visible:outline focus-visible:outline-2',
  'focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
].join(' ')

export function EvalTable({ suites, selectedId, onSelect }: EvalTableProps) {
  return (
    <div className="min-h-0 overflow-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <table className="w-full min-w-[860px] border-collapse text-sm" aria-label="Evaluation suites">
        <thead>
          <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            <th className="px-4 py-2 font-medium">Suite</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Cadence</th>
            <th className="px-3 py-2 font-medium">Cases</th>
            <th className="px-3 py-2 font-medium">Pass</th>
            <th className="px-3 py-2 font-medium">Regressions</th>
            <th className="px-4 py-2 font-medium">Last run</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ag-line-soft)]">
          {suites.map((suite) => (
            <tr
              key={suite.id}
              tabIndex={0}
              aria-selected={selectedId === suite.id}
              onClick={() => onSelect(suite.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(suite.id)
                }
              }}
              className={[
                ROW_BASE_CLASS,
                selectedId === suite.id
                  ? 'bg-[color-mix(in_srgb,var(--ag-accent)_10%,transparent)]'
                  : 'hover:bg-[var(--ag-panel-alt)]',
              ].join(' ')}
            >
              <td className="max-w-[320px] px-4 py-3">
                <div className="truncate font-medium text-[var(--ag-ink)]" title={suite.name}>
                  {suite.name}
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={suite.targetFlow}>
                  {suite.targetFlow}
                </div>
              </td>
              <td className="px-3 py-3">
                <EvalStatusPill status={suite.status} />
              </td>
              <td className="px-3 py-3 text-xs text-[var(--ag-ink-muted)]">
                {EVAL_CADENCE_LABEL[suite.cadence]}
              </td>
              <td className="px-3 py-3 tabular-nums text-[var(--ag-ink-muted)]">{suite.cases}</td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink)]">
                {suite.passRatePct}%
              </td>
              <td className="px-3 py-3 tabular-nums text-[var(--ag-ink-muted)]">
                {suite.regressionCount}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--ag-ink-subtle)]">
                {formatDateTime(suite.lastRunAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
