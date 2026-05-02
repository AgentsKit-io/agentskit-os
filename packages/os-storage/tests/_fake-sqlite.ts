// Tiny in-memory fake of better-sqlite3's prepared-statement surface.
// Supports only the SQL shapes used by SqliteCheckpointStore.

import type {
  SqliteDatabase,
  SqliteStatement,
} from '../src/sqlite-checkpoint-store.js'

type Row = {
  run_id: string
  seq: number
  node_id: string
  outcome_json: string
  recorded_at: string
}

export const fakeDb = (): SqliteDatabase & { rows: Row[] } => {
  const rows: Row[] = []

  const stmt = (sql: string): SqliteStatement => {
    const norm = sql.trim().replace(/\s+/g, ' ')
    return {
      run: (...params) => {
        if (norm.startsWith('INSERT INTO')) {
          rows.push({
            run_id: params[0] as string,
            seq: params[1] as number,
            node_id: params[2] as string,
            outcome_json: params[3] as string,
            recorded_at: params[4] as string,
          })
          return { changes: 1, lastInsertRowid: rows.length }
        }
        if (norm.startsWith('DELETE FROM')) {
          const target = params[0] as string
          let deleted = 0
          for (let i = rows.length - 1; i >= 0; i--) {
            if (rows[i]!.run_id === target) {
              rows.splice(i, 1)
              deleted++
            }
          }
          return { changes: deleted, lastInsertRowid: 0 }
        }
        return { changes: 0, lastInsertRowid: 0 }
      },
      all: <T,>(...params: unknown[]): T[] => {
        if (norm.startsWith('SELECT run_id, node_id, outcome_json, recorded_at')) {
          const target = params[0] as string
          return rows
            .filter((r) => r.run_id === target)
            .sort((a, b) => a.seq - b.seq)
            .map((r) => ({
              run_id: r.run_id,
              node_id: r.node_id,
              outcome_json: r.outcome_json,
              recorded_at: r.recorded_at,
            })) as T[]
        }
        if (norm.startsWith('SELECT DISTINCT run_id')) {
          return [...new Set(rows.map((r) => r.run_id))]
            .sort()
            .map((id) => ({ run_id: id })) as T[]
        }
        return []
      },
      get: <T,>(...params: unknown[]): T | undefined => {
        if (norm.startsWith('SELECT COALESCE(MAX(seq)')) {
          const target = params[0] as string
          const seqs = rows.filter((r) => r.run_id === target).map((r) => r.seq)
          const next = seqs.length === 0 ? 0 : Math.max(...seqs) + 1
          return { next } as T
        }
        return undefined
      },
    }
  }

  return {
    rows,
    prepare: stmt,
    exec: () => undefined,
  }
}
