import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import { TriggerDetailPanel } from './trigger-detail-panel'
import {
  TRIGGER_FILTERS,
  TriggerProviderFilters,
  type TriggerFilter,
} from './trigger-provider-filters'
import { TriggerSummary } from './trigger-summary'
import { TriggerTable } from './trigger-table'
import { TRIGGERS_FIXTURE, useTriggers } from './use-triggers'

const TRIGGERS_HEADER_CLASS = [
  'sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-4',
  'border-b border-[var(--ag-line)] bg-[var(--ag-glass-strong-bg)] px-4 py-3',
  '[backdrop-filter:var(--ag-glass-blur)] sm:px-6',
].join(' ')

export function TriggersScreen() {
  const { triggers, loading, error } = useTriggers()
  const [filter, setFilter] = useState<TriggerFilter>(TRIGGER_FILTERS[0])
  const [selectedId, setSelectedId] = useState<string | null>(TRIGGERS_FIXTURE[0]?.id ?? null)

  const filteredTriggers = useMemo(
    () => (filter === 'all' ? triggers : triggers.filter((trigger) => trigger.provider === filter)),
    [filter, triggers],
  )

  const selectedTrigger = useMemo(() => {
    const match = triggers.find((trigger) => trigger.id === selectedId)
    if (match) return match
    return filteredTriggers[0] ?? null
  }, [filteredTriggers, selectedId, triggers])

  if (loading) {
    return (
      <section
        aria-label="Triggers"
        className="flex h-full items-center justify-center text-sm text-[var(--ag-ink-muted)]"
      >
        Loading triggers...
      </section>
    )
  }

  return (
    <section aria-label="Triggers" className="flex min-h-full flex-col bg-[var(--ag-surface)]">
      <div className={TRIGGERS_HEADER_CLASS}>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            Event routing
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ag-ink)]">
            Triggers
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ag-ink-muted)]">
            Route Slack, Teams, PR, cron, and webhook events into agent workflows.
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
            Sidecar trigger registry unavailable. Showing local sample data.
          </div>
        )}

        <TriggerSummary triggers={triggers} />
        <TriggerProviderFilters filter={filter} onFilter={setFilter} />

        {filteredTriggers.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No triggers match this provider.</p>
          </div>
        ) : (
          <div className="grid min-h-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <TriggerTable
              triggers={filteredTriggers}
              selectedId={selectedTrigger?.id ?? null}
              onSelect={setSelectedId}
            />
            <TriggerDetailPanel trigger={selectedTrigger} />
          </div>
        )}
      </div>
    </section>
  )
}
