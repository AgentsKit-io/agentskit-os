// SQLite-backed BatchStore. Mirrors FileBatchStore semantics: enforces
// prevBatchHash chain continuity on append. Driver-agnostic via the
// same SqliteDatabase shape used by os-storage.
//
// `db.exec` refers to better-sqlite3's SQL execution, not child_process.
// SQL strings only interpolate `table`, validated against TABLE_NAME_RE
// before any prepare/exec call.

import type { AuditBatch } from '@agentskit/os-core'
import { GENESIS_PREV_HASH } from '@agentskit/os-core'
import type { BatchStore } from './batch-store.js'

export interface SqliteStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint }
  all<T = unknown>(...params: unknown[]): T[]
  get<T = unknown>(...params: unknown[]): T | undefined
}

export interface SqliteDatabase {
  prepare(sql: string): SqliteStatement
  exec(sql: string): unknown
}

export type SqliteBatchStoreOptions = {
  readonly db: SqliteDatabase
  readonly table?: string
}

const DEFAULT_TABLE = 'agentskitos_audit_batches'
const TABLE_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/

type Row = {
  workspace_id: string
  seq: number
  batch_json: string
  signed_digest: string
}

export class SqliteBatchStore implements BatchStore {
  private readonly db: SqliteDatabase
  private readonly table: string
  private readonly stmts: {
    nextSeq: SqliteStatement
    insert: SqliteStatement
    load: SqliteStatement
    latest: SqliteStatement
    listWorkspaces: SqliteStatement
  }

  constructor(opts: SqliteBatchStoreOptions) {
    const table = opts.table ?? DEFAULT_TABLE
    if (!TABLE_NAME_RE.test(table)) {
      throw new Error(`SqliteBatchStore: invalid table name "${table}"`)
    }
    this.db = opts.db
    this.table = table
    this.db.exec(`CREATE TABLE IF NOT EXISTS ${table} (
      workspace_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      batch_json TEXT NOT NULL,
      signed_digest TEXT NOT NULL,
      PRIMARY KEY (workspace_id, seq)
    )`)
    this.db.exec(`CREATE INDEX IF NOT EXISTS ${table}_ws_idx ON ${table}(workspace_id)`)
    this.stmts = {
      nextSeq: this.db.prepare(
        `SELECT COALESCE(MAX(seq), -1) + 1 AS next FROM ${table} WHERE workspace_id = ?`,
      ),
      insert: this.db.prepare(
        `INSERT INTO ${table} (workspace_id, seq, batch_json, signed_digest) VALUES (?, ?, ?, ?)`,
      ),
      load: this.db.prepare(
        `SELECT workspace_id, seq, batch_json, signed_digest FROM ${table} WHERE workspace_id = ? ORDER BY seq ASC`,
      ),
      latest: this.db.prepare(
        `SELECT signed_digest FROM ${table} WHERE workspace_id = ? ORDER BY seq DESC LIMIT 1`,
      ),
      listWorkspaces: this.db.prepare(
        `SELECT DISTINCT workspace_id FROM ${table} ORDER BY workspace_id ASC`,
      ),
    }
  }

  async append(batch: AuditBatch): Promise<void> {
    const expected = await this.latestDigest(batch.workspaceId)
    if (batch.prevBatchHash !== expected) {
      throw new Error(
        `chain break: expected prevBatchHash ${expected}, got ${batch.prevBatchHash}`,
      )
    }
    const row = this.stmts.nextSeq.get<{ next: number }>(batch.workspaceId)
    const seq = row?.next ?? 0
    this.stmts.insert.run(
      batch.workspaceId,
      seq,
      JSON.stringify(batch),
      batch.signedDigest,
    )
  }

  async load(workspaceId: string): Promise<readonly AuditBatch[]> {
    const rows = this.stmts.load.all<Row>(workspaceId)
    const out: AuditBatch[] = []
    for (const r of rows) {
      try {
        out.push(JSON.parse(r.batch_json) as AuditBatch)
      } catch {
        // Skip corrupt rows silently — verifyChain detects the gap.
      }
    }
    return out
  }

  async latestDigest(workspaceId: string): Promise<string> {
    const row = this.stmts.latest.get<{ signed_digest: string }>(workspaceId)
    return row?.signed_digest ?? GENESIS_PREV_HASH
  }

  async listWorkspaces(): Promise<readonly string[]> {
    const rows = this.stmts.listWorkspaces.all<{ workspace_id: string }>()
    return rows.map((r) => r.workspace_id)
  }
}
