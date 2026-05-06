// Per #71/#72/#73/#75/#77/#78 — built-in TriggerContract registrations.
// Pure: each contract validates its config + builds a deterministic dispatch
// outcome. Caller wires the actual cron scheduler / webhook server / file
// watcher / Slack / GitHub / Linear adapter at the runtime boundary.

import type {
  CronTrigger,
  FileWatchTrigger,
  GitHubTrigger,
  LinearTrigger,
  SlackTrigger,
  TriggerConfig,
  WebhookTrigger,
} from '../schema/trigger.js'
import type {
  TriggerContract,
  TriggerDispatch,
  TriggerEvent,
  TriggerRegistry,
} from './contract.js'

const CRON_FIELDS = 5
const WEBHOOK_PATH_RE = /^\/[A-Za-z0-9._\-/]*$/

const dispatched = (cfg: TriggerConfig, event: TriggerEvent, suffix: string): TriggerDispatch => ({
  kind: 'dispatched',
  runId: `run-${cfg.id}-${event.receivedAt}-${suffix}`,
  flow: cfg.flow,
  input: event.payload,
})

const cronContract: TriggerContract<CronTrigger> = {
  kind: 'cron',
  displayName: 'Cron schedule',
  validate: (cfg) => {
    const issues: string[] = []
    const parts = cfg.cron.trim().split(/\s+/)
    if (parts.length !== CRON_FIELDS) issues.push(`cron expression must have ${CRON_FIELDS} fields`)
    if (cfg.timezone !== undefined && cfg.timezone.length === 0) issues.push('timezone must be non-empty when set')
    return issues
  },
  dispatch: async (cfg, event) => dispatched(cfg, event, 'cron'),
}

const webhookContract: TriggerContract<WebhookTrigger> = {
  kind: 'webhook',
  displayName: 'Inbound webhook',
  validate: (cfg) => {
    const issues: string[] = []
    if (!WEBHOOK_PATH_RE.test(cfg.path)) issues.push(`webhook path "${cfg.path}" must start with "/" and use safe chars`)
    return issues
  },
  dispatch: async (cfg, event) => dispatched(cfg, event, 'webhook'),
}

const fileWatchContract: TriggerContract<FileWatchTrigger> = {
  kind: 'file',
  displayName: 'File watcher',
  validate: (cfg) => {
    const issues: string[] = []
    if (cfg.path.length === 0) issues.push('file path must be non-empty')
    if (cfg.events.length === 0) issues.push('file trigger must subscribe to at least one event')
    return issues
  },
  dispatch: async (cfg, event) => dispatched(cfg, event, 'file'),
}

const slackContract: TriggerContract<SlackTrigger> = {
  kind: 'slack',
  displayName: 'Slack event',
  validate: (cfg) => {
    const issues: string[] = []
    if (cfg.channel.length === 0) issues.push('slack trigger needs a channel')
    return issues
  },
  dispatch: async (cfg, event) => dispatched(cfg, event, 'slack'),
}

const githubContract: TriggerContract<GitHubTrigger> = {
  kind: 'github',
  displayName: 'GitHub event',
  validate: (cfg) => {
    const issues: string[] = []
    if (!cfg.repo.includes('/')) issues.push('github trigger repo must be owner/repo')
    return issues
  },
  dispatch: async (cfg, event) => dispatched(cfg, event, 'github'),
}

const linearContract: TriggerContract<LinearTrigger> = {
  kind: 'linear',
  displayName: 'Linear ticket event',
  validate: (cfg) => {
    const issues: string[] = []
    if (cfg.team.length === 0) issues.push('linear trigger needs a team')
    return issues
  },
  dispatch: async (cfg, event) => dispatched(cfg, event, 'linear'),
}

export const BUILTIN_TRIGGER_CONTRACTS: ReadonlyArray<TriggerContract> = [
  cronContract,
  webhookContract,
  fileWatchContract,
  slackContract,
  githubContract,
  linearContract,
] as ReadonlyArray<TriggerContract>

/**
 * Register every built-in trigger contract on the supplied registry (#71-#78).
 * Returns the registry for chaining. Idempotent: an existing registration
 * for the same kind is preserved and reported as a conflict in the log.
 */
export const registerBuiltinTriggerContracts = (registry: TriggerRegistry): TriggerRegistry => {
  for (const c of BUILTIN_TRIGGER_CONTRACTS) {
    registry.register(c)
  }
  return registry
}
