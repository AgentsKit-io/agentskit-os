// In-memory AuditBatch chain store. Enforces prevBatchHash continuity.
// Real backends (file, sqlite, remote) implement BatchStore.

import type { AuditBatch } from '@agentskit/os-core'
import { GENESIS_PREV_HASH } from '@agentskit/os-core'

export interface BatchStore {
  append(batch: AuditBatch): Promise<void>
  load(workspaceId: string): Promise<readonly AuditBatch[]>
  latestDigest(workspaceId: string): Promise<string>
}

export class InMemoryBatchStore implements BatchStore {
  private byWorkspace = new Map<string, AuditBatch[]>()

  async append(batch: AuditBatch): Promise<void> {
    const list = this.byWorkspace.get(batch.workspaceId) ?? []
    const expected =
      list.length === 0 ? GENESIS_PREV_HASH : list[list.length - 1]!.signedDigest
    if (batch.prevBatchHash !== expected) {
      throw new Error(
        `chain break: expected prevBatchHash ${expected}, got ${batch.prevBatchHash}`,
      )
    }
    list.push(batch)
    this.byWorkspace.set(batch.workspaceId, list)
  }

  async load(workspaceId: string): Promise<readonly AuditBatch[]> {
    return this.byWorkspace.get(workspaceId) ?? []
  }

  async latestDigest(workspaceId: string): Promise<string> {
    const list = this.byWorkspace.get(workspaceId) ?? []
    return list.length === 0 ? GENESIS_PREV_HASH : list[list.length - 1]!.signedDigest
  }

  async listWorkspaces(): Promise<readonly string[]> {
    return [...this.byWorkspace.keys()]
  }
}
