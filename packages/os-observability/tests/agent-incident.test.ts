import { describe, expect, it } from 'vitest'
import {
  applyIncidentTransition,
  buildIncidentAuditExport,
  createAgentIncident,
  renderIncidentMarkdown,
  type AgentIncident,
} from '../src/agent-incident.js'

const newInc = (): AgentIncident =>
  createAgentIncident({
    title: 'coding-agent over-budget run',
    severity: 'sev2',
    owner: 'oncall@acme',
    openedAt: '2026-05-05T10:00:00.000Z',
    affectedAgents: ['codex'],
    affectedFlows: ['issue-to-pr'],
    links: [
      { kind: 'run', id: 'run-42', url: 'https://x/runs/42' },
      { kind: 'trace', id: 'trace-42' },
    ],
    tags: ['cost', 'codex'],
  })

describe('createAgentIncident', () => {
  it('starts in `open` with detected timeline entry', () => {
    const inc = newInc()
    expect(inc.status).toBe('open')
    expect(inc.timeline).toHaveLength(1)
    expect(inc.timeline[0]?.kind).toBe('detected')
    expect(inc.incidentId).toContain('sev2')
  })
})

describe('applyIncidentTransition', () => {
  it('mitigate moves status and appends timeline', () => {
    const inc = applyIncidentTransition(newInc(), {
      kind: 'mitigate',
      actor: 'oncall@acme',
      at: '2026-05-05T10:05:00.000Z',
      note: 'capped concurrency to 1',
    })
    expect(inc.status).toBe('mitigated')
    expect(inc.timeline.at(-1)?.kind).toBe('mitigated')
  })

  it('rollback records action with executor + outcome', () => {
    const inc = applyIncidentTransition(newInc(), {
      kind: 'rollback',
      actor: 'oncall@acme',
      at: '2026-05-05T10:10:00.000Z',
      action: { kind: 'revert_commit', target: 'abc123', outcome: 'success' },
      note: 'reverted bad merge',
    })
    expect(inc.status).toBe('rolled_back')
    expect(inc.rollback?.executedBy).toBe('oncall@acme')
    expect(inc.rollback?.outcome).toBe('success')
  })

  it('rca + resolve + postmortem + close progress full lifecycle', () => {
    let inc = newInc()
    inc = applyIncidentTransition(inc, {
      kind: 'rca',
      actor: 'sre',
      rca: { rootCause: 'token leak in prompt', contributingFactors: ['no redaction'], correctiveActions: ['add filter'] },
    })
    expect(inc.rca?.rootCause).toContain('token leak')

    inc = applyIncidentTransition(inc, { kind: 'resolve', actor: 'sre', note: 'patched' })
    expect(inc.status).toBe('resolved')

    inc = applyIncidentTransition(inc, { kind: 'postmortem', actor: 'sre', url: 'https://docs/x' })
    expect(inc.status).toBe('postmortem_pending')
    expect(inc.postmortemUrl).toBe('https://docs/x')

    inc = applyIncidentTransition(inc, { kind: 'close', actor: 'sre', note: 'done' })
    expect(inc.status).toBe('closed')
    expect(inc.closedAt).toBeDefined()
  })
})

describe('buildIncidentAuditExport', () => {
  it('flattens links and surfaces evidence flags', () => {
    const inc = newInc()
    const audit = buildIncidentAuditExport(inc, '2026-05-05T11:00:00.000Z')
    expect(audit.evidence.linksByKind.run).toEqual(['run-42'])
    expect(audit.evidence.linksByKind.trace).toEqual(['trace-42'])
    expect(audit.evidence.timelineEvents).toBe(1)
    expect(audit.evidence.hasRca).toBe(false)
  })
})

describe('renderIncidentMarkdown', () => {
  it('includes timeline + rollback + rca sections', () => {
    let inc = newInc()
    inc = applyIncidentTransition(inc, {
      kind: 'rollback',
      actor: 'oncall',
      action: { kind: 'revert_commit', target: 'abc' },
    })
    inc = applyIncidentTransition(inc, {
      kind: 'rca',
      actor: 'sre',
      rca: { contributingFactors: ['x'], correctiveActions: ['y'], rootCause: 'z' },
    })
    const md = renderIncidentMarkdown(inc)
    expect(md).toContain('## Timeline')
    expect(md).toContain('## Rollback')
    expect(md).toContain('## RCA')
    expect(md).toContain('**Root cause:** z')
  })
})
