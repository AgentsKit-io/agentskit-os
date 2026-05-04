import { Command } from 'commander'
import { migrateConfig, MigrationError } from '@agentskit/os-core/config/migrate'
import { CONFIG_ROOT_VERSION } from '@agentskit/os-core/schema/config-root'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'
import { loadConfigFile } from '../loader.js'

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('config migrate')
    .description(
      `agentskit-os config migrate — Migrate a config file to the target schema version (default ${CONFIG_ROOT_VERSION}). Currently no migrations are registered beyond version checks.`,
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .argument('<path>', 'config file path')
    .option('--to <version>', 'target schema version (non-negative integer)')
    .action(async (path: string, opts: { to?: string }) => {
      let target = CONFIG_ROOT_VERSION as number
      if (opts.to !== undefined) {
        const parsed = Number(opts.to)
        if (!Number.isInteger(parsed) || parsed < 0) {
          program.error(`error: --to expects a non-negative integer, got "${opts.to}"`, { exitCode: 2 })
        }
        target = parsed
      }

      const loaded = await loadConfigFile(io, path)
      if (!loaded.ok) {
        result.current = { code: loaded.code, stdout: '', stderr: loaded.message }
        return
      }

      try {
        const out = migrateConfig(loaded.value, [], target)
        const stepLines =
          out.steps.length === 0
            ? '  (no migrations needed)'
            : out.steps.map((s) => `  ${s.from} → ${s.to}: ${s.description}`).join('\n')
        result.current = {
          code: 0,
          stdout: `migrated ${loaded.absolutePath} from v${out.fromVersion} to v${out.toVersion}\n${stepLines}\n\n--- output ---\n${JSON.stringify(out.output, null, 2)}\n`,
          stderr: '',
        }
      } catch (err) {
        if (err instanceof MigrationError) {
          result.current = { code: 1, stdout: '', stderr: `error: ${err.code}: ${err.message}\n` }
          return
        }
        throw err
      }
    })

  return { program, result }
}

export const configMigrate: CliCommand = {
  name: 'config migrate',
  summary: 'Migrate a config file to the current schema version',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
