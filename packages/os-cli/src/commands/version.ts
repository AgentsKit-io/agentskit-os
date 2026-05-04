import { Command } from 'commander'
import { PACKAGE_NAME, PACKAGE_VERSION } from '@agentskit/os-core'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit } from '../types.js'

export const CLI_VERSION = '0.0.0' as const

const buildProgram = (): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('version')
    .description(`agentskit-os version — Print CLI version and linked ${PACKAGE_NAME} version.`)
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .allowExcessArguments(true)
    .action(() => {
      result.current = {
        code: 0,
        stdout: `agentskit-os ${CLI_VERSION}\n${PACKAGE_NAME} ${PACKAGE_VERSION}\n`,
        stderr: '',
      }
    })
  return { program, result }
}

export const version: CliCommand = {
  name: 'version',
  summary: 'Print CLI version + linked os-core version',
  run: async (argv): Promise<CliExit> => {
    const { program, result } = buildProgram()
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
