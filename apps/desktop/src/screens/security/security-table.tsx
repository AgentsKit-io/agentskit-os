import { formatDateTime } from '../../lib/format'
import { SECURITY_AREA_LABEL } from './security-labels'
import { SecurityStatusPill } from './security-status-pill'
import type { SecurityControl } from './use-security'

type SecurityTableProps = {
  readonly controls: readonly SecurityControl[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
}

const ROW_BASE_CLASS = [
  'cursor-pointer transition focus-visible:outline focus-visible:outline-2',
  'focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
].join(' ')

export function SecurityTable({ controls, selectedId, onSelect }: SecurityTableProps) {
  return (
    <div className="min-h-0 overflow-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <table className="w-full min-w-[760px] border-collapse text-sm" aria-label="Security controls">
        <thead>
          <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            <th className="px-4 py-2 font-medium">Control</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Coverage</th>
            <th className="px-3 py-2 font-medium">Findings</th>
            <th className="px-4 py-2 font-medium">Checked</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ag-line-soft)]">
          {controls.map((control) => (
            <tr
              key={control.id}
              tabIndex={0}
              aria-selected={selectedId === control.id}
              onClick={() => onSelect(control.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(control.id)
                }
              }}
              className={[
                ROW_BASE_CLASS,
                selectedId === control.id
                  ? 'bg-[color-mix(in_srgb,var(--ag-accent)_10%,transparent)]'
                  : 'hover:bg-[var(--ag-panel-alt)]',
              ].join(' ')}
            >
              <td className="max-w-[360px] px-4 py-3">
                <div className="truncate font-medium text-[var(--ag-ink)]" title={control.name}>
                  {control.name}
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-[var(--ag-ink-subtle)]">
                  {SECURITY_AREA_LABEL[control.area]} - {control.owner}
                </div>
              </td>
              <td className="px-3 py-3">
                <SecurityStatusPill status={control.status} />
              </td>
              <td className="px-3 py-3">
                <CoverageMeter value={control.coveragePct} />
              </td>
              <td className="px-3 py-3 tabular-nums text-[var(--ag-ink-muted)]">{control.findings}</td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--ag-ink-subtle)]">
                {formatDateTime(control.lastCheckedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CoverageMeter({ value }: { readonly value: number }) {
  return (
    <div className="w-28">
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ag-line)]">
        <div
          className="h-full rounded-full bg-[var(--ag-accent)]"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <div className="mt-1 font-mono text-[0.65rem] text-[var(--ag-ink-subtle)]">{value}%</div>
    </div>
  )
}
