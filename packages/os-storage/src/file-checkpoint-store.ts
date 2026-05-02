// JSONL-append-per-run CheckpointStore. One file per runId.
// Pure node:fs by default, FS adapter pluggable for testing.

import { join } from 'node:path'
import type { CheckpointRecord, CheckpointStore } from '@agentskit/os-flow'
import { type FileSystem, nodeFs, safeRunId } from './fs-utils.js'

export type FileCheckpointStoreOptions = {
  readonly dir: string
  readonly fs?: FileSystem
}

const linesOf = (raw: string): readonly string[] =>
  raw.split('\n').filter((l) => l.trim().length > 0)

export class FileCheckpointStore implements CheckpointStore {
  private readonly dir: string
  private fsPromise: Promise<FileSystem>

  constructor(opts: FileCheckpointStoreOptions) {
    this.dir = opts.dir
    this.fsPromise = opts.fs ? Promise.resolve(opts.fs) : nodeFs()
  }

  private async pathFor(runId: string): Promise<string> {
    const fs = await this.fsPromise
    await fs.mkdir(this.dir, { recursive: true })
    return join(this.dir, `${safeRunId(runId)}.jsonl`)
  }

  async append(record: CheckpointRecord): Promise<void> {
    const fs = await this.fsPromise
    const path = await this.pathFor(record.runId)
    const line = `${JSON.stringify(record)}\n`
    await fs.appendFile(path, line, 'utf8')
  }

  async load(runId: string): Promise<readonly CheckpointRecord[]> {
    const fs = await this.fsPromise
    const path = await this.pathFor(runId)
    if (!(await fs.exists(path))) return []
    const raw = await fs.readFile(path, 'utf8')
    const out: CheckpointRecord[] = []
    for (const line of linesOf(raw)) {
      try {
        out.push(JSON.parse(line) as CheckpointRecord)
      } catch {
        // Skip corrupt lines silently — caller can detect via missing nodes.
      }
    }
    return out
  }

  async clear(runId: string): Promise<void> {
    const fs = await this.fsPromise
    const path = await this.pathFor(runId)
    if (await fs.exists(path)) await fs.unlink(path)
  }

  async listRuns(): Promise<readonly string[]> {
    const fs = await this.fsPromise
    if (!(await fs.exists(this.dir))) return []
    const entries = await fs.readdir(this.dir)
    return entries.filter((e) => e.endsWith('.jsonl')).map((e) => e.replace(/\.jsonl$/, ''))
  }
}
