// #369 — development trigger presets that route external events into coding tasks.

import type { CodingTaskKind, CodingTaskRequest } from '@agentskit/os-core'

export type DevTriggerKind =
  | 'slack'
  | 'discord'
  | 'teams'
  | 'cron'
  | 'github_pr'
  | 'github_issue'
  | 'webhook'

export type DevTriggerRunMode = 'single' | 'multi_provider' | 'benchmark'

export type DevTriggerPermissionProfile = 'read_only' | 'edit_repo' | 'open_pr' | 'admin'

export type DevTriggerAuthExpectation = {
  /** Stable id for the credential bundle the runtime should bind. */
  readonly credential: string
  /** What the credential is used for, surfaced in docs and policy checks. */
  readonly note: string
}

export type DevTriggerPresetMapInput = {
  readonly payload: unknown
  readonly repoRoot: string
  readonly defaults?: Partial<Pick<CodingTaskRequest, 'readScope' | 'writeScope' | 'timeoutMs' | 'dryRun'>>
}

export type DevTriggerPreset = {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly kind: DevTriggerKind
  readonly defaultPermissionProfile: DevTriggerPermissionProfile
  readonly defaultRunMode: DevTriggerRunMode
  readonly targetPipeline: string
  readonly authExpectations: readonly DevTriggerAuthExpectation[]
  readonly examplePayload: unknown
  /** Map a raw event payload to a normalized coding task. */
  readonly mapPayload: (input: DevTriggerPresetMapInput) => CodingTaskRequest
}

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {}

const asStr = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined

const baseRequest = (
  prompt: string,
  kind: CodingTaskKind,
  input: DevTriggerPresetMapInput,
  granted: CodingTaskRequest['granted'],
  writeScope: readonly string[],
): CodingTaskRequest => ({
  kind,
  prompt,
  cwd: input.repoRoot,
  readScope: input.defaults?.readScope ?? ['**/*'],
  writeScope: input.defaults?.writeScope ?? [...writeScope],
  granted,
  timeoutMs: input.defaults?.timeoutMs ?? 600_000,
  dryRun: input.defaults?.dryRun ?? false,
})

const promptOrDefault = (raw: unknown, fallback: string): string => {
  const r = asRecord(raw)
  return (
    asStr(r.prompt)
    ?? asStr(r.text)
    ?? asStr(r.message)
    ?? asStr(r.body)
    ?? asStr(r.title)
    ?? fallback
  )
}

const slackPreset: DevTriggerPreset = {
  id: 'dev/slack-message',
  title: 'Slack message → coding task',
  description: 'Slack chat command or message routes to a single-provider coding task in a dev repo.',
  kind: 'slack',
  defaultPermissionProfile: 'edit_repo',
  defaultRunMode: 'single',
  targetPipeline: 'dev-orchestrator/single-task',
  authExpectations: [{ credential: 'slack.bot_token', note: 'Slack bot token (chat:read,write).' }],
  examplePayload: {
    type: 'message',
    channel: 'C0123',
    user: 'U999',
    text: 'fix the typo in README',
  },
  mapPayload: (input) => {
    const text = promptOrDefault(input.payload, 'Investigate the latest Slack request.')
    return baseRequest(text, 'free-form', input, ['edit_files', 'run_shell', 'git_ops'], ['**/*'])
  },
}

const discordPreset: DevTriggerPreset = {
  id: 'dev/discord-message',
  title: 'Discord message → coding task',
  description: 'Discord message webhook routes to a single-provider coding task.',
  kind: 'discord',
  defaultPermissionProfile: 'edit_repo',
  defaultRunMode: 'single',
  targetPipeline: 'dev-orchestrator/single-task',
  authExpectations: [{ credential: 'discord.webhook_secret', note: 'Discord interaction signing key.' }],
  examplePayload: { content: 'add a CHANGELOG entry', author: { id: '42', username: 'dev' } },
  mapPayload: (input) => {
    const r = asRecord(input.payload)
    const text = asStr(r.content) ?? promptOrDefault(input.payload, 'Discord-routed coding task.')
    return baseRequest(text, 'free-form', input, ['edit_files', 'run_shell', 'git_ops'], ['**/*'])
  },
}

const teamsPreset: DevTriggerPreset = {
  id: 'dev/teams-message',
  title: 'Microsoft Teams message → coding task',
  description: 'Teams incoming webhook routes to a single-provider coding task.',
  kind: 'teams',
  defaultPermissionProfile: 'edit_repo',
  defaultRunMode: 'single',
  targetPipeline: 'dev-orchestrator/single-task',
  authExpectations: [{ credential: 'teams.webhook_secret', note: 'Teams connector HMAC.' }],
  examplePayload: { text: 'tighten the sandbox policy in os-sandbox' },
  mapPayload: (input) => {
    const text = promptOrDefault(input.payload, 'Teams-routed coding task.')
    return baseRequest(text, 'free-form', input, ['edit_files', 'run_shell', 'git_ops'], ['**/*'])
  },
}

