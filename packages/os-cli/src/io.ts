import { mkdir, readFile, writeFile, access, readdir } from 'node:fs/promises'
import type { CliIo } from './types.js'

export const defaultIo: CliIo = {
  readFile: (path) => readFile(path, 'utf8'),
  readBinary: async (path) => {
    const buf = await readFile(path)
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  },
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
  readdir: async (path) => readdir(path),
  cwd: () => process.cwd(),
}
