// #341 — agent incident records with RCA, rollback, postmortem, and audit-export workflow.

export type IncidentSeverity = 'sev1' | 'sev2' | 'sev3' | 'sev4'

export type IncidentStatus =
  | 'open'
  | 'mitigated'
  | 'rolled_back'
  | 'resolved'
  | 'postmortem_pending'
  | 'closed'

export type IncidentTimelineEntry = {
  readonly at: string
  readonly actor: string
  readonly kind: 'detected' | 'triaged' | 'mitigated' | 'rolled_back' | 'resolved' | 'note' | 'rca' | 'postmortem'
  readonly note: string
}

export type IncidentRollbackAction = {
  readonly kind: 'revert_commit' | 'restore_snapshot' | 'disable_flow' | 'rotate_credentials' | 'manual_runbook' | 'custom'
  readonly target: string
  readonly executedAt?: string
  readonly executedBy?: string
  readonly outcome?: 'success' | 'failed' | 'partial'
  readonly note?: string
}

export type IncidentLink = {
  readonly kind: 'run' | 'trace' | 'pr' | 'issue' | 'log' | 'dashboard' | 'replay'
  readonly id: string
  readonly url?: string
}

export type IncidentCustomerImpact = {
  readonly affectedUsers?: number
  readonly affectedTenants?: readonly string[]
  readonly customerVisible: boolean
  readonly summary: string
}

export type IncidentRcaNotes = {
  readonly contributingFactors: readonly string[]
  readonly rootCause?: string
  readonly correctiveActions: readonly string[]
}

export type AgentIncident = {
  readonly schemaVersion: '1.0'
  readonly incidentId: string
  readonly title: string
  readonly severity: IncidentSeverity
  readonly status: IncidentStatus
  readonly openedAt: string
  readonly closedAt?: string
  readonly owner: string
  readonly affectedAgents: readonly string[]
  readonly affectedFlows: readonly string[]
  readonly links: readonly IncidentLink[]
  readonly timeline: readonly IncidentTimelineEntry[]
  readonly rollback?: IncidentRollbackAction
  readonly rca?: IncidentRcaNotes
  readonly customerImpact?: IncidentCustomerImpact
  readonly postmortemUrl?: string
  readonly tags: readonly string[]
}

const safeId = (s: string): string => s.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 48)

export type CreateAgentIncidentInput = {
  readonly title: string
  readonly severity: IncidentSeverity
  readonly owner: string
  readonly openedAt?: string
  readonly affectedAgents?: readonly string[]
  readonly affectedFlows?: readonly string[]
  readonly links?: readonly IncidentLink[]
  readonly timeline?: readonly IncidentTimelineEntry[]
  readonly tags?: readonly string[]
  readonly idPrefix?: string
}

export const createAgentIncident = (input: CreateAgentIncidentInput): AgentIncident => {
  const openedAt = input.openedAt ?? new Date().toISOString()
  const titleSlug = safeId(input.title)
  const incidentId = `${input.idPrefix ?? 'inc'}-${input.severity}-${titleSlug}-${openedAt.replace(/[^0-9]/g, '').slice(0, 14)}`
  const detected: IncidentTimelineEntry = {
    at: openedAt,
    actor: input.owner,
    kind: 'detected',
    note: input.title,
  }
  const timeline = input.timeline && input.timeline.length > 0 ? input.timeline : [detected]
  return {
    schemaVersion: '1.0',
    incidentId,
    title: input.title,
    severity: input.severity,
    status: 'open',
    openedAt,
    owner: input.owner,
    affectedAgents: input.affectedAgents ?? [],
    affectedFlows: input.affectedFlows ?? [],
    links: input.links ?? [],
    timeline,
    tags: input.tags ?? [],
  }
}

export type IncidentTransition =
  | { readonly kind: 'note'; readonly at?: string; readonly actor: string; readonly note: string }
  | { readonly kind: 'mitigate'; readonly at?: string; readonly actor: string; readonly note: string }
  | {
      readonly kind: 'rollback'
      readonly at?: string
      readonly actor: string
      readonly action: IncidentRollbackAction
      readonly note?: string
    }
  | {
      readonly kind: 'rca'
      readonly at?: string
      readonly actor: string
      readonly rca: IncidentRcaNotes
      readonly note?: string
    }
  | { readonly kind: 'resolve'; readonly at?: string; readonly actor: string; readonly note: string }
  | {
      readonly kind: 'postmortem'
      readonly at?: string
      readonly actor: string
      readonly url: string
      readonly note?: string
    }
  | { readonly kind: 'close'; readonly at?: string; readonly actor: string; readonly note: string }

const append = (
  inc: AgentIncident,
  entry: IncidentTimelineEntry,
): readonly IncidentTimelineEntry[] => [...inc.timeline, entry]

