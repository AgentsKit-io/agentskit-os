import { resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { safeParseConfigRoot } from '@agentskit/os-core/schema/config-root'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const help = `agentskit-os config validate <path>

Validates an AgentsKitOS config file (YAML or JSON) against the ConfigRoot schema.
Exits 0 on success, 1 on schema error, 2 on usage error, 3 on read error.
`

const parseInput = (raw: string): unknown => {
  const trimmed = raw.trimStart()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(raw)
  }
  return parseYaml(raw)
}

export const configValidate: CliCommand = {
  name: 'config validate',
  summary: 'Validate an AgentsKitOS config file against the ConfigRoot schema',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
      return { code: 2, stdout: '', stderr: help }
    }

    const path = resolve(io.cwd(), argv[0]!)
    let raw: string
    try {
      raw = await io.readFile(path)
    } catch (err) {
      return { code: 3, stdout: '', stderr: `error: cannot read ${path}: ${(err as Error).message}\n` }
    }

    let parsed: unknown
    try {
      parsed = parseInput(raw)
    } catch (err) {
      return {
        code: 1,
        stdout: '',
        stderr: `error: cannot parse ${path}: ${(err as Error).message}\n`,
      }
    }

    const result = safeParseConfigRoot(parsed)
    if (!result.success) {
      const lines = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      return {
        code: 1,
        stdout: '',
        stderr: `error: invalid config (${result.error.issues.length} issue${result.error.issues.length === 1 ? '' : 's'}):\n${lines.join('\n')}\n`,
      }
    }

    return {
      code: 0,
      stdout: `ok: ${path} is a valid AgentsKitOS config (workspace="${result.data.workspace.id}")\n`,
      stderr: '',
    }
  },
}
