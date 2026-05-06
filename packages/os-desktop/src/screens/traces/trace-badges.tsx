import type { SpanKind, SpanStatus } from './use-traces'

const TRACE_STATUS_LABEL: Record<SpanStatus, string> = {
  ok: 'Ok',
  error: 'Error',
  skipped: 'Skipped',
  paused: 'Paused',
  cancelled: 'Cancelled',
}

const STATUS_TOKEN: Record<SpanStatus, string> = {
  ok: 'border-[color-mix(in_srgb,var(--ag-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-success)_12%,transparent)] text-[var(--ag-success)]',
  error: 'border-[color-mix(in_srgb,var(--ag-danger)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-danger)_12%,transparent)] text-[var(--ag-danger)]',
  skipped: 'border-[color-mix(in_srgb,var(--ag-ink-subtle)_30%,transparent)] bg-[color-mix(in_srgb,var(--ag-ink-subtle)_10%,transparent)] text-[var(--ag-ink-muted)]',
  paused: 'border-[color-mix(in_srgb,var(--ag-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_12%,transparent)] text-[var(--ag-warning)]',
  cancelled:
    'border-[color-mix(in_srgb,var(--ag-ink-subtle)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-accent)_8%,transparent)] text-[var(--ag-ink-muted)]',
}

const KIND_TOKEN: Record<SpanKind, string> = {
  flow: 'border-[color-mix(in_srgb,var(--ag-accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--ag-accent)_10%,transparent)] text-[var(--ag-accent)]',
  agent: 'border-[color-mix(in_srgb,var(--ag-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--ag-success)_10%,transparent)] text-[var(--ag-success)]',
  tool: 'border-[color-mix(in_srgb,var(--ag-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_10%,transparent)] text-[var(--ag-warning)]',
  human: 'border-[color-mix(in_srgb,var(--ag-danger)_28%,transparent)] bg-[color-mix(in_srgb,var(--ag-danger)_10%,transparent)] text-[var(--ag-danger)]',
  unknown: 'border-[color-mix(in_srgb,var(--ag-ink-subtle)_28%,transparent)] bg-[color-mix(in_srgb,var(--ag-ink-subtle)_10%,transparent)] text-[var(--ag-ink-muted)]',
}

const MODE_TOKEN: Record<string, string> = {
  deterministic: 'border-[color-mix(in_srgb,var(--ag-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--ag-success)_10%,transparent)] text-[var(--ag-success)]',
  dry_run: 'border-[color-mix(in_srgb,var(--ag-ink-subtle)_28%,transparent)] bg-[color-mix(in_srgb,var(--ag-ink-subtle)_10%,transparent)] text-[var(--ag-ink-muted)]',
  preview: 'border-[color-mix(in_srgb,var(--ag-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_10%,transparent)] text-[var(--ag-warning)]',
  real: 'border-[color-mix(in_srgb,var(--ag-accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--ag-accent)_10%,transparent)] text-[var(--ag-accent)]',
  replay: 'border-[color-mix(in_srgb,var(--ag-accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--ag-accent)_10%,transparent)] text-[var(--ag-accent)]',
  simulate: 'border-[color-mix(in_srgb,var(--ag-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_10%,transparent)] text-[var(--ag-warning)]',
}

const BADGE_CLASS = 'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-medium'

export function TraceStatusBadge({ status }: { readonly status: SpanStatus }) {
  return (
    <span className={`${BADGE_CLASS} ${STATUS_TOKEN[status]}`}>
      {TRACE_STATUS_LABEL[status]}
    </span>
  )
}

export function TraceKindBadge({ kind }: { readonly kind: SpanKind }) {
  return <span className={`${BADGE_CLASS} ${KIND_TOKEN[kind]}`}>{kind}</span>
}

export function TraceModeBadge({ mode }: { readonly mode: string }) {
  return (
    <span className={`${BADGE_CLASS} ${MODE_TOKEN[mode] ?? MODE_TOKEN.real}`}>
      {mode}
    </span>
  )
}

export function traceStatusTextClass(status: SpanStatus): string {
  return {
    error: 'text-[var(--ag-danger)]',
    ok: 'text-[var(--ag-success)]',
    paused: 'text-[var(--ag-warning)]',
    skipped: 'text-[var(--ag-ink-muted)]',
    cancelled: 'text-[var(--ag-ink-muted)]',
  }[status]
}
