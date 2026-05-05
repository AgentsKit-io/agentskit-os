import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import { TRIGGERS_FIXTURE, type TriggerProvider, type TriggerRule, type TriggerStatus, useTriggers } from './use-triggers'
import { FilterPills } from '../../components/filter-pills'
import { formatTime } from '../../lib/format'
import { TriggerTable } from './trigger-table'
import { TriggerSummary } from './trigger-summary'

const PROVIDER_LABEL: Record<TriggerProvider, string> = {
  slack: 'Slack',
  discord: 'Discord',
  teams: 'Teams',
  cron: 'Cron',
  github_pr: 'GitHub PR',
  webhook: 'Webhook',
}

const statusLabelByStatus: Record<TriggerStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  failing: 'Failing',
  needs_auth: 'Needs auth',
}

const statusClassByStatus: Record<TriggerStatus, string> = {
  active: 'border-[var(--ag-success)]/25 bg-[var(--ag-success)]/10 text-[var(--ag-success)]',
  paused: 'border-[var(--ag-ink-muted)]/25 bg-[var(--ag-ink-muted)]/10 text-[var(--ag-ink-muted)]',
  failing: 'border-[var(--ag-danger)]/25 bg-[var(--ag-danger)]/10 text-[var(--ag-danger)]',
  needs_auth: 'border-[var(--ag-warn)]/30 bg-[var(--ag-warn)]/10 text-[var(--ag-warn)]',
}

const FILTERS: Array<TriggerProvider | 'all'> = ['all', 'slack', 'discord', 'teams', 'cron', 'github_pr', 'webhook']

function StatusPill({ status }: { readonly status: TriggerStatus }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[0.65rem] font-medium border ${statusClassByStatus[status]}`}>
      {statusLabelByStatus[status]}
    </span>
  )
}

function TriggerDetail({ trigger }: { readonly trigger: TriggerRule | null }) {
  if (trigger === null) {
    return (
      <aside className="flex min-h-0 flex-col justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select a trigger</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Inspect routing, provider state, agent policy, and recent run health.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <div className="border-b border-[var(--ag-line)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--ag-ink)]" title={trigger.name}>
              {trigger.name}
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={trigger.id}>
              {trigger.id}
            </p>
          </div>
          <StatusPill status={trigger.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <DetailMetric label="Provider" value={PROVIDER_LABEL[trigger.provider]} />
        <DetailMetric label="Runs 24h" value={trigger.runs24h.toString()} />
        <DetailMetric label="Success" value={`${trigger.successRatePct}%`} />
        <DetailMetric label="Spend 24h" value={`$${trigger.cost24hUsd.toFixed(2)}`} />
      </div>

      <DetailBlock label="Target Flow" value={trigger.targetFlow} mono />
      <DetailBlock label="Agent Policy" value={trigger.agentPolicy} />
      <DetailBlock label="Configuration" value={trigger.configSummary} />
    </aside>
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

function DetailBlock({
  label,
  value,
  mono = false,
}: {
  readonly label: string
  readonly value: string
  readonly mono?: boolean
}) {
  return (
    <div className="border-b border-[var(--ag-line)] p-4 last:border-b-0">
      <h3 className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
        {label}
      </h3>
      <div
        className={[
          'mt-2 rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]',
          mono ? 'font-mono text-xs' : '',
        ].join(' ')}
      >
        {value}
      </div>
    </div>
  )
}

export function TriggersScreen() {
  const { triggers, loading, error } = useTriggers()
  const [filter, setFilter] = useState<TriggerProvider | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(TRIGGERS_FIXTURE[0]?.id ?? null)

  const filteredTriggers = useMemo(() => {
    return filter === 'all' ? triggers : triggers.filter((trigger) => trigger.provider === filter)
  }, [filter, triggers])

  const selectedTrigger = useMemo(() => {
    const match = triggers.find((trigger) => trigger.id === selectedId)
    if (match) return match
    return filteredTriggers[0] ?? null
  }, [filteredTriggers, selectedId, triggers])

  if (loading) {
    return (
      <section aria-label="Triggers" className="flex h-full items-center justify-center text-sm text-[var(--ag-ink-muted)]">
        Loading triggers...
      </section>
    )
  }

  return (
    <section aria-label="Triggers" className="flex h-full min-h-0 flex-col bg-[var(--ag-surface)]">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--ag-line)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--ag-ink)]">Triggers</h1>
          <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
            Route Slack, Teams, PR, cron, and webhook events into agent workflows.
          </p>
        </div>
        <Badge variant="outline">Preview mode</Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
        {error !== null && (
          <div role="status" className="rounded-md border border-[var(--ag-warn)]/25 bg-[var(--ag-warn)]/10 px-3 py-2 text-sm text-[var(--ag-warn)]">
            Sidecar trigger registry unavailable. Showing local sample data.
          </div>
        )}

        <TriggerSummary triggers={triggers} />

        <FilterPills
          items={FILTERS}
          active={filter}
          onChange={setFilter}
          ariaLabel="Filter triggers by provider"
          labelFor={(item) => (item === 'all' ? 'All' : PROVIDER_LABEL[item])}
        />

        {filteredTriggers.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-8 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">No triggers match this provider.</p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <TriggerTable triggers={filteredTriggers} selectedId={selectedTrigger?.id ?? null} onSelect={setSelectedId} />
            <TriggerDetail trigger={selectedTrigger} />
          </div>
        )}
      </div>
    </section>
  )
}
