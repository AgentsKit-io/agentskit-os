import { formatClockTime } from '../../lib/format'
import { AGENT_PROVIDER_LABEL } from './agent-labels'
import { AgentStatusPill } from './agent-status-pill'
import type { AgentProfile } from './use-agents'

type AgentListProps = {
  readonly agents: readonly AgentProfile[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
}

const ROW_BASE_CLASS = [
  'cursor-pointer transition focus-visible:outline focus-visible:outline-2',
  'focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ag-accent)]',
].join(' ')

export function AgentList({ agents, selectedId, onSelect }: AgentListProps) {
  return (
    <div className="min-h-0 overflow-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <table className="w-full min-w-[780px] border-collapse text-sm" aria-label="Agent registry">
        <thead>
          <tr className="border-b border-[var(--ag-line)] text-left text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            <th className="px-4 py-2 font-medium">Agent</th>
            <th className="px-3 py-2 font-medium">Provider</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Model</th>
            <th className="px-3 py-2 font-medium">Active</th>
            <th className="px-4 py-2 font-medium">Last run</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ag-line-soft)]">
          {agents.map((agent) => (
            <tr
              key={agent.id}
              tabIndex={0}
              aria-selected={selectedId === agent.id}
              onClick={() => onSelect(agent.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(agent.id)
                }
              }}
              className={[
                ROW_BASE_CLASS,
                selectedId === agent.id
                  ? 'bg-[color-mix(in_srgb,var(--ag-accent)_10%,transparent)]'
                  : 'hover:bg-[var(--ag-panel-alt)]',
              ].join(' ')}
            >
              <td className="max-w-[280px] px-4 py-3">
                <div className="truncate font-medium text-[var(--ag-ink)]" title={agent.name}>
                  {agent.name}
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-[var(--ag-ink-subtle)]">
                  {agent.cliCommand}
                </div>
              </td>
              <td className="px-3 py-3 text-xs text-[var(--ag-ink-muted)]">
                {AGENT_PROVIDER_LABEL[agent.provider]}
              </td>
              <td className="px-3 py-3">
                <AgentStatusPill status={agent.status} />
              </td>
              <td
                className="max-w-[180px] truncate px-3 py-3 font-mono text-xs text-[var(--ag-ink-muted)]"
                title={agent.model}
              >
                {agent.model}
              </td>
              <td className="px-3 py-3 tabular-nums text-[var(--ag-ink-muted)]">
                {agent.activeRuns}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--ag-ink-subtle)]">
                {formatClockTime(agent.lastRunAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
