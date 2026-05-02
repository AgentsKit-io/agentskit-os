import type { CliIo } from '../src/types.js'

export type FakeIoFs = { files: Map<string, string>; dirs: Set<string> }

export const fakeIo = (
  initial: Record<string, string> = {},
): CliIo & { fs: FakeIoFs } => {
  const files = new Map<string, string>(Object.entries(initial))
  const dirs = new Set<string>(['/work'])
  const fs: FakeIoFs = { files, dirs }
  return {
    fs,
    cwd: () => '/work',
    readFile: async (path) => {
      if (!files.has(path)) throw new Error(`ENOENT: ${path}`)
      return files.get(path)!
    },
    writeFile: async (path, contents) => {
      files.set(path, contents)
    },
    mkdir: async (path) => {
      dirs.add(path)
    },
    exists: async (path) => files.has(path) || dirs.has(path),
  }
}
