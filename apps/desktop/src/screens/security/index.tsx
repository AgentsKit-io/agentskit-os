import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import {
  MOCK_SECURITY_CONTROLS,
  type SecurityArea,
  type SecurityControl,
  type SecurityStatus,
  useSecurityControls,
} from './use-security'

const AREA_LABEL: Record<SecurityArea, string> = {
  audit: 'Audit',
  vault: 'Vault',
  policy: 'Policy',
  privacy: 'Privacy',
}

const STATUS_LABEL: Record<SecurityStatus, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  blocked: 'Blocked',
}

const STATUS_CLASSES: Record<SecurityStatus, string> = {
  healthy: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  watch: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  blocked: 'border-red-500/25 bg-red-500/10 text-red-300',
}

const FILTERS: Array<SecurityArea | 'all'> = ['all', 'audit', 'vault', 'policy', 'privacy']

function StatusPill({ status }: { readonly status: SecurityStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[0.65rem] font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function SecuritySummary({ controls }: { readonly controls: readonly SecurityControl[] }) {
  const healthy = controls.filter((control) => control.status === 'healthy').length
  const watch = controls.filter((control) => control.status === 'watch').length
  const blocked = controls.filter((control) => control.status === 'blocked').length
  const findings = controls.reduce((total, control) => total + control.findings, 0)

  const items = [
    { label: 'Healthy', value: healthy.toString() },
    { label: 'Watch', value: watch.toString() },
    { label: 'Blocked', value: blocked.toString() },
    { label: 'Findings', value: findings.toString() },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)] px-4 py-3"
        >
          <div className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
            {item.label}
          </div>
          <div className="mt-1 truncate text-xl font-semibold text-[var(--ag-ink)] tabular-nums">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function ControlsTable({
  controls,
  selectedId,
  onSelect,
}: {
  readonly controls: readonly SecurityControl[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
}) {
  return (
    <div className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <table className="w-full border-collapse text-sm" aria-label="Security controls">
        <thead>
          <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
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
                'cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
                selectedId === control.id ? 'bg-[var(--ag-accent)]/10' : 'hover:bg-[var(--ag-panel-alt)]',
              ].join(' ')}
            >
              <td className="max-w-[360px] px-4 py-3">
                <div className="truncate font-medium text-[var(--ag-ink)]" title={control.name}>
                  {control.name}
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-[var(--ag-ink-subtle)]">
                  {AREA_LABEL[control.area]} - {control.owner}
                </div>
              </td>
              <td className="px-3 py-3">
                <StatusPill status={control.status} />
              </td>
              <td className="px-3 py-3">
                <div className="w-28">
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ag-line)]">
                    <div
                      className="h-full rounded-full bg-[var(--ag-accent)]"
                      style={{ width: `${Math.min(100, control.coveragePct)}%` }}
                    />
                  </div>
                  <div className="mt-1 font-mono text-[0.65rem] text-[var(--ag-ink-subtle)]">
                    {control.coveragePct}%
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 tabular-nums text-[var(--ag-ink-muted)]">{control.findings}</td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--ag-ink-subtle)]">
                {formatDate(control.lastCheckedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DetailMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-[var(--ag-ink)]" title={value}>
        {value}
      </div>
    </div>
  )
}

function ControlDetail({ control }: { readonly control: SecurityControl | null }) {
  if (control === null) {
    return (
      <aside className="flex min-h-0 flex-col justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select a control</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Review evidence, coverage, owner, and open findings for the selected control.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
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
          <StatusPill status={control.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <DetailMetric label="Area" value={AREA_LABEL[control.area]} />
        <DetailMetric label="Coverage" value={`${control.coveragePct}%`} />
        <DetailMetric label="Findings" value={control.findings.toString()} />
        <DetailMetric label="Checked" value={formatDate(control.lastCheckedAt)} />
      </div>

      <div className="border-b border-[var(--ag-line)] p-4">
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
          Evidence
        </h3>
        <div className="mt-2 rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 font-mono text-xs text-[var(--ag-ink-muted)]">
          {control.evidence}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
          Notes
        </h3>
        <ul className="mt-3 flex flex-col gap-2">
          {control.notes.map((note) => (
            <li
              key={note}
              className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]"
            >
              {note}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

export function SecurityScreen() {
  const { controls, loading, error } = useSecurityControls()
  const [filter, setFilter] = useState<SecurityArea | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_SECURITY_CONTROLS[0]?.id ?? null)

  const filteredControls = useMemo(() => {
    return filter === 'all' ? controls : controls.filter((control) => control.area === filter)
  }, [controls, filter])

  const selectedControl = useMemo(() => {
    return controls.find((control) => control.id === selectedId) ?? filteredControls[0] ?? null
  }, [controls, filteredControls, selectedId])

  if (loading) {
    return (
      <section
        aria-label="Security"
        className="flex h-full items-center justify-center text-sm text-[var(--ag-ink-muted)]"
      >
        Loading security controls...
      </section>
    )
  }

  return (
    <section aria-label="Security" className="flex h-full min-h-0 flex-col bg-[var(--ag-surface)]">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--ag-line)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--ag-ink)]">Security</h1>
          <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
            Monitor audit evidence, vault hygiene, policy coverage, and privacy routing controls.
          </p>
        </div>
        <Badge variant="outline">Preview data</Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
        {error !== null && (
          <div
            role="status"
            className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-300"
          >
            Sidecar security provider unavailable. Showing local sample data.
          </div>
        )}

        <SecuritySummary controls={controls} />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter controls by area">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
              className={[
                'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                filter === item
                  ? 'border-[var(--ag-accent)] bg-[var(--ag-accent)]/10 text-[var(--ag-accent)]'
                  : 'border-[var(--ag-line)] text-[var(--ag-ink-muted)] hover:border-[var(--ag-accent)]/50 hover:text-[var(--ag-ink)]',
              ].join(' ')}
            >
              {item === 'all' ? 'All' : AREA_LABEL[item]}
            </button>
          ))}
        </div>

        {filteredControls.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No controls match this area.</p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <ControlsTable
              controls={filteredControls}
              selectedId={selectedControl?.id ?? null}
              onSelect={setSelectedId}
            />
            <ControlDetail control={selectedControl} />
          </div>
        )}
      </div>
    </section>
  )
}
