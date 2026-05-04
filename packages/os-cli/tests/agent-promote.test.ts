import { describe, expect, it } from 'vitest'
import { agentPromote } from '../src/commands/agent-promote.js'

const run = (argv: string[]) => agentPromote.run(argv)

describe('agent promote command', () => {
  it('exits 2 with help on --help', async () => {
    const r = await run(['--help'])
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('agent promote')
  })

  it('rejects missing --from/--to', async () => {
    const r = await run([])
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('--from and --to are required')
  })

  it('reports not_allowed for forbidden edges', async () => {
    const r = await run(['--from', 'draft', '--to', 'production'])
    expect(r.code).toBe(5)
    expect(r.stderr).toContain('not allowed')
  })

  it('reports missing checks', async () => {
    const r = await run(['--from', 'review', '--to', 'approved'])
    expect(r.code).toBe(6)
    expect(r.stderr).toContain('reviewer_signoff')
    expect(r.stderr).toContain('eval_passing')
  })

  it('emits audit event when checks satisfied', async () => {
    const r = await run([
      '--from', 'review', '--to', 'approved',
      '--check', 'reviewer_signoff',
      '--check', 'eval_passing',
      '--agent-id', 'sales-bot',
      '--actor', 'alice',
      '--json',
    ])
    expect(r.code).toBe(0)
    const event = JSON.parse(r.stdout.trim())
    expect(event.type).toBe('agent.lifecycle.transition')
    expect(event.agentId).toBe('sales-bot')
    expect(event.from).toBe('review')
    expect(event.to).toBe('approved')
    expect(event.satisfiedChecks).toEqual(['reviewer_signoff', 'eval_passing'])
  })

  it('escalates checks for critical risk on staged → production', async () => {
    const r = await run([
      '--from', 'staged', '--to', 'production',
      '--risk', 'critical',
      '--check', 'eval_passing',
    ])
    expect(r.code).toBe(6)
    expect(r.stderr).toContain('security_audit')
    expect(r.stderr).toContain('risk_committee_signoff')
  })
})
