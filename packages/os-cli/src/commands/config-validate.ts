import { safeParseConfigRoot } from '@agentskit/os-core/schema/config-root'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'
import { loadConfigFile } from '../loader.js'

const help = `agentskit-os config validate <path>

Validates an AgentsKitOS config file (YAML or JSON) against the ConfigRoot schema.
Exits 0 on success, 1 on schema/parse error, 2 on usage error, 3 on read error.
`

export const configValidate: CliCommand = {
  name: 'config validate',
  summary: 'Validate an AgentsKitOS config file against the ConfigRoot schema',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
      return { code: 2, stdout: '', stderr: help }
    }

    const loaded = await loadConfigFile(io, argv[0]!)
    if (!loaded.ok) return { code: loaded.code, stdout: '', stderr: loaded.message }

    const result = safeParseConfigRoot(loaded.value)
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
      stdout: `ok: ${loaded.absolutePath} is a valid AgentsKitOS config (workspace="${result.data.workspace.id}")\n`,
      stderr: '',
    }
  },
}
