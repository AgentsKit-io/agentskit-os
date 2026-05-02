// File-backed BatchStore. Per-workspace JSONL append; one line per batch.
// Validates prevBatchHash continuity before appending.

import { join } from 'node:path'
import {
  GENESIS_PREV_HASH,
  parseAuditBatch,
  type AuditBatch,
} from '@agentskit/os-core'
import type { BatchStore } from './batch-store.js'
import { type FileSystem, nodeFs, safeWorkspaceId } from './fs.js'

export type FileBatchStoreOptions = {
  readonly dir: string
  readonly fs?: FileSystem
}

const linesOf = (raw: string): readonly string[] =>
  raw.split('\n').filter((l) => l.trim().length > 0)

export class FileBatchStore implements BatchStore {
  private readonly dir: string
  private fsPromise: Promise<FileSystem>

  constructor(opts: FileBatchStoreOptions) {
    this.dir = opts.dir
    this.fsPromise = opts.fs ? Promise.resolve(opts.fs) : nodeFs()
  }

  private async pathFor(workspaceId: string): Promise<string> {
    const fs = await this.fsPromise
    await fs.mkdir(this.dir, { recursive: true })
    return join(this.dir, `${safeWorkspaceId(workspaceId)}.jsonl`)
  }

  async append(batch: AuditBatch): Promise<void> {
    const expected = await this.latestDigest(batch.workspaceId)
    if (batch.prevBatchHash !== expected) {
      throw new Error(
        `chain break: expected prevBatchHash ${expected}, got ${batch.prevBatchHash}`,
      )
    }
    const fs = await this.fsPromise
    const path = await this.pathFor(batch.workspaceId)
    const line = `${JSON.stringify(batch)}\n`
    await fs.appendFile(path, line, 'utf8')
  }

  async load(workspaceId: string): Promise<readonly AuditBatch[]> {
    const fs = await this.fsPromise
    const path = await this.pathFor(workspaceId)
    if (!(await fs.exists(path))) return []
    const raw = await fs.readFile(path, 'utf8')
    const out: AuditBatch[] = []
    for (const line of linesOf(raw)) {
      try {
        out.push(parseAuditBatch(JSON.parse(line)))
      } catch {
        // Skip corrupt lines silently — verifyChain will detect any tamper.
      }
    }
    return out
  }

  async latestDigest(workspaceId: string): Promise<string> {
    const list = await this.load(workspaceId)
    return list.length === 0 ? GENESIS_PREV_HASH : list[list.length - 1]!.signedDigest
  }

  async listWorkspaces(): Promise<readonly string[]> {
    const fs = await this.fsPromise
    if (!(await fs.exists(this.dir))) return []
    const entries = await fs.readdir(this.dir)
    return entries.filter((e) => e.endsWith('.jsonl')).map((e) => e.replace(/\.jsonl$/, ''))
  }
}
