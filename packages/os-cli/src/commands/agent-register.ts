import { resolve } from 'node:path'
import { Command } from 'commander'
import {
  parseAgentRegistryEntry,
  type AgentLifecycleState,
  type AgentRiskTier,
} from '@agentskit/os-core'
import { FileRegistryStore } from '@agentskit/os-storage'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const STATES: readonly AgentLifecycleState[] = [
  'draft', 'review', 'approved', 'staged', 'production', 'deprecated', 'retired',
]
const RISKS: readonly AgentRiskTier[] = ['low', 'medium', 'high', 'critical']

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('agent register')
    .description(
      'agentskit-os agent register — Persist a new agent registry entry under the workspace runtime root.',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .requiredOption('--id <slug>', 'agent identifier')
    .requiredOption('--owner <id>', 'responsible owner (email or handle)')
    .requiredOption('--purpose <text>', 'short purpose statement')
    .option('--state <s>', `lifecycle state (${STATES.join('|')})`, 'draft')
    .option('--risk <t>', `risk tier (${RISKS.join('|')})`, 'low')
    .option(
      '--workspace-root <path>',
      'override workspace runtime root',
      '.agentskitos/workspaces/default',
    )
    .action(async function (this: Command, opts: {
      id: string
      owner: string
      purpose: string
      state?: string
      risk?: string
      workspaceRoot?: string
    }) {
      const state = opts.state ?? 'draft'
      const risk = opts.risk ?? 'low'
      if (!STATES.includes(state as AgentLifecycleState)) {
        this.error(`error: invalid --state "${state}"`, { exitCode: 2 })
      }
      if (!RISKS.includes(risk as AgentRiskTier)) {
        this.error(`error: invalid --risk "${risk}"`, { exitCode: 2 })
      }

      const entry = parseAgentRegistryEntry({
        agentId: opts.id,
        owner: opts.owner,
        purpose: opts.purpose,
        lifecycleState: state as AgentLifecycleState,
        riskTier: risk as AgentRiskTier,
      })

      const dir = resolve(io.cwd(), opts.workspaceRoot ?? '.agentskitos/workspaces/default', 'registry')
      const store = await FileRegistryStore.create({ dir })
      await store.upsert(entry)

      result.current = {
        code: 0,
        stdout: `registered ${entry.agentId} (state=${entry.lifecycleState}, risk=${entry.riskTier})\n`,
        stderr: '',
      }
    })

  return { program, result }
}

export const agentRegister: CliCommand = {
  name: 'agent register',
  summary: 'Persist a new agent registry entry',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
