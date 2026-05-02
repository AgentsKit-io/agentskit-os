import { resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { CliIo } from './types.js'

export type LoadResult =
  | { ok: true; value: unknown; absolutePath: string }
  | { ok: false; code: 1 | 3; message: string }

export const loadConfigFile = async (
  io: CliIo,
  path: string,
): Promise<LoadResult> => {
  const absolutePath = resolve(io.cwd(), path)
  let raw: string
  try {
    raw = await io.readFile(absolutePath)
  } catch (err) {
    return {
      ok: false,
      code: 3,
      message: `error: cannot read ${absolutePath}: ${(err as Error).message}\n`,
    }
  }
  try {
    const trimmed = raw.trimStart()
    const parsed = trimmed.startsWith('{') || trimmed.startsWith('[')
      ? JSON.parse(raw)
      : parseYaml(raw)
    return { ok: true, value: parsed, absolutePath }
  } catch (err) {
    return {
      ok: false,
      code: 1,
      message: `error: cannot parse ${absolutePath}: ${(err as Error).message}\n`,
    }
  }
}
