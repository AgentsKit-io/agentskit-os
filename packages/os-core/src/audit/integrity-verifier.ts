// Per #241 — data integrity verifier across audit chain + memory + lockfile.
// Pure: caller supplies the three streams; verifier returns one report with
// per-section status the CLI can render.

import {
  GENESIS_PREV_HASH,
  computeBatchDigest,
  computeMerkleRoot,
  type AuditBatch,
} from './batch.js'
import { sha256Hex } from './sha256.js'

export type IntegrityIssue = {
  readonly section: 'audit' | 'memory' | 'lockfile'
  readonly code: string
  readonly message: string
  readonly index?: number
}

export type IntegrityReport = {
  readonly ok: boolean
  readonly issues: readonly IntegrityIssue[]
}

export type MemoryRecord = {
  readonly id: string
  readonly content: string
  readonly recordedAt: string
  /** Hex SHA-256 of the canonical content. */
  readonly contentHash: string
}

export type LockfileEntry = {
  readonly name: string
  readonly version: string
  readonly integrity: string
}

const verifyAuditChain = async (batches: readonly AuditBatch[]): Promise<IntegrityIssue[]> => {
  const issues: IntegrityIssue[] = []
  let prev = GENESIS_PREV_HASH
  for (let i = 0; i < batches.length; i += 1) {
    const b = batches[i]!
    if (b.prevBatchHash !== prev) {
      issues.push({
        section: 'audit',
        code: 'audit.prev_hash_mismatch',
        message: `batch ${b.batchId} prevBatchHash mismatch (expected ${prev})`,
        index: i,
      })
    }
    const recomputedRoot = await computeMerkleRoot(b.events.map((e) => e.eventHash))
    if (recomputedRoot !== b.merkleRoot) {
      issues.push({
        section: 'audit',
        code: 'audit.merkle_root_mismatch',
        message: `batch ${b.batchId} merkleRoot mismatch`,
        index: i,
      })
    }
    const recomputedDigest = await computeBatchDigest(b)
    if (recomputedDigest !== b.signedDigest) {
      issues.push({
        section: 'audit',
        code: 'audit.digest_mismatch',
        message: `batch ${b.batchId} signedDigest mismatch`,
        index: i,
      })
    }
    prev = b.signedDigest
  }
  return issues
}

const verifyMemory = async (records: readonly MemoryRecord[]): Promise<IntegrityIssue[]> => {
  const issues: IntegrityIssue[] = []
  for (let i = 0; i < records.length; i += 1) {
    const r = records[i]!
    const recomputed = await sha256Hex(r.content)
    if (recomputed.toLowerCase() !== r.contentHash.toLowerCase()) {
      issues.push({
        section: 'memory',
        code: 'memory.content_hash_mismatch',
        message: `memory record "${r.id}" hash mismatch`,
        index: i,
      })
    }
  }
  return issues
}

const verifyLockfile = (entries: readonly LockfileEntry[]): IntegrityIssue[] => {
  const issues: IntegrityIssue[] = []
  const seen = new Map<string, string>()
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i]!
    if (!e.integrity.startsWith('sha512-') && !e.integrity.startsWith('sha256-')) {
      issues.push({
        section: 'lockfile',
        code: 'lockfile.unknown_integrity_algorithm',
        message: `entry "${e.name}@${e.version}" integrity must start with sha256-/sha512-`,
        index: i,
      })
    }
    const key = `${e.name}@${e.version}`
    const prior = seen.get(key)
    if (prior !== undefined && prior !== e.integrity) {
      issues.push({
        section: 'lockfile',
        code: 'lockfile.duplicate_diverging_integrity',
        message: `entry "${key}" appears twice with different integrity values`,
        index: i,
      })
    }
    seen.set(key, e.integrity)
  }
  return issues
}

/**
 * Verify the cross-section integrity of audit chain + memory + lockfile (#241).
 * Each section is checked independently; the report aggregates every issue
 * found and `ok=true` only when no issues fired.
 */
export const verifyDataIntegrity = async (args: {
  readonly auditBatches: readonly AuditBatch[]
  readonly memory: readonly MemoryRecord[]
  readonly lockfile: readonly LockfileEntry[]
}): Promise<IntegrityReport> => {
  const auditIssues = await verifyAuditChain(args.auditBatches)
  const memoryIssues = await verifyMemory(args.memory)
  const lockfileIssues = verifyLockfile(args.lockfile)
  const issues = [...auditIssues, ...memoryIssues, ...lockfileIssues]
  return { ok: issues.length === 0, issues }
}
