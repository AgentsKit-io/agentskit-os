import type { AgentProfile } from './use-agents'

export function AgentSummary({ agents }: { readonly agents: readonly AgentProfile[] }) {
  const ready = agents.filter((agent) => agent.status === 'ready').length
  const busy = agents.filter((agent) => agent.status === 'busy').length
  const auth = agents.filter((agent) => agent.status === 'needs_auth').length
  const activeRuns = agents.reduce((total, agent) => total + agent.activeRuns, 0)

  const items = [
    { label: 'Ready', value: ready.toString() },
    { label: 'Busy', value: busy.toString() },
    { label: 'Auth needed', value: auth.toString() },
    { label: 'Active runs', value: activeRuns.toString() },
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
