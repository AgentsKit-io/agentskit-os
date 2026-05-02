import { readFile } from 'node:fs/promises'
import type { CliIo } from './types.js'

export const defaultIo: CliIo = {
  readFile: (path) => readFile(path, 'utf8'),
  cwd: () => process.cwd(),
}
