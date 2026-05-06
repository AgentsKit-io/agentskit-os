import { formatDateTime } from '../../lib/format'
import { HITL_KIND_LABEL, HITL_RISK_LABEL } from './hitl-labels'
import { HitlStatusPill } from './hitl-pills'
import type { HitlRequest, HitlStatus } from './use-hitl'

type HitlDetailPanelProps = {
  readonly request: HitlRequest | null
  readonly escalationNotes: Readonly<Partial<Record<string, string>>>
  readonly statusOf: (request: HitlRequest) => HitlStatus
  readonly onApprove: (id: string) => void
  readonly onReject: (id: string) => void
  readonly onEscalate: (id: string) => void
}

const DECISION_BUTTON_BASE = 'rounded-full border px-3 py-1.5 text-sm font-medium transition'

export function HitlDetailPanel({
  request,
  escalationNotes,
  statusOf,
  onApprove,
  onReject,
  onEscalate,
}: HitlDetailPanelProps) {
  if (request === null) {
    return (
      <aside className="flex min-h-[320px] flex-col justify-center rounded-xl border border-dashed border-[var(--ag-line)] bg-[var(--ag-panel)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--ag-ink)]">Select an approval</p>
        <p className="mt-1 text-sm text-[var(--ag-ink-muted)]">
          Inspect why the agent paused, what evidence it produced, and which run it belongs to.
        </p>
      </aside>
    )
  }

  return (
    <aside className="min-h-0 overflow-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)]">
      <div className="border-b border-[var(--ag-line)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--ag-ink)]" title={request.title}>
              {request.title}
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-[var(--ag-ink-subtle)]" title={request.id}>
              {request.id}
            </p>
          </div>
          <HitlStatusPill status={statusOf(request)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--ag-line)] p-4">
        <HitlMetric label="Kind" value={HITL_KIND_LABEL[request.kind]} />
        <HitlMetric label="Risk" value={HITL_RISK_LABEL[request.risk]} />
        <HitlMetric label="Agent" value={request.agent} />
        <HitlMetric label="Created" value={formatDateTime(request.createdAt)} />
      </div>

      {escalationNotes[request.id] !== undefined && (
        <div className="border-b border-[color-mix(in_srgb,var(--ag-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_12%,transparent)] px-4 py-2 text-sm text-[var(--ag-warning)]">
          {escalationNotes[request.id]}
        </div>
      )}

      {statusOf(request) === 'pending' && (
        <div className="flex flex-wrap gap-2 border-b border-[var(--ag-line)] p-4">
          <DecisionButton tone="approve" label="Approve" onClick={() => onApprove(request.id)} />
          <DecisionButton tone="reject" label="Reject" onClick={() => onReject(request.id)} />
          <DecisionButton tone="escalate" label="Escalate" onClick={() => onEscalate(request.id)} />
        </div>
      )}

      <HitlTraceLink request={request} />
      <PolicyContext request={request} />
      <HitlBlock label="Summary" value={request.summary} />
      <HitlBlock label="Requester" value={request.requester} />
      <HitlBlock label="Run" value={request.runId} mono />
      <HitlEvidence items={request.evidence} />
    </aside>
  )
}

function DecisionButton({
  tone,
  label,
  onClick,
}: {
  readonly tone: 'approve' | 'reject' | 'escalate'
  readonly label: string
  readonly onClick: () => void
}) {
  const toneClass = {
    approve: 'border-[color-mix(in_srgb,var(--ag-success)_42%,transparent)] bg-[color-mix(in_srgb,var(--ag-success)_14%,transparent)] text-[var(--ag-success)] hover:bg-[color-mix(in_srgb,var(--ag-success)_22%,transparent)]',
    reject: 'border-[color-mix(in_srgb,var(--ag-danger)_42%,transparent)] bg-[color-mix(in_srgb,var(--ag-danger)_14%,transparent)] text-[var(--ag-danger)] hover:bg-[color-mix(in_srgb,var(--ag-danger)_22%,transparent)]',
    escalate: 'border-[color-mix(in_srgb,var(--ag-warning)_42%,transparent)] bg-[color-mix(in_srgb,var(--ag-warning)_14%,transparent)] text-[var(--ag-warning)] hover:bg-[color-mix(in_srgb,var(--ag-warning)_22%,transparent)]',
  }[tone]

  return (
    <button type="button" className={`${DECISION_BUTTON_BASE} ${toneClass}`} onClick={onClick}>
      {label}
    </button>
  )
}

function HitlMetric({ label, value }: { readonly label: string; readonly value: string }) {
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

function HitlTraceLink({ request }: { readonly request: HitlRequest }) {
  return (
    <div className="border-b border-[var(--ag-line)] p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
        Trace
      </h3>
      <a
        className="mt-2 inline-block text-sm font-medium text-[var(--ag-accent)] hover:underline"
        href={request.traceUrl ?? `#/traces/${encodeURIComponent(request.runId)}`}
      >
        Open trace for {request.runId}
      </a>
    </div>
  )
}

function PolicyContext({ request }: { readonly request: HitlRequest }) {
  if ((request.policyRuleIds?.length ?? 0) === 0) return null

  return (
    <div className="border-b border-[var(--ag-line)] p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
        Policy context
      </h3>
      <ul className="mt-2 flex flex-col gap-1">
        {(request.policyRuleIds ?? []).map((rule) => (
          <li key={rule} className="font-mono text-xs text-[var(--ag-ink-muted)]">
            {rule}
          </li>
        ))}
      </ul>
    </div>
  )
}

function HitlBlock({
  label,
  value,
  mono = false,
}: {
  readonly label: string
  readonly value: string
  readonly mono?: boolean
}) {
  return (
    <div className="border-b border-[var(--ag-line)] p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
        {label}
      </h3>
      <div
        className={[
          'mt-2 rounded-lg border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]',
          mono ? 'font-mono text-xs' : '',
        ].join(' ')}
      >
        {value}
      </div>
    </div>
  )
}

function HitlEvidence({ items }: { readonly items: readonly string[] }) {
  return (
    <div className="p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
        Evidence
      </h3>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-lg border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-2 text-sm text-[var(--ag-ink-muted)]"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