const cronPreset: DevTriggerPreset = {
  id: 'dev/cron-dependency-update',
  title: 'Cron schedule → dependency update',
  description: 'Cron-triggered task running a dependency update across providers.',
  kind: 'cron',
  defaultPermissionProfile: 'open_pr',
  defaultRunMode: 'multi_provider',
  targetPipeline: 'dev-orchestrator/multi-provider-task',
  authExpectations: [
    { credential: 'github.app_token', note: 'GitHub app/PAT for opening PRs.' },
  ],
  examplePayload: { cron: '0 4 * * 1', task: 'pnpm-update' },
  mapPayload: (input) => {
    const prompt = 'Run a dependency update sweep: bump minors, run lint+test, summarize risk.'
    return baseRequest(prompt, 'edit', input, ['edit_files', 'run_shell', 'git_ops'], ['**/package.json', '**/pnpm-lock.yaml'])
  },
}

const githubPrPreset: DevTriggerPreset = {
  id: 'dev/github-pr-opened',
  title: 'GitHub PR opened → review task',
  description: 'PR opened/updated triggers a review task in dry-run mode.',
  kind: 'github_pr',
  defaultPermissionProfile: 'read_only',
  defaultRunMode: 'single',
  targetPipeline: 'dev-orchestrator/pr-review',
  authExpectations: [
    { credential: 'github.app_token', note: 'GitHub app for PR comments.' },
  ],
  examplePayload: {
    action: 'opened',
    pull_request: {
      number: 42,
      title: 'feat: add foo',
      body: 'closes #100',
      head: { ref: 'feat/foo' },
    },
  },
  mapPayload: (input) => {
    const r = asRecord(input.payload)
    const pr = asRecord(r.pull_request)
    const title = asStr(pr.title) ?? 'PR review'
    const body = asStr(pr.body) ?? ''
    const prompt = `Review the following pull request and surface risks/regressions in dry-run.\n\nTitle: ${title}\n\nDescription:\n${body}`
    return {
      ...baseRequest(prompt, 'free-form', input, [], ['**/*']),
      writeScope: [],
      dryRun: input.defaults?.dryRun ?? true,
    }
  },
}

const githubIssuePreset: DevTriggerPreset = {
  id: 'dev/github-issue-opened',
  title: 'GitHub issue opened → fix attempt',
  description: 'New issue triggers a multi-provider issue→PR delegation task.',
  kind: 'github_issue',
  defaultPermissionProfile: 'open_pr',
  defaultRunMode: 'multi_provider',
  targetPipeline: 'dev-orchestrator/issue-to-pr',
  authExpectations: [
    { credential: 'github.app_token', note: 'GitHub app for issue/PR ops.' },
  ],
  examplePayload: {
    action: 'opened',
    issue: { number: 1, title: 'Fix flaky test', body: 'see logs' },
  },
  mapPayload: (input) => {
    const r = asRecord(input.payload)
    const issue = asRecord(r.issue)
    const title = asStr(issue.title) ?? 'Issue fix'
    const body = asStr(issue.body) ?? ''
    const prompt = `Address this issue end-to-end and propose a patch.\n\nTitle: ${title}\n\nBody:\n${body}`
    return baseRequest(prompt, 'edit', input, ['edit_files', 'run_shell', 'git_ops'], ['**/*'])
  },
}

const webhookPreset: DevTriggerPreset = {
  id: 'dev/generic-webhook',
  title: 'Generic webhook → coding task',
  description: 'Generic HTTPS webhook with `prompt` body field routes to a single coding task.',
  kind: 'webhook',
  defaultPermissionProfile: 'edit_repo',
  defaultRunMode: 'single',
  targetPipeline: 'dev-orchestrator/single-task',
  authExpectations: [{ credential: 'webhook.signing_secret', note: 'HMAC for inbound POSTs.' }],
  examplePayload: { prompt: 'rewrite README intro' },
  mapPayload: (input) => {
    const text = promptOrDefault(input.payload, 'Generic webhook coding task.')
    return baseRequest(text, 'free-form', input, ['edit_files', 'run_shell', 'git_ops'], ['**/*'])
  },
}

export const DEV_TRIGGER_PRESETS: readonly DevTriggerPreset[] = [
  slackPreset,
  discordPreset,
  teamsPreset,
  cronPreset,
  githubPrPreset,
  githubIssuePreset,
  webhookPreset,
]

export const listDevTriggerPresets = (): readonly DevTriggerPreset[] => DEV_TRIGGER_PRESETS

export const getDevTriggerPreset = (id: string): DevTriggerPreset | undefined =>
  DEV_TRIGGER_PRESETS.find((p) => p.id === id)
