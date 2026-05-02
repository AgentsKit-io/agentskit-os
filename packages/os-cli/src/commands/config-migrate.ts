import { migrateConfig, MigrationError } from '@agentskit/os-core/config/migrate'
import { CONFIG_ROOT_VERSION } from '@agentskit/os-core/schema/config-root'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'
import { loadConfigFile } from '../loader.js'

const help = `agentskit-os config migrate <path> [--to <version>]

Migrates a config file to the target schema version. If --to is omitted,
migrates to the current CONFIG_ROOT_VERSION (${CONFIG_ROOT_VERSION}).

Currently no migrations are registered (only one schema version exists).
Future schema bumps will register MigrationStep entries here.

Exit codes: 0 ok, 1 migration error, 2 usage error, 3 read error.
`

export const configMigrate: CliCommand = {
  name: 'config migrate',
  summary: 'Migrate a config file to the current schema version',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
      return { code: 2, stdout: '', stderr: help }
    }

    let target = CONFIG_ROOT_VERSION as number
    const rest: string[] = []
    for (let i = 1; i < argv.length; i++) {
      const flag = argv[i]
      if (flag === '--to') {
        const value = argv[++i]
        const parsed = Number(value)
        if (!Number.isInteger(parsed) || parsed < 0) {
          return {
            code: 2,
            stdout: '',
            stderr: `error: --to expects a non-negative integer, got "${value}"\n`,
          }
        }
        target = parsed
      } else {
        rest.push(flag!)
      }
    }
    if (rest.length > 0) {
      return { code: 2, stdout: '', stderr: `error: unexpected argument "${rest[0]}"\n\n${help}` }
    }

    const loaded = await loadConfigFile(io, argv[0]!)
    if (!loaded.ok) return { code: loaded.code, stdout: '', stderr: loaded.message }

    try {
      const result = migrateConfig(loaded.value, [], target)
      const stepLines =
        result.steps.length === 0
          ? '  (no migrations needed)'
          : result.steps.map((s) => `  ${s.from} → ${s.to}: ${s.description}`).join('\n')
      return {
        code: 0,
        stdout: `migrated ${loaded.absolutePath} from v${result.fromVersion} to v${result.toVersion}\n${stepLines}\n\n--- output ---\n${JSON.stringify(result.output, null, 2)}\n`,
        stderr: '',
      }
    } catch (err) {
      if (err instanceof MigrationError) {
        return { code: 1, stdout: '', stderr: `error: ${err.code}: ${err.message}\n` }
      }
      throw err
    }
  },
}
