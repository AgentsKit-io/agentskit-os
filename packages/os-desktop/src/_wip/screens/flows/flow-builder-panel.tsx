import { Bot, Database, GitBranch, MessageSquare, Play, Sparkles, Workflow } from 'lucide-react'

const STARTERS = [
  {
    id: 'sdlc',
    title: 'SDLC orchestrator',
    description: 'Plan, delegate, review, verify, and report across coding agents.',
    icon: GitBranch,
  },
  {
    id: 'clinic',
    title: 'Clinic intake',
    description: 'Ingest requests, redact sensitive data, summarize, and route approvals.',
    icon: Database,
  },
  {
    id: 'marketing',
    title: 'Campaign desk',
    description: 'Turn a brief into research, copy, review, assets, and publishing tasks.',
    icon: MessageSquare,
  },
] as const

const BUILD_STEPS = [
  { label: 'Describe', icon: MessageSquare },
  { label: 'Draft', icon: Sparkles },
  { label: 'Connect', icon: Bot },
  { label: 'Simulate', icon: Play },
  { label: 'Run', icon: Workflow },
] as const

const INTENT_TEXTAREA_CLASS = [
  'w-full resize-none rounded-xl border border-transparent bg-transparent px-2 py-2',
  'text-sm leading-6 text-[var(--ag-ink)] outline-none',
  'placeholder:text-[var(--ag-ink-subtle)] focus:border-[var(--ag-accent)]',
].join(' ')

export function FlowBuilderPanel() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <section className="rounded-2xl border border-[var(--ag-line)] bg-[var(--ag-panel)]/80 p-5">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            Build
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--ag-ink)]">
            Describe the automation. AgentsKitOS turns it into an editable flow.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--ag-ink-muted)]">
            Start with a task, a template, or a connected system. The flow stays readable for
            non-technical users and inspectable for operators.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--ag-line)] bg-[var(--ag-surface)] p-3">
          <label htmlFor="flow-intent" className="sr-only">
            Describe the flow you want to build
          </label>
          <textarea
            id="flow-intent"
            rows={3}
            className={INTENT_TEXTAREA_CLASS}
            placeholder="Example: watch GitHub PRs, ask Codex to implement fixes, ask Claude to review, run tests, then post a Slack report."
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ag-line-soft)] pt-3">
            <div className="flex flex-wrap gap-2">
              {['GitHub', 'Slack', 'Codex', 'Claude', 'Approval'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--ag-line)] bg-[var(--ag-panel-alt)] px-2.5 py-1 text-xs text-[var(--ag-ink-muted)]"
                >
                  {item}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="rounded-full bg-[var(--ag-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--ag-accent-hover)] active:scale-[0.97]"
            >
              Draft flow
            </button>
          </div>
        </div>
      </section>

      <aside className="rounded-2xl border border-[var(--ag-line)] bg-[var(--ag-glass-bg)] p-5 shadow-[var(--ag-glass-shadow)] [backdrop-filter:var(--ag-glass-blur)]">
        <h2 className="text-sm font-semibold text-[var(--ag-ink)]">Natural build loop</h2>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {BUILD_STEPS.map((step) => (
            <div key={step.label} className="min-w-0 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[var(--ag-line)] bg-[var(--ag-panel)]">
                <step.icon aria-hidden className="h-4 w-4 text-[var(--ag-accent)]" />
              </div>
              <div className="mt-2 truncate text-[11px] text-[var(--ag-ink-muted)]">
                {step.label}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-2">
          {STARTERS.map((starter) => (
            <button
              key={starter.id}
              type="button"
              className="group flex items-start gap-3 rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)] p-3 text-left transition hover:border-[var(--ag-accent)] hover:bg-[var(--ag-panel-alt)]"
            >
              <starter.icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ag-ink-subtle)] group-hover:text-[var(--ag-accent)]" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-[var(--ag-ink)]">{starter.title}</span>
                <span className="mt-1 block text-xs leading-5 text-[var(--ag-ink-muted)]">
                  {starter.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  )
}
