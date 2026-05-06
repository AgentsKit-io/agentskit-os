import { AlertTriangle, Bot, CircleDollarSign, GitPullRequest, ShieldCheck } from 'lucide-react'

type NextAction = {
  readonly description: string
  readonly icon: typeof GitPullRequest
  readonly label: string
}

const ACTIONS: readonly NextAction[] = [
  {
    description: 'Draft an SDLC flow that delegates implementation, review, and verification.',
    icon: GitPullRequest,
    label: 'Create dev orchestrator',
  },
  {
    description: 'Register CLI providers so Codex, Claude Code, and Cursor can be coordinated.',
    icon: Bot,
    label: 'Connect agent providers',
  },
  {
    description: 'Set spend ceilings before high-volume benchmarks and multi-agent runs.',
    icon: CircleDollarSign,
    label: 'Add cost guard',
  },
  {
    description: 'Review policies for PHI/PII, approvals, and audit evidence.',
    icon: ShieldCheck,
    label: 'Govern sensitive flows',
  },
] as const

export function NextActions() {
  return (
    <section className="rounded-2xl border border-[var(--ag-line)] bg-[var(--ag-panel)] p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle aria-hidden className="h-4 w-4 text-[var(--ag-accent)]" />
        <h2 className="text-sm font-semibold text-[var(--ag-ink)]">Recommended next actions</h2>
      </div>
      <div className="mt-4 grid gap-2 lg:grid-cols-2">
        {ACTIONS.map((action) => (
          <div
            key={action.label}
            className="group flex items-start gap-3 rounded-xl border border-[var(--ag-line)] bg-[var(--ag-surface)] p-3 text-left transition"
          >
            <action.icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ag-ink-subtle)] group-hover:text-[var(--ag-accent)]" />
            <span>
              <span className="block text-sm font-medium text-[var(--ag-ink)]">{action.label}</span>
              <span className="mt-1 block text-xs leading-5 text-[var(--ag-ink-muted)]">
                {action.description}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

