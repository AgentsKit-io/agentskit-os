import { Command } from 'commander'
import { diffConfigs } from '@agentskit/os-core/config/diff'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'
import { loadConfigFile } from '../loader.js'

const formatValue = (v: unknown): string => {
  const s = JSON.stringify(v)
  return s.length > 80 ? `${s.slice(0, 77)}...` : s
}

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('config diff')
    .description(
      'agentskit-os config diff — Print a structural diff between two AgentsKitOS config files (+ add, - remove, ~ replace).',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .argument('<prev>', 'first config path')
    .argument('<next>', 'second config path')
    .action(async (prevPath: string, nextPath: string) => {
      const a = await loadConfigFile(io, prevPath)
      if (!a.ok) {
        result.current = { code: a.code, stdout: '', stderr: a.message }
        return
      }
      const b = await loadConfigFile(io, nextPath)
      if (!b.ok) {
        result.current = { code: b.code, stdout: '', stderr: b.message }
        return
      }

      const ops = diffConfigs(a.value, b.value)
      if (ops.length === 0) {
        result.current = { code: 0, stdout: 'no changes\n', stderr: '' }
        return
      }

      const lines = ops.map((op) => {
        switch (op.kind) {
          case 'add':
            return `+ ${op.path}: ${formatValue(op.value)}`
          case 'remove':
            return `- ${op.path}: ${formatValue(op.previous)}`
          case 'replace':
            return `~ ${op.path}: ${formatValue(op.previous)} → ${formatValue(op.value)}`
        }
      })

      result.current = {
        code: 0,
        stdout: `${ops.length} change${ops.length === 1 ? '' : 's'}:\n${lines.join('\n')}\n`,
        stderr: '',
      }
    })

  return { program, result }
}

export const configDiff: CliCommand = {
  name: 'config diff',
  summary: 'Show structural diff between two config files',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
