import { resolve } from 'node:path'
import {
  parseAgentRegistryEntry,
  type AgentLifecycleState,
  type AgentRiskTier,
} from '@agentskit/os-core'
import { FileRegistryStore } from '@agentskit/os-storage'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const help = `agentskit-os agent register --id <slug> --owner <id> --purpose <text> [options]

Persists an agent registry entry under the workspace runtime root.
Use this once per agent before running \`agent promote\`.

Required:
  --id <slug>         agent identifier
  --owner <id>        responsible owner (email or handle)
  --purpose <text>    short purpose statement

Options:
  --state <s>         initial lifecycle state (default draft)
  --risk <t>          low | medium | high | critical (default low)
  --workspace-root <path>  override the workspace runtime root
                            (defaults to ./.agentskitos/workspaces/default)

Exit codes: 0 ok, 2 usage error.
`

type Args = {
  id?: string
  owner?: string
  purpose?: string
  state: AgentLifecycleState
  risk: AgentRiskTier
  workspaceRoot: string
  usage?: string
}

const STATES: readonly AgentLifecycleState[] = [
  'draft', 'review', 'approved', 'staged', 'production', 'deprecated', 'retired',
]
const RISKS: readonly AgentRiskTier[] = ['low', 'medium', 'high', 'critical']

const parseArgs = (argv: readonly string[]): Args => {
  const out: Args = {
    state: 'draft',
    risk: 'low',
    workspaceRoot: '.agentskitos/workspaces/default',
  }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    const need = ['--id', '--owner', '--purpose', '--state', '--risk', '--workspace-root']
    if (a && need.includes(a)) {
      const v = argv[i + 1]
      if (!v || v.startsWith('--')) return { ...out, usage: `${a} requires a value` }
      if (a === '--id') out.id = v
      else if (a === '--owner') out.owner = v
      else if (a === '--purpose') out.purpose = v
      else if (a === '--state') {
        if (!STATES.includes(v as AgentLifecycleState)) return { ...out, usage: `invalid --state "${v}"` }
        out.state = v as AgentLifecycleState
      }
      else if (a === '--risk') {
        if (!RISKS.includes(v as AgentRiskTier)) return { ...out, usage: `invalid --risk "${v}"` }
        out.risk = v as AgentRiskTier
      }
      else out.workspaceRoot = v
      i += 2
      continue
    }
    return { ...out, usage: `unknown argument "${a}"` }
  }
  if (!out.id || !out.owner || !out.purpose) {
    return { ...out, usage: '--id, --owner, and --purpose are required' }
  }
  return out
}

export const agentRegister: CliCommand = {
  name: 'agent register',
  summary: 'Persist a new agent registry entry',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const args = parseArgs(argv)
    if (args.usage === 'help') return { code: 2, stdout: '', stderr: help }
    if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${help}` }

    const entry = parseAgentRegistryEntry({
      agentId: args.id!,
      owner: args.owner!,
      purpose: args.purpose!,
      lifecycleState: args.state,
      riskTier: args.risk,
    })

    const dir = resolve(io.cwd(), args.workspaceRoot, 'registry')
    const store = await FileRegistryStore.create({ dir })
    await store.upsert(entry)

    return {
      code: 0,
      stdout: `registered ${entry.agentId} (state=${entry.lifecycleState}, risk=${entry.riskTier})\n`,
      stderr: '',
    }
  },
}
