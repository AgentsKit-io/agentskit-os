import type { CliCommand, CliExit, CliIo } from './types.js'
import { configValidate } from './commands/config-validate.js'
import { configExplain } from './commands/config-explain.js'
import { configDiff } from './commands/config-diff.js'
import { configMigrate } from './commands/config-migrate.js'
import { doctor } from './commands/doctor.js'
import { version } from './commands/version.js'

export const COMMANDS: readonly CliCommand[] = [
  configValidate,
  configExplain,
  configDiff,
  configMigrate,
  doctor,
  version,
]

const help = `agentskit-os <command> [args]

Commands:
${COMMANDS.map((c) => `  ${c.name.padEnd(20)} ${c.summary}`).join('\n')}

Run \`agentskit-os <command> --help\` for command-specific help.
`

export const route = async (argv: readonly string[], io?: CliIo): Promise<CliExit> => {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    return { code: 0, stdout: help, stderr: '' }
  }
  if (argv[0] === '--version' || argv[0] === '-v') {
    return version.run([], io)
  }

  // Two-segment commands: "config validate"
  const twoToken = `${argv[0] ?? ''} ${argv[1] ?? ''}`.trim()
  const twoMatch = COMMANDS.find((c) => c.name === twoToken)
  if (twoMatch) return twoMatch.run(argv.slice(2), io)

  const oneMatch = COMMANDS.find((c) => c.name === argv[0])
  if (oneMatch) return oneMatch.run(argv.slice(1), io)

  return {
    code: 2,
    stdout: '',
    stderr: `error: unknown command "${argv[0]}"\n\n${help}`,
  }
}
