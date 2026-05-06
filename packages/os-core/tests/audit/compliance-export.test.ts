import { describe, expect, it } from 'vitest'
import {
  buildComplianceExportBundle,
  buildSignedAuditBatch,
  createInMemoryHitlInbox,
  createNullAuditSigner,
} from '../../src/index.js'

const ULID = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
const HEX = (seed: string): string => seed.repeat(64).slice(0, 64)
const signer = createNullAuditSigner(`pk-${'a'.repeat(80)}`)

const fixture = async () => {
  const batch = await buildSignedAuditBatch(
    {
      batchId: ULID,
      workspaceId: 'ws',
      startedAt: '2026-05-06T12:00:00Z',
      endedAt: '2026-05-06T12:05:00Z',
      events: [{ eventId: ULID, eventHash: HEX('a') }],
    },
    signer,
  )
  const inbox = createInMemoryHitlInbox()
  inbox.enqueue({
    schemaVersion: 1,
    id: 't1',
    createdAt: '2026-05-06T12:00:00Z',
    prompt: 'Approve?',
    approvers: [],
    quorum: 1,
    tags: [],
  })
  inbox.decide({ id: 't1', by: 'lead', decision: 'approved', at: '2026-05-06T12:01:00Z' })
  return { batch, inbox }
}

describe('buildComplianceExportBundle (#111)', () => {
  it('builds a SOC2 bundle with controls checklist', async () => {
    const { batch, inbox } = await fixture()
    const bundle = buildComplianceExportBundle(
      {
        workspaceId: 'ws',
        regime: 'soc2',
        windowStartIso: '2026-05-01',
        windowEndIso: '2026-05-31',
        auditBatches: [batch],
        hitlDecisions: inbox.list(),
        policySnapshot: { runMode: 'auto' },
        redactionProfileId: 'pii-strict',
        build: { version: '1.2.3', commitSha: 'deadbeef' },
      },
      { clock: () => '2026-05-06T12:00:00Z' },
    )
    expect(bundle.regime).toBe('soc2')
    expect(bundle.summary.auditBatchCount).toBe(1)
    expect(bundle.summary.hitlApprovedCount).toBe(1)
    expect(bundle.controlsChecklist.length).toBeGreaterThan(0)
    const ids = bundle.artifacts.map((a) => a.id)
    expect(ids).toContain('audit-chain')
    expect(ids).toContain('redaction-profile')
  })

  it('emits regime-specific controls', async () => {
    const { batch, inbox } = await fixture()
    const hipaa = buildComplianceExportBundle({
      workspaceId: 'ws',
      regime: 'hipaa',
      windowStartIso: 'a', windowEndIso: 'b',
      auditBatches: [batch],
      hitlDecisions: inbox.list(),
      policySnapshot: {},
      redactionProfileId: 'hipaa-safe-harbor',
      build: { version: '1.0.0' },
    })
    expect(hipaa.controlsChecklist.some((c) => c.control.includes('§164'))).toBe(true)

    const gdpr = buildComplianceExportBundle({
      workspaceId: 'ws',
      regime: 'gdpr',
      windowStartIso: 'a', windowEndIso: 'b',
      auditBatches: [batch],
      hitlDecisions: inbox.list(),
      policySnapshot: {},
      redactionProfileId: 'pii-strict',
      build: { version: '1.0.0' },
    })
    expect(gdpr.controlsChecklist.some((c) => c.control.includes('Art.'))).toBe(true)
  })
})
