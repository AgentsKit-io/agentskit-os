import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import type { CliIo } from './types.js'

export const defaultIo: CliIo = {
  readFile: (path) => readFile(path, 'utf8'),
  writeFile: async (path, contents) => {
    await writeFile(path, contents, 'utf8')
  },
  mkdir: async (path) => {
    await mkdir(path, { recursive: true })
  },
  exists: async (path) => {
    try {
      await access(path)
      return true
    } catch {
      return false
    }
  },
  cwd: () => process.cwd(),
}
