import type { FileSystem } from '../src/fs-utils.js'

export type FakeFs = FileSystem & {
  readonly files: Map<string, string>
  readonly dirs: Set<string>
}

export const fakeFs = (initial: Record<string, string> = {}): FakeFs => {
  const files = new Map<string, string>(Object.entries(initial))
  const dirs = new Set<string>()
  for (const p of files.keys()) {
    let cursor = p
    while (cursor.lastIndexOf('/') > 0) {
      cursor = cursor.slice(0, cursor.lastIndexOf('/'))
      dirs.add(cursor)
    }
  }
  return {
    files,
    dirs,
    mkdir: async (path) => {
      dirs.add(path)
    },
    appendFile: async (path, data) => {
      files.set(path, (files.get(path) ?? '') + data)
    },
    readFile: async (path) => {
      const v = files.get(path)
      if (v === undefined) throw new Error(`ENOENT: ${path}`)
      return v
    },
    writeFile: async (path, data) => {
      files.set(path, data)
    },
    unlink: async (path) => {
      files.delete(path)
    },
    exists: async (path) => files.has(path) || dirs.has(path),
    readdir: async (path) => {
      const prefix = path.endsWith('/') ? path : `${path}/`
      const out: string[] = []
      for (const f of files.keys()) {
        if (f.startsWith(prefix)) {
          const rel = f.slice(prefix.length)
          if (!rel.includes('/')) out.push(rel)
        }
      }
      return out
    },
  }
}
