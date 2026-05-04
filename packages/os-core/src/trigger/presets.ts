import type { TriggerConfig } from '../schema/trigger.js'
import { parseTriggerConfig } from '../schema/trigger.js'

export type TriggerPreset = {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly tags: readonly string[]
  readonly trigger: TriggerConfig
}

const preset = (p: Omit<TriggerPreset, 'trigger'> & { readonly trigger: unknown }): TriggerPreset => ({
  ...p,
  trigger: parseTriggerConfig(p.trigger),
})

/** Small curated library of copy-paste triggers for workspace bootstrapping (M4 presets). */
export const TRIGGER_PRESETS: readonly TriggerPreset[] = [
  preset({
    id: 'webhook/inbound-generic',
    title: 'Inbound webhook (generic)',
    description: 'POST webhook at /hooks/inbound; wire `flow` to your orchestration entry.',
    tags: ['webhook', 'inbound', 'http'],
    trigger: {
      id: 'webhook-inbound-generic',
      name: 'Inbound Webhook',
      enabled: true,
      flow: 'orchestrator-entry',
      tags: ['preset', 'webhook'],
      kind: 'webhook',
      path: '/hooks/inbound',
      method: 'POST',
    },
  }),
  preset({
    id: 'cron/nightly-health',
    title: 'Nightly health sweep',
    description: 'Cron trigger for a daily maintenance / health-check flow.',
    tags: ['cron', 'schedule'],
    trigger: {
      id: 'cron-nightly-health',
      name: 'Nightly Health',
      enabled: true,
      flow: 'ops-nightly-health',
      tags: ['preset', 'cron'],
      kind: 'cron',
      cron: '15 3 * * *',
      timezone: 'UTC',
    },
  }),
  preset({
    id: 'github/pull-request',
    title: 'GitHub pull requests',
    description: 'GitHub PR events for a repo (set `ACME/REPO` + map `flow` to your workflow id).',
    tags: ['github', 'pr'],
    trigger: {
      id: 'github-pull-request',
      name: 'GitHub PRs',
      enabled: true,
      flow: 'dev-orchestrator-pr-review',
      tags: ['preset', 'github'],
      kind: 'github',
      repo: 'ACME/REPO',
      event: 'pull_request',
    },
  }),
  preset({
    id: 'slack/channel-message',
    title: 'Slack channel messages',
    description: 'Slack message events in a channel (set `channel` + map `flow`).',
    tags: ['slack', 'chat'],
    trigger: {
      id: 'slack-channel-message',
      name: 'Slack Messages',
      enabled: true,
      flow: 'support-triage',
      tags: ['preset', 'slack'],
      kind: 'slack',
      channel: 'C0123456789',
      event: 'message',
    },
  }),
  preset({
    id: 'file/watch-src',
    title: 'File watch (src/)',
    description: 'Watch `src/**` for changes to kick off a local dev loop.',
    tags: ['file', 'local'],
    trigger: {
      id: 'file-watch-src',
      name: 'Watch src',
      enabled: true,
      flow: 'dev-local-loop',
      tags: ['preset', 'file'],
      kind: 'file',
      path: 'src',
      events: ['add', 'change'],
      glob: '**/*.{ts,tsx,js,jsx}',
    },
  }),
]

export const listTriggerPresets = (): readonly TriggerPreset[] => TRIGGER_PRESETS

export const getTriggerPreset = (id: string): TriggerPreset | undefined =>
  TRIGGER_PRESETS.find((p) => p.id === id)
