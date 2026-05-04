import { resolve } from 'node:path'
import { Command } from 'commander'
import {
  applyLifecycleEvent,
  evaluateTransition,
  requirementsFor,
  type AgentLifecycleState,
  type AgentRiskTier,
  type TransitionCheck,
} from '@agentskit/os-core'
import { FileRegistryStore } from '@agentskit/os-storage'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const STATES: readonly AgentLifecycleState[] = [
  'draft', 'review', 'approved', 'staged', 'production', 'deprecated', 'retired',
]
const RISKS: readonly AgentRiskTier[] = ['low', 'medium', 'high', 'critical']

const collectCheck = (value: string, previous: TransitionCheck[]): TransitionCheck[] => [
  ...previous,
  value as TransitionCheck,
]

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('agent promote')
    .description(
      'agentskit-os agent promote — Validate a lifecycle transition and emit (or optionally commit) an audit event.',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .requiredOption('--from <state>', `from state (${STATES.join('|')})`)
    .requiredOption('--to <state>', `to state (${STATES.join('|')})`)
    .option('--agent-id <slug>', 'agent identifier', 'unknown')
    .option('--actor <id>', 'principal authorizing the transition', 'unknown')
    .option('--risk <tier>', `risk tier (${RISKS.join('|')})`, 'low')
    .option('--check <name>', 'satisfied gate (repeatable)', collectCheck, [])
    .option('--reason <text>', 'free-form reason in audit event')
    .option('--json', 'emit audit JSON', false)
    .option('--commit', 'append event and upsert registry entry', false)
    .option(
      '--workspace-root <path>',
      'workspace runtime root when using --commit',
      '.agentskitos/workspaces/default',
    )
    .action(async function (this: Command, opts: {
      from: string
      to: string
      agentId?: string
      actor?: string
      risk?: string
      check: TransitionCheck[]
      reason?: string
      json?: boolean
      commit?: boolean
      workspaceRoot?: string
    }) {
      const from = opts.from as AgentLifecycleState
      const to = opts.to as AgentLifecycleState
      const risk = (opts.risk ?? 'low') as AgentRiskTier

      if (!STATES.includes(from)) {
        this.error(`error: invalid --from "${opts.from}"`, { exitCode: 2 })
      }
      if (!STATES.includes(to)) {
        this.error(`error: invalid --to "${opts.to}"`, { exitCode: 2 })
      }
      if (!RISKS.includes(risk)) {
        this.error(`error: invalid --risk "${opts.risk}"`, { exitCode: 2 })
      }

      const decision = evaluateTransition({
        from,
        to,
        riskTier: risk,
        satisfied: opts.check,
      })

      if (!decision.ok && decision.reason === 'not_allowed') {
        const required = requirementsFor(from, to, risk).checks
        result.current = {
          code: 5,
          stdout: '',
          stderr:
            `error: transition ${from} → ${to} is not allowed.\nAllowed targets must follow the SDLC graph; required checks for the closest forward edge: ${required.join(', ') || '(none)'}\n`,
        }
        return
      }
      if (!decision.ok && decision.reason === 'missing_checks') {
        result.current = {
          code: 6,
          stdout: '',
          stderr: `error: transition ${from} → ${to} blocked. Missing checks: ${(decision.missing ?? []).join(', ')}\nDeclare satisfied checks with --check <name>.\n`,
        }
        return
      }

      const event = {
        type: 'agent.lifecycle.transition' as const,
        agentId: opts.agentId ?? 'unknown',
        from,
        to,
        riskTier: risk,
        actor: opts.actor ?? 'unknown',
        satisfiedChecks: opts.check,
        ...(opts.reason ? { reason: opts.reason } : {}),
        at: new Date().toISOString(),
      }

      let committed = false
      if (opts.commit) {
        const dir = resolve(io.cwd(), opts.workspaceRoot ?? '.agentskitos/workspaces/default', 'registry')
        const store = await FileRegistryStore.create({ dir })
        const existing = await store.get(opts.agentId ?? 'unknown')
        if (!existing) {
          result.current = {
            code: 8,
            stdout: '',
            stderr: `error: agent "${opts.agentId}" not found in registry. Run \`agentskit-os agent register\` first.\n`,
          }
          return
        }
        if (existing.lifecycleState !== from) {
          result.current = {
            code: 9,
            stdout: '',
            stderr: `error: registry state mismatch — stored=${existing.lifecycleState}, --from=${from}\n`,
          }
          return
        }
        await store.appendEvent(event)
        const updated = applyLifecycleEvent(existing, event)
        await store.upsert(updated)
        committed = true
      }

      if (opts.json) {
        result.current = { code: 0, stdout: `${JSON.stringify({ event, committed })}\n`, stderr: '' }
        return
      }
      result.current = {
        code: 0,
        stdout:
          `ok: ${opts.agentId ?? 'unknown'} ${from} → ${to} (risk=${risk}) by ${opts.actor ?? 'unknown'}${committed ? ' [committed]' : ' [dry-run]'}\n` +
          `audit: ${JSON.stringify(event)}\n`,
        stderr: '',
      }
    })

  return { program, result }
}

export const agentPromote: CliCommand = {
  name: 'agent promote',
  summary: 'Validate an agent lifecycle transition + emit audit event',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
