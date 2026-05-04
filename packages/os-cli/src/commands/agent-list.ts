import { resolve } from 'node:path'
import { FileRegistryStore } from '@agentskit/os-storage'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const help = `agentskit-os agent list [--workspace-root <path>] [--json]

Lists agents stored in the registry under the workspace runtime root.

Options:
  --workspace-root <path>  override the workspace runtime root
                            (defaults to ./.agentskitos/workspaces/default)
  --json                    emit JSON

Exit codes: 0 ok, 2 usage error.
`

type Args = {
  workspaceRoot: string
  json: boolean
  usage?: string
}

const parseArgs = (argv: readonly string[]): Args => {
  const out: Args = { workspaceRoot: '.agentskitos/workspaces/default', json: false }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    if (a === '--json') { out.json = true; i++; continue }
    if (a === '--workspace-root') {
      const v = argv[i + 1]
      if (!v || v.startsWith('--')) return { ...out, usage: '--workspace-root requires a value' }
      out.workspaceRoot = v
      i += 2
      continue
    }
    return { ...out, usage: `unknown argument "${a}"` }
  }
  return out
}

export const agentList: CliCommand = {
  name: 'agent list',
  summary: 'List agents in the workspace registry',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const args = parseArgs(argv)
    if (args.usage === 'help') return { code: 2, stdout: '', stderr: help }
    if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${help}` }

    const dir = resolve(io.cwd(), args.workspaceRoot, 'registry')
    const store = await FileRegistryStore.create({ dir })
    const entries = await store.list()

    if (args.json) {
      return { code: 0, stdout: `${JSON.stringify(entries)}\n`, stderr: '' }
    }
    if (entries.length === 0) {
      return { code: 0, stdout: '(no agents registered)\n', stderr: '' }
    }
    const lines = entries.map(
      (e) => `${e.agentId.padEnd(24)} ${e.lifecycleState.padEnd(12)} risk=${e.riskTier.padEnd(8)} owner=${e.owner}`,
    )
    return { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
  },
}
