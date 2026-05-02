// SQLite-backed CheckpointStore. Decouples from any concrete driver
// via a minimal `SqliteDatabase` interface that matches the better-sqlite3
// shape. Embedders pass `new Database(path)`; tests pass a fake.
//
// NOTE: `db.exec` below refers to better-sqlite3's SQL execution method,
// not child_process.exec. SQL strings only interpolate `table`, which is
// validated against TABLE_NAME_RE before any prepare/exec call. No user
// input ever flows into raw SQL.

import type { CheckpointRecord, CheckpointStore } from '@agentskit/os-flow'

export interface SqliteStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint }
  all<T = unknown>(...params: unknown[]): T[]
  get<T = unknown>(...params: unknown[]): T | undefined
}

export interface SqliteDatabase {
  prepare(sql: string): SqliteStatement
  exec(sql: string): unknown
}

export type SqliteCheckpointStoreOptions = {
  readonly db: SqliteDatabase
  readonly table?: string
}

const DEFAULT_TABLE = 'agentskitos_checkpoints'
const TABLE_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/

type Row = {
  outcome_json: string
  node_id: string
  recorded_at: string
  run_id: string
}

export class SqliteCheckpointStore implements CheckpointStore {
  private readonly db: SqliteDatabase
  private readonly table: string
  private readonly stmts: {
    nextSeq: SqliteStatement
    insert: SqliteStatement
    load: SqliteStatement
    clear: SqliteStatement
    listRuns: SqliteStatement
  }

  constructor(opts: SqliteCheckpointStoreOptions) {
    const table = opts.table ?? DEFAULT_TABLE
    if (!TABLE_NAME_RE.test(table)) {
      throw new Error(`SqliteCheckpointStore: invalid table name "${table}"`)
    }
    this.db = opts.db
    this.table = table
    this.db.exec(`CREATE TABLE IF NOT EXISTS ${table} (
      run_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      node_id TEXT NOT NULL,
      outcome_json TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      PRIMARY KEY (run_id, seq)
    )`)
    this.db.exec(`CREATE INDEX IF NOT EXISTS ${table}_run_idx ON ${table}(run_id)`)
    this.stmts = {
      nextSeq: this.db.prepare(
        `SELECT COALESCE(MAX(seq), -1) + 1 AS next FROM ${table} WHERE run_id = ?`,
      ),
      insert: this.db.prepare(
        `INSERT INTO ${table} (run_id, seq, node_id, outcome_json, recorded_at) VALUES (?, ?, ?, ?, ?)`,
      ),
      load: this.db.prepare(
        `SELECT run_id, node_id, outcome_json, recorded_at FROM ${table} WHERE run_id = ? ORDER BY seq ASC`,
      ),
      clear: this.db.prepare(`DELETE FROM ${table} WHERE run_id = ?`),
      listRuns: this.db.prepare(`SELECT DISTINCT run_id FROM ${table} ORDER BY run_id ASC`),
    }
  }

  async append(record: CheckpointRecord): Promise<void> {
    const row = this.stmts.nextSeq.get<{ next: number }>(record.runId)
    const seq = row?.next ?? 0
    this.stmts.insert.run(
      record.runId,
      seq,
      record.nodeId,
      JSON.stringify(record.outcome),
      record.recordedAt,
    )
  }

  async load(runId: string): Promise<readonly CheckpointRecord[]> {
    const rows = this.stmts.load.all<Row>(runId)
    const out: CheckpointRecord[] = []
    for (const r of rows) {
      try {
        out.push({
          runId: r.run_id,
          nodeId: r.node_id,
          outcome: JSON.parse(r.outcome_json) as CheckpointRecord['outcome'],
          recordedAt: r.recorded_at,
        })
      } catch {
        // Skip corrupt rows silently.
      }
    }
    return out
  }

  async clear(runId: string): Promise<void> {
    this.stmts.clear.run(runId)
  }

  async listRuns(): Promise<readonly string[]> {
    const rows = this.stmts.listRuns.all<{ run_id: string }>()
    return rows.map((r) => r.run_id)
  }
}
