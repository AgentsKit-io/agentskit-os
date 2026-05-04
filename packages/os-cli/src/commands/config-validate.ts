import { Command } from 'commander'
import { safeParseConfigRoot } from '@agentskit/os-core/schema/config-root'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'
import { loadConfigFile } from '../loader.js'

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('config validate')
    .description(
      'agentskit-os config validate — Validate an AgentsKitOS config file (YAML or JSON) against the ConfigRoot schema.',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .argument('<path>', 'config file path')
    .action(async (path: string) => {
      const loaded = await loadConfigFile(io, path)
      if (!loaded.ok) {
        result.current = { code: loaded.code, stdout: '', stderr: loaded.message }
        return
      }
      const parseResult = safeParseConfigRoot(loaded.value)
      if (!parseResult.success) {
        const lines = parseResult.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`)
        result.current = {
          code: 1,
          stdout: '',
          stderr: `error: invalid config (${parseResult.error.issues.length} issue${parseResult.error.issues.length === 1 ? '' : 's'}):\n${lines.join('\n')}\n`,
        }
        return
      }
      result.current = {
        code: 0,
        stdout: `ok: ${loaded.absolutePath} is a valid AgentsKitOS config (workspace="${parseResult.data.workspace.id}")\n`,
        stderr: '',
      }
    })

  return { program, result }
}

export const configValidate: CliCommand = {
  name: 'config validate',
  summary: 'Validate an AgentsKitOS config file against the ConfigRoot schema',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
