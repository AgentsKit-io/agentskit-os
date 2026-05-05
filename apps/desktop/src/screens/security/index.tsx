import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import { SecurityAreaFilters, SECURITY_FILTERS, type SecurityFilter } from './security-area-filters'
import { SecurityDetailPanel } from './security-detail-panel'
import { SecuritySummary } from './security-summary'
import { SecurityTable } from './security-table'
import { SECURITY_CONTROLS_FIXTURE, useSecurityControls } from './use-security'

const SECURITY_HEADER_CLASS = [
  'sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-4',
  'border-b border-[var(--ag-line)] bg-[var(--ag-glass-strong-bg)] px-4 py-3',
  '[backdrop-filter:var(--ag-glass-blur)] sm:px-6',
].join(' ')

export function SecurityScreen() {
  const { controls, loading, error } = useSecurityControls()
  const [filter, setFilter] = useState<SecurityFilter>(SECURITY_FILTERS[0])
  const [selectedId, setSelectedId] = useState<string | null>(
    SECURITY_CONTROLS_FIXTURE[0]?.id ?? null,
  )

  const filteredControls = useMemo(
    () => (filter === 'all' ? controls : controls.filter((control) => control.area === filter)),
    [controls, filter],
  )

  const selectedControl = useMemo(() => {
    const match = controls.find((control) => control.id === selectedId)
    if (match) return match
    return filteredControls[0] ?? null
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
    <section aria-label="Security" className="flex min-h-full flex-col bg-[var(--ag-surface)]">
      <div className={SECURITY_HEADER_CLASS}>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            Govern mode
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ag-ink)]">
            Security
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ag-ink-muted)]">
            Monitor audit evidence, vault hygiene, policy coverage, and privacy routing controls.
          </p>
        </div>
        <Badge variant="outline">Preview mode</Badge>
      </div>

      <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
        {error !== null && (
          <div
            role="status"
            className="rounded-xl border border-[color-mix(in_srgb,var(--ag-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_12%,transparent)] px-3 py-2 text-sm text-[var(--ag-warning)]"
          >
            Sidecar security provider unavailable. Showing local sample data.
          </div>
        )}

        <SecuritySummary controls={controls} />
        <SecurityAreaFilters filter={filter} onFilter={setFilter} />

        {filteredControls.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No controls match this area.</p>
          </div>
        ) : (
          <div className="grid min-h-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <SecurityTable
              controls={filteredControls}
              selectedId={selectedControl?.id ?? null}
              onSelect={setSelectedId}
            />
            <SecurityDetailPanel control={selectedControl} />
          </div>
        )}
      </div>
    </section>
  )
}
