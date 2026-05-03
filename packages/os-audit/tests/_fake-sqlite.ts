import type {
  SqliteDatabase,
  SqliteStatement,
} from '../src/sqlite-batch-store.js'

type Row = {
  workspace_id: string
  seq: number
  batch_json: string
  signed_digest: string
}

export const fakeDb = (): SqliteDatabase & { rows: Row[] } => {
  const rows: Row[] = []

  const stmt = (sql: string): SqliteStatement => {
    const norm = sql.trim().replace(/\s+/g, ' ')
    return {
      run: (...params) => {
        if (norm.startsWith('INSERT INTO')) {
          rows.push({
            workspace_id: params[0] as string,
            seq: params[1] as number,
            batch_json: params[2] as string,
            signed_digest: params[3] as string,
          })
          return { changes: 1, lastInsertRowid: rows.length }
        }
        return { changes: 0, lastInsertRowid: 0 }
      },
      all: <T,>(...params: unknown[]): T[] => {
        if (norm.startsWith('SELECT workspace_id, seq, batch_json')) {
          const target = params[0] as string
          return rows
            .filter((r) => r.workspace_id === target)
            .sort((a, b) => a.seq - b.seq) as T[]
        }
        if (norm.startsWith('SELECT DISTINCT workspace_id')) {
          return [...new Set(rows.map((r) => r.workspace_id))]
            .sort()
            .map((id) => ({ workspace_id: id })) as T[]
        }
        return []
      },
      get: <T,>(...params: unknown[]): T | undefined => {
        if (norm.startsWith('SELECT COALESCE(MAX(seq)')) {
          const target = params[0] as string
          const seqs = rows
            .filter((r) => r.workspace_id === target)
            .map((r) => r.seq)
          return { next: seqs.length === 0 ? 0 : Math.max(...seqs) + 1 } as T
        }
        if (norm.startsWith('SELECT signed_digest')) {
          const target = params[0] as string
          const sub = rows
            .filter((r) => r.workspace_id === target)
            .sort((a, b) => b.seq - a.seq)
          return sub[0] ? ({ signed_digest: sub[0].signed_digest } as T) : undefined
        }
        return undefined
      },
    }
  }

  return { rows, prepare: stmt, exec: () => undefined }
}
