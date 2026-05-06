import { ArrowRight, Command, Play } from 'lucide-react'
import { Badge } from '@agentskit/os-ui'
import type { RunMode, SidecarStatus } from '../../lib/sidecar'

const RUN_MODE_LABEL: Record<RunMode, string> = {
  dry_run: 'dry run',
  preview: 'preview',
  real: 'real',
  sandbox: 'sandbox',
}

const SECONDARY_ACTION_CLASS = [
  'inline-flex items-center gap-2 rounded-full border border-[var(--ag-line)]',
  'bg-[var(--ag-panel)] px-4 py-2 text-sm font-medium text-[var(--ag-ink)] transition',
  'hover:border-[var(--ag-accent)] hover:text-[var(--ag-accent)]',
].join(' ')

type HomeHeroProps = {
  readonly onChangeRunMode: (mode: RunMode) => void
  readonly onDeploy: () => void
  readonly onOpenRuns: () => void
  readonly runMode: RunMode
  readonly status: SidecarStatus
  readonly workspaceName: string
}

function ConnectionBadge({ status }: { readonly status: SidecarStatus }) {
  const connected = status === 'connected'
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ag-line)] px-2.5 py-1 text-xs font-medium text-[var(--ag-ink-muted)]">
      <span
        className={[
          'h-1.5 w-1.5 rounded-full',
          connected ? 'bg-[var(--ag-success)]' : 'bg-[var(--ag-ink-subtle)]',
        ].join(' ')}
      />
      {connected ? 'Connected' : 'Disconnected'}
    </span>
  )
}

export function HomeHero({
  onChangeRunMode,
  onDeploy,
  onOpenRuns,
  runMode,
  status,
  workspaceName,
}: HomeHeroProps) {
  const isProd = runMode === 'real'

  return (
    <section className="rounded-3xl border border-[var(--ag-line)] bg-[var(--ag-glass-bg)] p-5 shadow-[var(--ag-glass-shadow)] [backdrop-filter:var(--ag-glass-blur)] sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
              Home
            </p>
            <Badge variant="outline">{RUN_MODE_LABEL[runMode]}</Badge>
            <ConnectionBadge status={status} />
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--ag-ink)] sm:text-3xl">
            {workspaceName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ag-ink-muted)]">
            Start from intent, keep runs observable, and move from draft to governed automation without exposing package complexity.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={SECONDARY_ACTION_CLASS}
            onClick={onOpenRuns}
          >
            <Play aria-hidden className="h-4 w-4" />
            Open runs
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--ag-line-soft)] pt-4">
        <button
          type="button"
          className="rounded-full border border-[var(--ag-line)] px-3 py-1.5 text-xs font-medium text-[var(--ag-ink-muted)] transition hover:border-[var(--ag-accent)] hover:text-[var(--ag-ink)]"
          onClick={() => onChangeRunMode(isProd ? 'preview' : 'real')}
          title="Toggle between preview and real execution."
        >
          {isProd ? 'Prod: real' : 'Dev: preview'}
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--ag-line)] px-3 py-1.5 text-xs font-medium text-[var(--ag-ink-muted)] transition hover:border-[var(--ag-accent)] hover:text-[var(--ag-ink)]"
          onClick={onDeploy}
        >
          Deploy to Cloud
        </button>
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-[var(--ag-ink-subtle)]">
          <Command aria-hidden className="h-3.5 w-3.5" />
          Cmd K opens every advanced surface
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </span>
      </div>
    </section>
  )
}
