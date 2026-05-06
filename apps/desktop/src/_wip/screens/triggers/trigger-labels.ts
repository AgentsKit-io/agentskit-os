import type { TriggerProvider, TriggerStatus } from './use-triggers'

export const TRIGGER_PROVIDER_LABEL: Record<TriggerProvider, string> = {
  slack: 'Slack',
  discord: 'Discord',
  teams: 'Teams',
  cron: 'Cron',
  github_pr: 'GitHub PR',
  webhook: 'Webhook',
}

export const TRIGGER_STATUS_LABEL: Record<TriggerStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  failing: 'Failing',
  needs_auth: 'Needs auth',
}
