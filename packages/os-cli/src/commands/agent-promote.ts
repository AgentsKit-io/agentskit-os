import { resolve } from 'node:path'
import {
  applyLifecycleEvent,
  evaluateTransition,
  requirementsFor,
  type AgentLifecycleState,
  type AgentRiskTier,
  type TransitionCheck,
} from '@agentskit/os-core'
import { FileRegistryStore } from '@agentskit/os-storage'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const help = `agentskit-os agent promote --from <state> --to <state> [options]

Validates a lifecycle transition for an agent and prints the audit event
that callers should record (or the missing checks that block it).

This command is non-mutating: it does not write to a registry. Wire-up to
an agent registry store is a follow-up (M2).

Required:
  --from <state>     draft | review | approved | staged | production | deprecated | retired
  --to <state>       same set

Options:
  --agent-id <slug>  agent identifier for the audit event (default "unknown")
  --actor <id>       human or service principal authorizing the transition (default "unknown")
  --risk <tier>      low | medium | high | critical (default low)
  --check <name>     declare a satisfied check; repeat for each
                     (reviewer_signoff | eval_passing | security_audit |
                      risk_committee_signoff | rollback_plan |
                      owner_acknowledged_deprecation)
  --reason <text>    free-form reason recorded in the audit event
  --json             emit the audit event as JSON on stdout

Exit codes: 0 ok, 2 usage error, 5 transition not allowed, 6 missing required checks.
`

const STATES: readonly AgentLifecycleState[] = [
  'draft', 'review', 'approved', 'staged', 'production', 'deprecated', 'retired',
]
const RISKS: readonly AgentRiskTier[] = ['low', 'medium', 'high', 'critical']

type Args = {
  from?: string
  to?: string
  agentId: string
  actor: string
  risk: AgentRiskTier
  checks: TransitionCheck[]
  reason?: string
  json: boolean
  commit: boolean
  workspaceRoot: string
  usage?: string
}

const parseArgs = (argv: readonly string[]): Args => {
  const out: Args = {
    agentId: 'unknown',
    actor: 'unknown',
    risk: 'low',
    checks: [],
    json: false,
    commit: false,
    workspaceRoot: '.agentskitos/workspaces/default',
  }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    const needsValue = ['--from', '--to', '--agent-id', '--actor', '--risk', '--check', '--reason', '--workspace-root']
    if (a && needsValue.includes(a)) {
      const v = argv[i + 1]
      if (v === undefined || v.startsWith('--')) return { ...out, usage: `${a} requires a value` }
      if (a === '--from') out.from = v
      else if (a === '--to') out.to = v
      else if (a === '--agent-id') out.agentId = v
      else if (a === '--actor') out.actor = v
      else if (a === '--risk') {
        if (!RISKS.includes(v as AgentRiskTier)) return { ...out, usage: `invalid --risk "${v}"` }
        out.risk = v as AgentRiskTier
      }
      else if (a === '--check') out.checks.push(v as TransitionCheck)
      else if (a === '--reason') out.reason = v
      else if (a === '--workspace-root') out.workspaceRoot = v
      i += 2
      continue
    }
    if (a === '--json') { out.json = true; i++; continue }
    if (a === '--commit') { out.commit = true; i++; continue }
    return { ...out, usage: `unknown argument "${a}"` }
  }
  if (!out.from || !out.to) return { ...out, usage: '--from and --to are required' }
  if (!STATES.includes(out.from as AgentLifecycleState)) return { ...out, usage: `invalid --from "${out.from}"` }
  if (!STATES.includes(out.to as AgentLifecycleState)) return { ...out, usage: `invalid --to "${out.to}"` }
  return out
}

export const agentPromote: CliCommand = {
  name: 'agent promote',
  summary: 'Validate an agent lifecycle transition + emit audit event',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const args = parseArgs(argv)
    if (args.usage === 'help') return { code: 2, stdout: '', stderr: help }
    if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${help}` }

    const from = args.from as AgentLifecycleState
    const to = args.to as AgentLifecycleState

    const decision = evaluateTransition({
      from, to,
      riskTier: args.risk,
      satisfied: args.checks,
    })

    if (!decision.ok && decision.reason === 'not_allowed') {
      const required = requirementsFor(from, to, args.risk).checks
      return {
        code: 5,
        stdout: '',
        stderr: `error: transition ${from} → ${to} is not allowed.\nAllowed targets must follow the SDLC graph; required checks for the closest forward edge: ${required.join(', ') || '(none)'}\n`,
      }
    }
    if (!decision.ok && decision.reason === 'missing_checks') {
      return {
        code: 6,
        stdout: '',
        stderr: `error: transition ${from} → ${to} blocked. Missing checks: ${(decision.missing ?? []).join(', ')}\nDeclare satisfied checks with --check <name>.\n`,
      }
    }

    const event = {
      type: 'agent.lifecycle.transition' as const,
      agentId: args.agentId,
      from, to,
      riskTier: args.risk,
      actor: args.actor,
      satisfiedChecks: args.checks,
      ...(args.reason ? { reason: args.reason } : {}),
      at: new Date().toISOString(),
    }

    let committed = false
    if (args.commit) {
      const dir = resolve(io.cwd(), args.workspaceRoot, 'registry')
      const store = await FileRegistryStore.create({ dir })
      const existing = await store.get(args.agentId)
      if (!existing) {
        return {
          code: 8,
          stdout: '',
          stderr: `error: agent "${args.agentId}" not found in registry. Run \`agentskit-os agent register\` first.\n`,
        }
      }
      if (existing.lifecycleState !== from) {
        return {
          code: 9,
          stdout: '',
          stderr: `error: registry state mismatch — stored=${existing.lifecycleState}, --from=${from}\n`,
        }
      }
      await store.appendEvent(event)
      const updated = applyLifecycleEvent(existing, event)
      await store.upsert(updated)
      committed = true
    }

    if (args.json) {
      return { code: 0, stdout: `${JSON.stringify({ event, committed })}\n`, stderr: '' }
    }
    return {
      code: 0,
      stdout:
        `ok: ${args.agentId} ${from} → ${to} (risk=${args.risk}) by ${args.actor}${committed ? ' [committed]' : ' [dry-run]'}\n` +
        `audit: ${JSON.stringify(event)}\n`,
      stderr: '',
    }
  },
}