export const applyIncidentTransition = (inc: AgentIncident, t: IncidentTransition): AgentIncident => {
  const at = t.at ?? new Date().toISOString()
  switch (t.kind) {
    case 'note':
      return { ...inc, timeline: append(inc, { at, actor: t.actor, kind: 'note', note: t.note }) }
    case 'mitigate':
      return {
        ...inc,
        status: inc.status === 'open' ? 'mitigated' : inc.status,
        timeline: append(inc, { at, actor: t.actor, kind: 'mitigated', note: t.note }),
      }
    case 'rollback': {
      const executedAt = t.action.executedAt ?? at
      const executedBy = t.action.executedBy ?? t.actor
      const rollbackNote = t.note ?? `${t.action.kind}:${t.action.target}`
      return {
        ...inc,
        status: 'rolled_back',
        rollback: { ...t.action, executedAt, executedBy },
        timeline: append(inc, { at, actor: t.actor, kind: 'rolled_back', note: rollbackNote }),
      }
    }
    case 'rca': {
      const rcaDefault = t.rca.rootCause ?? 'rca recorded'
      const rcaNote = t.note ?? rcaDefault
      return {
        ...inc,
        rca: t.rca,
        timeline: append(inc, { at, actor: t.actor, kind: 'rca', note: rcaNote }),
      }
    }
    case 'resolve':
      return {
        ...inc,
        status: 'resolved',
        timeline: append(inc, { at, actor: t.actor, kind: 'resolved', note: t.note }),
      }
    case 'postmortem':
      return {
        ...inc,
        status: 'postmortem_pending',
        postmortemUrl: t.url,
        timeline: append(inc, { at, actor: t.actor, kind: 'postmortem', note: t.note ?? t.url }),
      }
    case 'close':
      return {
        ...inc,
        status: 'closed',
        closedAt: at,
        timeline: append(inc, { at, actor: t.actor, kind: 'note', note: t.note }),
      }
    default: {
      const _x: never = t
      throw new Error(`unknown transition: ${String(_x)}`)
    }
  }
}

export type IncidentAuditExport = {
  readonly schemaVersion: '1.0'
  readonly exportedAt: string
  readonly incident: AgentIncident
  readonly evidence: {
    readonly linksByKind: Record<IncidentLink['kind'], readonly string[]>
    readonly timelineEvents: number
    readonly hasRca: boolean
    readonly hasRollback: boolean
    readonly hasPostmortem: boolean
    readonly customerVisible: boolean
  }
}

export const buildIncidentAuditExport = (inc: AgentIncident, exportedAt?: string): IncidentAuditExport => {
  const linksByKind: Record<IncidentLink['kind'], string[]> = {
    run: [], trace: [], pr: [], issue: [], log: [], dashboard: [], replay: [],
  }
  for (const l of inc.links) linksByKind[l.kind].push(l.id)
  return {
    schemaVersion: '1.0',
    exportedAt: exportedAt ?? new Date().toISOString(),
    incident: inc,
    evidence: {
      linksByKind,
      timelineEvents: inc.timeline.length,
      hasRca: inc.rca !== undefined,
      hasRollback: inc.rollback !== undefined,
      hasPostmortem: inc.postmortemUrl !== undefined,
      customerVisible: inc.customerImpact?.customerVisible ?? false,
    },
  }
}

export const renderIncidentMarkdown = (inc: AgentIncident): string => {
  const lines: string[] = []
  lines.push(`# Incident ${inc.incidentId} — ${inc.title}`)
  lines.push('')
  lines.push(`- **Severity:** ${inc.severity}`)
  lines.push(`- **Status:** ${inc.status}`)
  lines.push(`- **Owner:** ${inc.owner}`)
  lines.push(`- **Opened:** ${inc.openedAt}`)
  if (inc.closedAt !== undefined) lines.push(`- **Closed:** ${inc.closedAt}`)
  if (inc.affectedAgents.length > 0) lines.push(`- **Agents:** ${inc.affectedAgents.join(', ')}`)
  if (inc.affectedFlows.length > 0) lines.push(`- **Flows:** ${inc.affectedFlows.join(', ')}`)
  lines.push('')
  if (inc.customerImpact !== undefined) {
    lines.push('## Customer impact')
    lines.push('')
    lines.push(`- Customer visible: **${inc.customerImpact.customerVisible}**`)
    if (inc.customerImpact.affectedUsers !== undefined)
      lines.push(`- Affected users: ${inc.customerImpact.affectedUsers}`)
    if (inc.customerImpact.affectedTenants && inc.customerImpact.affectedTenants.length > 0)
      lines.push(`- Tenants: ${inc.customerImpact.affectedTenants.join(', ')}`)
    lines.push('')
    lines.push(inc.customerImpact.summary)
    lines.push('')
  }
  lines.push('## Timeline')
  lines.push('')
  for (const t of inc.timeline) {
    lines.push(`- \`${t.at}\` **${t.kind}** by ${t.actor} — ${t.note}`)
  }
  lines.push('')
  if (inc.rollback !== undefined) {
    lines.push('## Rollback')
    lines.push('')
    lines.push(`- **Kind:** ${inc.rollback.kind}`)
    lines.push(`- **Target:** \`${inc.rollback.target}\``)
    if (inc.rollback.outcome !== undefined) lines.push(`- **Outcome:** ${inc.rollback.outcome}`)
    if (inc.rollback.note !== undefined) lines.push(`- ${inc.rollback.note}`)
    lines.push('')
  }
  if (inc.rca !== undefined) {
    lines.push('## RCA')
    lines.push('')
    if (inc.rca.rootCause !== undefined) lines.push(`**Root cause:** ${inc.rca.rootCause}`)
    if (inc.rca.contributingFactors.length > 0) {
      lines.push('')
      lines.push('**Contributing factors:**')
      for (const f of inc.rca.contributingFactors) lines.push(`- ${f}`)
    }
    if (inc.rca.correctiveActions.length > 0) {
      lines.push('')
      lines.push('**Corrective actions:**')
      for (const a of inc.rca.correctiveActions) lines.push(`- ${a}`)
    }
    lines.push('')
  }
  if (inc.postmortemUrl !== undefined) {
    lines.push(`## Postmortem`)
    lines.push('')
    lines.push(`- ${inc.postmortemUrl}`)
    lines.push('')
  }
  return lines.join('\n')
}
