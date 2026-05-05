import { AGENT_STATUS_LABEL } from './agent-labels'
import type { AgentStatus } from './use-agents'

const STATUS_TOKEN: Record<AgentStatus, string> = {
  ready: 'border-[color-mix(in_srgb,var(--ag-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-success)_12%,transparent)] text-[var(--ag-success)]',
  busy: 'border-[color-mix(in_srgb,var(--ag-accent)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-accent)_12%,transparent)] text-[var(--ag-accent)]',
  offline: 'border-[color-mix(in_srgb,var(--ag-ink-subtle)_30%,transparent)] bg-[color-mix(in_srgb,var(--ag-ink-subtle)_10%,transparent)] text-[var(--ag-ink-muted)]',
  needs_auth: 'border-[color-mix(in_srgb,var(--ag-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_12%,transparent)] text-[var(--ag-warning)]',
}

export function AgentStatusPill({ status }: { readonly status: AgentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${STATUS_TOKEN[status]}`}
    >
      {AGENT_STATUS_LABEL[status]}
    </span>
  )
}
