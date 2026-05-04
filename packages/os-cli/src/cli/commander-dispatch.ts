import { Command, CommanderError } from 'commander'

const isHelpCode = (code: string | undefined): boolean =>
  code === 'commander.helpDisplayed' || code === 'commander.help' || code === 'commander.version'

/**
 * Runs a Commander program with argv sliced for this subcommand, captures stdout/stderr,
 * and maps Commander exit codes to AgentsKit CLI conventions (help → 2).
 *
 * Call `program.error(...)` on this same `program` instance from `.action()` handlers so
 * `exitOverride` applies. Subcommands' `.error()` may still invoke `process.exit` under Vitest.
 */
export const runCommander = async (
  program: Command,
  argv: readonly string[],
): Promise<{ code: number; stdout: string; stderr: string }> => {
  let stdout = ''
  let stderr = ''
  program.configureOutput({
    writeOut: (s: string) => {
      stdout += s
    },
    writeErr: (s: string) => {
      stderr += s
    },
  })
  program.exitOverride()
  program.showHelpAfterError(true)

  try {
    await program.parseAsync([...argv], { from: 'user' })
    return { code: 0, stdout, stderr }
  } catch (err) {
    if (err instanceof CommanderError) {
      if (isHelpCode(err.code)) {
        return { code: 2, stdout, stderr }
      }
      const exit = typeof err.exitCode === 'number' ? err.exitCode : 2
      const msg = err.message ? `${err.message}\n` : ''
      const outErr = stderr || msg
      if (exit === 0) {
        return { code: 2, stdout, stderr: outErr }
      }
      // Keep exitCode from `program.error(...)` (code === 'commander.error'); map other exit-1 parse issues to CLI usage (2).
      const mapped = exit === 1 && err.code !== 'commander.error' ? 2 : exit
      return { code: mapped, stdout, stderr: outErr }
    }
    throw err
  }
}
