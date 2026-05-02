// AuditEmitter — accumulates SignedEventRefs per workspace, flushes on
// size or time threshold into AuditBatch records via BatchStore.
// Pure logic; signatures provided by injected Signer (no crypto in core).

import type { AnyEvent } from '@agentskit/os-core'
import {
  AUDIT_SCHEMA_VERSION,
  type AuditBatch,
  type AuditSignature,
  computeBatchDigest,
  computeMerkleRoot,
} from '@agentskit/os-core'
import type { BatchStore } from './batch-store.js'
import { hashEvent, type SignedEventRef } from './event-hash.js'

export interface Signer {
  /** Signs the canonical batch digest, returns ed25519 signature payload. */
  sign(digest: string, batch: Omit<AuditBatch, 'signature'>): Promise<AuditSignature>
}

export type EmitterOptions = {
  readonly store: BatchStore
  readonly signer: Signer
  readonly maxEventsPerBatch?: number
  readonly maxIntervalMs?: number
  readonly newBatchId: () => string
  readonly clock?: () => Date
}

type Buffer = {
  readonly workspaceId: string
  readonly events: SignedEventRef[]
  readonly startedAt: string
  flushTimer?: ReturnType<typeof setTimeout>
}

const DEFAULT_MAX_EVENTS = 1000
const DEFAULT_INTERVAL_MS = 60_000

export class AuditEmitter {
  private readonly buffers = new Map<string, Buffer>()
  private readonly opts: Required<Omit<EmitterOptions, 'store' | 'signer' | 'newBatchId'>> &
    Pick<EmitterOptions, 'store' | 'signer' | 'newBatchId'>
  private closed = false

  constructor(opts: EmitterOptions) {
    this.opts = {
      store: opts.store,
      signer: opts.signer,
      newBatchId: opts.newBatchId,
      maxEventsPerBatch: opts.maxEventsPerBatch ?? DEFAULT_MAX_EVENTS,
      maxIntervalMs: opts.maxIntervalMs ?? DEFAULT_INTERVAL_MS,
      clock: opts.clock ?? (() => new Date()),
    }
  }

  async ingest(event: AnyEvent): Promise<void> {
    if (this.closed) throw new Error('emitter closed')
    const ref = await hashEvent(event)
    let buf = this.buffers.get(event.workspaceId)
    if (!buf) {
      buf = {
        workspaceId: event.workspaceId,
        events: [],
        startedAt: this.opts.clock().toISOString(),
      }
      this.buffers.set(event.workspaceId, buf)
      this.scheduleFlush(event.workspaceId)
    }
    buf.events.push(ref)
    if (buf.events.length >= this.opts.maxEventsPerBatch) {
      await this.flush(event.workspaceId)
    }
  }

  private scheduleFlush(workspaceId: string): void {
    const buf = this.buffers.get(workspaceId)
    if (!buf) return
    if (buf.flushTimer) clearTimeout(buf.flushTimer)
    buf.flushTimer = setTimeout(() => {
      void this.flush(workspaceId).catch(() => undefined)
    }, this.opts.maxIntervalMs)
    if (typeof buf.flushTimer === 'object' && 'unref' in buf.flushTimer) {
      ;(buf.flushTimer as unknown as { unref: () => void }).unref()
    }
  }

  async flush(workspaceId: string): Promise<AuditBatch | undefined> {
    const buf = this.buffers.get(workspaceId)
    if (!buf || buf.events.length === 0) return undefined
    if (buf.flushTimer) clearTimeout(buf.flushTimer)

    const events = [...buf.events]
    this.buffers.delete(workspaceId)

    const prevBatchHash = await this.opts.store.latestDigest(workspaceId)
    const merkleRoot = await computeMerkleRoot(events.map((e) => e.eventHash))
    const endedAt = this.opts.clock().toISOString()
    const batchId = this.opts.newBatchId()

    const unsigned: Omit<AuditBatch, 'signature'> = {
      schemaVersion: AUDIT_SCHEMA_VERSION,
      batchId,
      workspaceId,
      startedAt: buf.startedAt,
      endedAt,
      prevBatchHash,
      events,
      merkleRoot,
      signedDigest: '',
    } as Omit<AuditBatch, 'signature'>

    const signedDigest = await computeBatchDigest({
      merkleRoot,
      prevBatchHash,
      batchId,
      workspaceId,
      startedAt: buf.startedAt,
      endedAt,
    })
    const finalUnsigned = { ...unsigned, signedDigest }
    const signature = await this.opts.signer.sign(signedDigest, finalUnsigned)
    const batch: AuditBatch = { ...finalUnsigned, signature }
    await this.opts.store.append(batch)
    return batch
  }

  async flushAll(): Promise<readonly AuditBatch[]> {
    const out: AuditBatch[] = []
    for (const ws of [...this.buffers.keys()]) {
      const b = await this.flush(ws)
      if (b) out.push(b)
    }
    return out
  }

  async close(): Promise<void> {
    await this.flushAll()
    this.closed = true
  }

  pending(workspaceId: string): number {
    return this.buffers.get(workspaceId)?.events.length ?? 0
  }
}
