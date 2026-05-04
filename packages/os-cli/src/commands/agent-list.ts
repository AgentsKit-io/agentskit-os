import { resolve } from 'node:path'
import { Command } from 'commander'
import { FileRegistryStore } from '@agentskit/os-storage'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('agent list')
    .description(
      'agentskit-os agent list — List agents stored in the registry under the workspace runtime root.',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .option(
      '--workspace-root <path>',
      'override the workspace runtime root (default ./.agentskitos/workspaces/default)',
      '.agentskitos/workspaces/default',
    )
    .option('--json', 'emit JSON', false)
    .action(async (opts: { workspaceRoot?: string; json?: boolean }) => {
      const root = opts.workspaceRoot ?? '.agentskitos/workspaces/default'
      const dir = resolve(io.cwd(), root, 'registry')
      const store = await FileRegistryStore.create({ dir })
      const entries = await store.list()

      if (opts.json) {
        result.current = { code: 0, stdout: `${JSON.stringify(entries)}\n`, stderr: '' }
        return
      }
      if (entries.length === 0) {
        result.current = { code: 0, stdout: '(no agents registered)\n', stderr: '' }
        return
      }
      const lines = entries.map(
        (e) => `${e.agentId.padEnd(24)} ${e.lifecycleState.padEnd(12)} risk=${e.riskTier.padEnd(8)} owner=${e.owner}`,
      )
      result.current = { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
    })

  return { program, result }
}

export const agentList: CliCommand = {
  name: 'agent list',
  summary: 'List agents in the workspace registry',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
