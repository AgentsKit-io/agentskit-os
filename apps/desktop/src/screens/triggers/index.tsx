import { useMemo, useState } from 'react'
import { Badge } from '@agentskit/os-ui'
import { TRIGGERS_FIXTURE, type TriggerProvider, type TriggerRule, type TriggerStatus, useTriggers } from './use-triggers'

const PROVIDER_LABEL: Record<TriggerProvider, string> = {
  slack: 'Slack',
  discord: 'Discord',
  teams: 'Teams',
  cron: 'Cron',
  github_pr: 'GitHub PR',
  webhook: 'Webhook',
}

const STATUS_LABEL: Record<TriggerStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  failing: 'Failing',
  needs_auth: 'Needs auth',
}

const STATUS_CLASSES: Record<TriggerStatus, string> = {
  active: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  paused: 'border-zinc-500/25 bg-zinc-500/10 text-zinc-300',
  failing: 'border-red-500/25 bg-red-500/10 text-red-300',
  needs_auth: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
}

const FILTERS: Array<TriggerProvider | 'all'> = ['all', 'slack', 'discord', 'teams', 'cron', 'github_pr', 'webhook']

function StatusPill({ status }: { readonly status: TriggerStatus }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[0.65rem] font-medium border ${STATUS_CLASSES[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function TriggerSummary({ triggers }: { readonly triggers: readonly TriggerRule[] }) {
  const active = triggers.filter((trigger) => trigger.status === 'active').length
  const failing = triggers.filter((trigger) => trigger.status === 'failing').length
  const runs24h = triggers.reduce((total, trigger) => total + trigger.runs24h, 0)
  const cost24h = triggers.reduce((total, trigger) => total + trigger.cost24hUsd, 0)

  const items = [
    { label: 'Active', value: active.toString() },
    { label: 'Failing', value: failing.toString() },
    { label: 'Runs 24h', value: runs24h.toString() },
    { label: 'Spend 24h', value: `$${cost24h.toFixed(2)}` },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)] px-4 py-3">
          <div className="text-[11px] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
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

function TriggerTable({
  triggers,
  selectedId,
  onSelect,
}: {
  readonly triggers: readonly TriggerRule[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
}) {
  return (
    <div className="min-h-0 overflow-auto rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <table className="w-full border-collapse text-sm" aria-label="Trigger rules">
        <thead>
          <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-widest text-[var(--ag-ink-subtle)]">
            <th className="px-4 py-2 font-medium">Trigger</th>
            <th className="px-3 py-2 font-medium">Provider</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Runs 24h</th>
            <th className="px-3 py-2 font-medium">Success</th>
            <th className="px-4 py-2 font-medium">Last fired</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ag-line-soft)]">
          {triggers.map((trigger) => (
            <tr
              key={trigger.id}
              tabIndex={0}
              aria-selected={selectedId === trigger.id}
              onClick={() => onSelect(trigger.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(trigger.id)
                }
              }}
              className={[
                'cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
                selectedId === trigger.id
                  ? 'bg-[var(--ag-accent)]/10'
                  : 'hover:bg-[var(--ag-panel-alt)]',
              ].join(' ')}
            >
              <td className="max-w-[320px] px-4 py-3">
                <div className="truncate font-medium text-[var(--ag-ink)]" title={trigger.name}>
                  {trigger.name}
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={trigger.targetFlow}>
                  {trigger.targetFlow}
                </div>
              </td>
              <td className="px-3 py-3 text-xs text-[var(--ag-ink-muted)]">
                {PROVIDER_LABEL[trigger.provider]}
              </td>
              <td className="px-3 py-3">
                <StatusPill status={trigger.status} />
              </td>
              <td className="px-3 py-3 tabular-nums text-[var(--ag-ink-muted)]">{trigger.runs24h}</td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--ag-ink-muted)]">
                {trigger.successRatePct}%
              </td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--ag-ink-subtle)]">
                {formatTime(trigger.lastFiredAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
          <div role="status" className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            Sidecar trigger registry unavailable. Showing local sample data.
          </div>
        )}

        <TriggerSummary triggers={triggers} />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter triggers by provider">
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
              {item === 'all' ? 'All' : PROVIDER_LABEL[item]}
            </button>
          ))}
        </div>

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
