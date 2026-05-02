import { diffConfigs } from '@agentskit/os-core/config/diff'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'
import { loadConfigFile } from '../loader.js'

const help = `agentskit-os config diff <prev> <next>

Prints a structural diff between two AgentsKitOS config files.
Each change line is one of: + add, - remove, ~ replace.

Exit codes: 0 ok (no changes or with changes), 1 parse error, 2 usage error, 3 read error.
`

const formatValue = (v: unknown): string => {
  const s = JSON.stringify(v)
  return s.length > 80 ? `${s.slice(0, 77)}...` : s
}

export const configDiff: CliCommand = {
  name: 'config diff',
  summary: 'Show structural diff between two config files',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    if (argv.length < 2 || argv[0] === '--help' || argv[0] === '-h') {
      return { code: 2, stdout: '', stderr: help }
    }

    const a = await loadConfigFile(io, argv[0]!)
    if (!a.ok) return { code: a.code, stdout: '', stderr: a.message }
    const b = await loadConfigFile(io, argv[1]!)
    if (!b.ok) return { code: b.code, stdout: '', stderr: b.message }

    const ops = diffConfigs(a.value, b.value)
    if (ops.length === 0) {
      return { code: 0, stdout: 'no changes\n', stderr: '' }
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

    return {
      code: 0,
      stdout: `${ops.length} change${ops.length === 1 ? '' : 's'}:\n${lines.join('\n')}\n`,
      stderr: '',
    }
  },
}
