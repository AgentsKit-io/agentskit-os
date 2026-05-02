import { dirname } from 'node:path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import {
  parseLockfile,
  type Lockfile,
  canonicalJson,
} from '@agentskit/os-core/lockfile/lock'
import { type FileSystem, nodeFs } from './fs-utils.js'

export type LockfileStoreOptions = {
  readonly fs?: FileSystem
}

export class LockfileStore {
  private fsPromise: Promise<FileSystem>

  constructor(opts: LockfileStoreOptions = {}) {
    this.fsPromise = opts.fs ? Promise.resolve(opts.fs) : nodeFs()
  }

  async read(path: string): Promise<Lockfile> {
    const fs = await this.fsPromise
    const raw = await fs.readFile(path, 'utf8')
    const parsed = parseYaml(raw)
    return parseLockfile(parsed)
  }

  async exists(path: string): Promise<boolean> {
    const fs = await this.fsPromise
    return fs.exists(path)
  }

  async write(path: string, lock: Lockfile, header?: string): Promise<void> {
    const fs = await this.fsPromise
    await fs.mkdir(dirname(path), { recursive: true })
    const canonical = JSON.parse(canonicalJson(lock))
    const yaml = `${header ? `${header}\n\n` : ''}${stringifyYaml(canonical)}`
    await fs.writeFile(path, yaml, 'utf8')
  }
}
