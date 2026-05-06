import { describe, expect, it } from 'vitest'
import {
  buildSignedAuditBatch,
  createNullAuditSigner,
  GENESIS_PREV_HASH,
  verifyDataIntegrity,
} from '../../src/index.js'

const ULID = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
const HEX_64 = (seed: string): string => seed.repeat(64).slice(0, 64)
const signer = createNullAuditSigner(`pk-${'a'.repeat(80)}`)

const sha256 = async (s: string): Promise<string> => {
  const data = new TextEncoder().encode(s)
  const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  const buf = await crypto.subtle.digest('SHA-256', ab as ArrayBuffer)
  const bytes = new Uint8Array(buf)
  let hex = ''
  for (let i = 0; i < bytes.length; i += 1) hex += bytes[i]!.toString(16).padStart(2, '0')
  return hex
}

describe('verifyDataIntegrity (#241)', () => {
  it('passes for a clean audit + memory + lockfile bundle', async () => {
    const batch = await buildSignedAuditBatch(
      {
        batchId: ULID,
        workspaceId: 'ws',
        startedAt: '2026-05-06T12:00:00Z',
        endedAt: '2026-05-06T12:05:00Z',
        prevBatchHash: GENESIS_PREV_HASH,
        events: [{ eventId: ULID, eventHash: HEX_64('a') }],
      },
      signer,
    )
    const memContent = 'hello world'
    const report = await verifyDataIntegrity({
      auditBatches: [batch],
      memory: [{
        id: 'm1',
        content: memContent,
        recordedAt: '2026-05-06T12:00:00Z',
        contentHash: await sha256(memContent),
      }],
      lockfile: [{ name: 'left-pad', version: '1.0.0', integrity: 'sha512-abc==' }],
    })
    expect(report.ok).toBe(true)
    expect(report.issues).toEqual([])
  })

  it('flags memory hash mismatch', async () => {
    const report = await verifyDataIntegrity({
      auditBatches: [],
      memory: [{ id: 'm1', content: 'a', recordedAt: 't', contentHash: 'b'.repeat(64) }],
      lockfile: [],
    })
    expect(report.ok).toBe(false)
    expect(report.issues[0]?.code).toBe('memory.content_hash_mismatch')
  })

  it('flags lockfile duplicate diverging integrity + bad algorithm', async () => {
    const report = await verifyDataIntegrity({
      auditBatches: [],
      memory: [],
      lockfile: [
        { name: 'a', version: '1.0.0', integrity: 'md5-zzz' },
        { name: 'a', version: '1.0.0', integrity: 'sha256-abc' },
        { name: 'a', version: '1.0.0', integrity: 'sha256-DIFFERENT' },
      ],
    })
    const codes = report.issues.map((i) => i.code)
    expect(codes).toContain('lockfile.unknown_integrity_algorithm')
    expect(codes).toContain('lockfile.duplicate_diverging_integrity')
  })
})
