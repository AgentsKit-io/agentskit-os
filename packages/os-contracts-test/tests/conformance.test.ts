// Drives every checkpoint/batch/event-bus suite against every concrete
// impl bundled in the monorepo. New backends prove conformance by
// adding one line here.

import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryEventBus } from '@agentskit/os-core'
import { InMemoryCheckpointStore } from '@agentskit/os-flow'
import {
  AuditEmitter, // exported for completeness; unused locally
  InMemoryBatchStore,
  SqliteBatchStore,
  type SqliteDatabase as AuditSqliteDb,
  type SqliteStatement as AuditSqliteStmt,
} from '@agentskit/os-audit'
import { SqliteCheckpointStore } from '@agentskit/os-storage'
import type {
  SqliteDatabase as StorageSqliteDb,
  SqliteStatement as StorageSqliteStmt,
} from '@agentskit/os-storage'
import {
  runBatchStoreSuite,
  runCheckpointStoreSuite,
  runEventBusSuite,
  type SuiteHooks,
} from '../src/index.js'

void AuditEmitter

const hooks: SuiteHooks = {
  describe,
  it,
  beforeEach,
  expect: (v) => expect(v) as unknown as ReturnType<SuiteHooks['expect']>,
}

// --- fakes for sqlite-shaped stores ---

const fakeStorageDb = (): StorageSqliteDb & { rows: Record<string, unknown>[] } => {
  const rows: Record<string, unknown>[] = []
  const stmt = (sql: string): StorageSqliteStmt => {
    const norm = sql.trim().replace(/\s+/g, ' ')
    return {
      run: (...params) => {
        if (norm.startsWith('INSERT INTO')) {
          rows.push({
            run_id: params[0],
            seq: params[1],
            node_id: params[2],
            outcome_json: params[3],
            recorded_at: params[4],
          })
          return { changes: 1, lastInsertRowid: rows.length }
        }
        if (norm.startsWith('DELETE FROM')) {
          const t = params[0]
          for (let i = rows.length - 1; i >= 0; i--) {
            if (rows[i]!['run_id'] === t) rows.splice(i, 1)
          }
          return { changes: 1, lastInsertRowid: 0 }
        }
        return { changes: 0, lastInsertRowid: 0 }
      },
      all: <T,>(...params: unknown[]): T[] => {
        if (norm.startsWith('SELECT run_id, node_id, outcome_json, recorded_at')) {
          return rows
            .filter((r) => r['run_id'] === params[0])
            .sort((a, b) => (a['seq'] as number) - (b['seq'] as number)) as T[]
        }
        if (norm.startsWith('SELECT DISTINCT run_id')) {
          return [...new Set(rows.map((r) => r['run_id'] as string))]
            .sort()
            .map((id) => ({ run_id: id })) as T[]
        }
        return []
      },
      get: <T,>(...params: unknown[]): T | undefined => {
        if (norm.startsWith('SELECT COALESCE(MAX(seq)')) {
          const seqs = rows.filter((r) => r['run_id'] === params[0]).map((r) => r['seq'] as number)
          return { next: seqs.length === 0 ? 0 : Math.max(...seqs) + 1 } as T
        }
        return undefined
      },
    }
  }
  return { rows, prepare: stmt, exec: () => undefined }
}

const fakeAuditDb = (): AuditSqliteDb & { rows: Record<string, unknown>[] } => {
  const rows: Record<string, unknown>[] = []
  const stmt = (sql: string): AuditSqliteStmt => {
    const norm = sql.trim().replace(/\s+/g, ' ')
    return {
      run: (...params) => {
        if (norm.startsWith('INSERT INTO')) {
          rows.push({
            workspace_id: params[0],
            seq: params[1],
            batch_json: params[2],
            signed_digest: params[3],
          })
          return { changes: 1, lastInsertRowid: rows.length }
        }
        return { changes: 0, lastInsertRowid: 0 }
      },
      all: <T,>(...params: unknown[]): T[] => {
        if (norm.startsWith('SELECT workspace_id, seq, batch_json')) {
          return rows
            .filter((r) => r['workspace_id'] === params[0])
            .sort((a, b) => (a['seq'] as number) - (b['seq'] as number)) as T[]
        }
        if (norm.startsWith('SELECT DISTINCT workspace_id')) {
          return [...new Set(rows.map((r) => r['workspace_id'] as string))]
            .sort()
            .map((id) => ({ workspace_id: id })) as T[]
        }
        return []
      },
      get: <T,>(...params: unknown[]): T | undefined => {
        if (norm.startsWith('SELECT COALESCE(MAX(seq)')) {
          const seqs = rows
            .filter((r) => r['workspace_id'] === params[0])
            .map((r) => r['seq'] as number)
          return { next: seqs.length === 0 ? 0 : Math.max(...seqs) + 1 } as T
        }
        if (norm.startsWith('SELECT signed_digest')) {
          const sub = rows
            .filter((r) => r['workspace_id'] === params[0])
            .sort((a, b) => (b['seq'] as number) - (a['seq'] as number))
          return sub[0] ? ({ signed_digest: sub[0]['signed_digest'] } as T) : undefined
        }
        return undefined
      },
    }
  }
  return { rows, prepare: stmt, exec: () => undefined }
}

// --- conformance drives ---

runCheckpointStoreSuite(hooks, 'InMemoryCheckpointStore', () => new InMemoryCheckpointStore())
runCheckpointStoreSuite(hooks, 'SqliteCheckpointStore', () => new SqliteCheckpointStore({ db: fakeStorageDb() }))

runBatchStoreSuite(hooks, 'InMemoryBatchStore', () => new InMemoryBatchStore())
runBatchStoreSuite(hooks, 'SqliteBatchStore', () => new SqliteBatchStore({ db: fakeAuditDb() }))

runEventBusSuite(hooks, 'InMemoryEventBus', () => new InMemoryEventBus())
