import type { FileSystem } from '../src/fs.js'

export type FakeFs = FileSystem & {
  readonly files: Map<string, string>
  readonly dirs: Set<string>
}

export const fakeFs = (): FakeFs => {
  const files = new Map<string, string>()
  const dirs = new Set<string>()
  return {
    files,
    dirs,
    mkdir: async (p) => {
      dirs.add(p)
    },
    appendFile: async (p, data) => {
      files.set(p, (files.get(p) ?? '') + data)
    },
    readFile: async (p) => {
      const v = files.get(p)
      if (v === undefined) throw new Error(`ENOENT: ${p}`)
      return v
    },
    exists: async (p) => files.has(p) || dirs.has(p),
    readdir: async (p) => {
      const prefix = p.endsWith('/') ? p : `${p}/`
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
