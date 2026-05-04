import type { CliIo } from '../src/types.js'

export type FakeIoFs = {
  files: Map<string, string>
  binary: Map<string, Uint8Array>
  dirs: Set<string>
}

export const fakeIo = (
  initial: Record<string, string> = {},
  initialBinary: Record<string, Uint8Array> = {},
  promptAnswers: readonly string[] = [],
): CliIo & { fs: FakeIoFs } => {
  const files = new Map<string, string>(Object.entries(initial))
  const binary = new Map<string, Uint8Array>(Object.entries(initialBinary))
  const dirs = new Set<string>(['/work'])
  for (const p of [...files.keys(), ...binary.keys()]) {
    let cursor = p
    while (cursor.lastIndexOf('/') > 0) {
      cursor = cursor.slice(0, cursor.lastIndexOf('/'))
      dirs.add(cursor)
    }
  }
  const fs: FakeIoFs = { files, binary, dirs }
  const prompts = [...promptAnswers]
  return {
    fs,
    cwd: () => '/work',
    readFile: async (path) => {
      if (!files.has(path)) throw new Error(`ENOENT: ${path}`)
      return files.get(path)!
    },
    readBinary: async (path) => {
      const v = binary.get(path) ?? (files.has(path) ? new TextEncoder().encode(files.get(path)!) : undefined)
      if (!v) throw new Error(`ENOENT: ${path}`)
      return v
    },
    writeFile: async (path, contents) => {
      files.set(path, contents)
    },
    mkdir: async (path) => {
      dirs.add(path)
    },
    exists: async (path) => files.has(path) || binary.has(path) || dirs.has(path),
    readdir: async (path) => {
      const prefix = path.endsWith('/') ? path : `${path}/`
      const out = new Set<string>()
      for (const f of [...files.keys(), ...binary.keys()]) {
        if (f.startsWith(prefix)) {
          const rel = f.slice(prefix.length)
          if (!rel.includes('/')) out.add(rel)
        }
      }
      return [...out]
    },
    prompt: async () => {
      if (prompts.length === 0) throw new Error('No fake prompt answers left')
      return prompts.shift() ?? ''
    },
  }
}
