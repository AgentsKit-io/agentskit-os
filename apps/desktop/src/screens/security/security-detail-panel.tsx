import { formatDateTime } from '../../lib/format'
import { SECURITY_AREA_LABEL } from './security-labels'
import { SecurityStatusPill } from './security-status-pill'
import type { SecurityControl } from './use-security'

export function SecurityDetailPanel({ control }: { readonly control: SecurityControl | null }) {
  if (control === null) {
    return (
      <aside className="flex min-h-[320px] flex-col justify-center rounded-xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select a control</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Review evidence, coverage, owner, and open findings for the selected control.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <div className="border-b border-[var(--ag-line)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--ag-ink)]" title={control.name}>
              {control.name}
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={control.id}>
              {control.id}
            </p>
          </div>
          <SecurityStatusPill status={control.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <SecurityMetric label="Area" value={SECURITY_AREA_LABEL[control.area]} />
        <SecurityMetric label="Coverage" value={`${control.coveragePct}%`} />
        <SecurityMetric label="Findings" value={control.findings.toString()} />
        <SecurityMetric label="Checked" value={formatDateTime(control.lastCheckedAt)} />
      </div>

      <SecurityBlock label="Evidence" value={control.evidence} mono />
      <SecurityNotes notes={control.notes} />
    </aside>
  )
}

function SecurityMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-[var(--ag-ink)]" title={value}>
        {value}
      </div>
    </div>
  )
}

function SecurityBlock({
  label,
  value,
  mono = false,
}: {
  readonly label: string
  readonly value: string
  readonly mono?: boolean
}) {
  return (
    <div className="border-b border-[var(--ag-line)] p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
        {label}
      </h3>
      <div
        className={[
          'mt-2 rounded-lg border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]',
          mono ? 'font-mono text-xs' : '',
        ].join(' ')}
      >
        {value}
      </div>
    </div>
  )
}

function SecurityNotes({ notes }: { readonly notes: readonly string[] }) {
  return (
    <div className="p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
        Notes
      </h3>
      <ul className="mt-3 flex flex-col gap-2">
        {notes.map((note) => (
          <li
            key={note}
            className="rounded-lg border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]"
          >
            {note}
          </li>
        ))}
      </ul>
    </div>
  )
}
