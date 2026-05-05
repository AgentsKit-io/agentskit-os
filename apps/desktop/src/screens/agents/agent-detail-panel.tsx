import { formatUsd } from '../../lib/format'
import { AGENT_PROVIDER_LABEL } from './agent-labels'
import { AgentStatusPill } from './agent-status-pill'
import type { AgentProfile } from './use-agents'

export function AgentDetailPanel({ agent }: { readonly agent: AgentProfile | null }) {
  if (agent === null) {
    return (
      <aside className="flex min-h-[320px] flex-col justify-center rounded-xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select an agent</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Inspect provider readiness, CLI linkage, capabilities, and recent performance.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <div className="border-b border-[var(--ag-line)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--ag-ink)]" title={agent.name}>
              {agent.name}
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={agent.id}>
              {agent.id}
            </p>
          </div>
          <AgentStatusPill status={agent.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <AgentMetric label="Provider" value={AGENT_PROVIDER_LABEL[agent.provider]} />
        <AgentMetric label="Version" value={agent.version} />
        <AgentMetric label="Success" value={`${agent.successRatePct}%`} />
        <AgentMetric label="Avg cost" value={formatUsd(agent.avgCostUsd)} />
      </div>

      <div className="border-b border-[var(--ag-line)] p-4">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
          CLI
        </h3>
        <div className="mt-2 rounded-lg border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 font-mono text-xs text-[var(--ag-ink-muted)]">
          {agent.cliCommand} --model {agent.model}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
          Capabilities
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {agent.capabilities.map((capability) => (
            <span
              key={capability}
              className="rounded-full border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-2.5 py-1 text-xs text-[var(--ag-ink-muted)]"
            >
              {capability}
            </span>
          ))}
        </div>
      </div>
    </aside>
  )
}

function AgentMetric({ label, value }: { readonly label: string; readonly value: string }) {
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
