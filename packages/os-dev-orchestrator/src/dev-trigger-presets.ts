// Per #369 — development trigger presets for external events → dev orchestrator runs.

import type { CodingTaskKind } from '@agentskit/os-core'
import type { CodingPermissionProfileId } from './coding-permission-profiles.js'

export type DevTriggerAuthExpectation =
  | 'none'
  | 'webhook_signature'
  | 'oauth_token'
  | 'github_app'
  | 'slack_signing_secret'

export type DevTriggerKind = 'slack_message' | 'discord_message' | 'teams_message' | 'cron' | 'github_pr' | 'webhook'

export type DevTriggerRunMode = 'single_provider' | 'benchmark' | 'delegation' | 'issue_to_pr' | 'pr_review'

export type DevTriggerPermissionProfile = {
  readonly profileId: CodingPermissionProfileId
  readonly reason: string
}

export type DevTriggerPreset = {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly tags: readonly string[]
  readonly kind: DevTriggerKind
  readonly auth: DevTriggerAuthExpectation
  readonly runMode: DevTriggerRunMode
  readonly defaultPermission: DevTriggerPermissionProfile
  /**
   * Default task kind used when the inbound message isn't explicit.
   * This is only used for mapping external chat/webhook payloads into a dev task request.
   */
  readonly defaultTaskKind: CodingTaskKind
  /**
   * Extract a user-visible instruction from the incoming payload.
   * Must be pure and defensive; never throw.
   */
  readonly promptFromPayload: (payload: unknown) => string | undefined
}

const safeText = (x: unknown): string | undefined => {
  if (typeof x !== 'string') return undefined
  const t = x.trim()
  return t.length > 0 ? t : undefined
}

const firstNonEmpty = (...xs: Array<string | undefined>): string | undefined => {
  for (const x of xs) if (x && x.trim() !== '') return x.trim()
  return undefined
}

const obj = (x: unknown): Record<string, unknown> | undefined =>
  x && typeof x === 'object' ? (x as Record<string, unknown>) : undefined

const fromSlack = (payload: unknown): string | undefined => {
  const p = obj(payload)
  if (!p) return undefined
  // Common shapes: { event: { text } } or { text }
  const event = obj(p.event)
  return firstNonEmpty(safeText(event?.text), safeText(p.text))
}

const fromDiscord = (payload: unknown): string | undefined => {
  const p = obj(payload)
  if (!p) return undefined
  // Discord interactions tend to be nested; accept a few likely keys.
  const data = obj(p.data)
  const msg = obj(p.message)
  return firstNonEmpty(
    safeText(p.content),
    safeText(msg?.content),
    safeText(data?.content),
    safeText(data?.value),
  )
}

const fromTeams = (payload: unknown): string | undefined => {
  const p = obj(payload)
  if (!p) return undefined
  // Teams connector cards: "text" often present.
  return firstNonEmpty(safeText(p.text), safeText(p.summary))
}

const fromGitHubPr = (payload: unknown): string | undefined => {
  const p = obj(payload)
  if (!p) return undefined
  const pr = obj(p.pull_request)
  const title = safeText(pr?.title)
  const body = safeText(pr?.body)
  return firstNonEmpty(title, body)
}

const fromGenericWebhook = (payload: unknown): string | undefined => {
  const p = obj(payload)
  if (!p) return undefined
  return firstNonEmpty(safeText(p.prompt), safeText(p.text), safeText(p.message), safeText(p.summary))
}

const preset = (p: DevTriggerPreset): DevTriggerPreset => p

export const DEV_TRIGGER_PRESETS: readonly DevTriggerPreset[] = [
  preset({
    id: 'slack/fix-issue-from-message',
    title: 'Slack message → fix-bug run',
    description: 'Treat a Slack channel message as a dev task prompt (fix-bug by default).',
    tags: ['dev', 'slack', 'chat', 'preset'],
    kind: 'slack_message',
    auth: 'slack_signing_secret',
    runMode: 'single_provider',
    defaultPermission: { profileId: 'full_sandbox', reason: 'dev task may need edits + tests in repo sandbox' },
    defaultTaskKind: 'fix-bug',
    promptFromPayload: fromSlack,
  }),
  preset({
    id: 'discord/fix-issue-from-message',
    title: 'Discord message → fix-bug run',
    description: 'Treat a Discord inbound payload as a dev task prompt (fix-bug by default).',
    tags: ['dev', 'discord', 'chat', 'preset'],
    kind: 'discord_message',
    auth: 'webhook_signature',
    runMode: 'single_provider',
    defaultPermission: { profileId: 'full_sandbox', reason: 'dev task may need edits + tests in repo sandbox' },
    defaultTaskKind: 'fix-bug',
    promptFromPayload: fromDiscord,
  }),
  preset({
    id: 'teams/fix-issue-from-message',
    title: 'Teams message → fix-bug run',
    description: 'Treat a Teams inbound webhook payload as a dev task prompt (fix-bug by default).',
    tags: ['dev', 'teams', 'chat', 'preset'],
    kind: 'teams_message',
    auth: 'webhook_signature',
    runMode: 'single_provider',
    defaultPermission: { profileId: 'full_sandbox', reason: 'dev task may need edits + tests in repo sandbox' },
    defaultTaskKind: 'fix-bug',
    promptFromPayload: fromTeams,
  }),
  preset({
    id: 'github/pr-opened-review',
    title: 'GitHub PR opened → pr-review run',
    description: 'When a PR is opened, run a provider review over the diff and post results.',
    tags: ['dev', 'github', 'pr', 'preset'],
    kind: 'github_pr',
    auth: 'github_app',
    runMode: 'pr_review',
    defaultPermission: { profileId: 'read_only_review', reason: 'default-safe PR review: no edits or shell' },
    defaultTaskKind: 'review-pr',
    promptFromPayload: fromGitHubPr,
  }),
  preset({
    id: 'cron/deps-weekly',
    title: 'Cron weekly → refactor / dependency maintenance',
    description: 'Scheduled maintenance prompt (dependency updates, audit, smoke tests).',
    tags: ['dev', 'cron', 'preset'],
    kind: 'cron',
    auth: 'none',
    runMode: 'benchmark',
    defaultPermission: { profileId: 'test_runner', reason: 'default to running tests/lint without edits' },
    defaultTaskKind: 'refactor',
    promptFromPayload: () => 'Weekly maintenance: update deps if safe, run tests, and summarize changes.',
  }),
  preset({
    id: 'webhook/dev-task',
    title: 'Generic webhook → dev task',
    description: 'Generic inbound webhook that contains a prompt field; routes to a dev task run.',
    tags: ['dev', 'webhook', 'preset'],
    kind: 'webhook',
    auth: 'webhook_signature',
    runMode: 'delegation',
    defaultPermission: { profileId: 'full_sandbox', reason: 'delegated dev tasks often need edits + tests' },
    defaultTaskKind: 'free-form',
    promptFromPayload: fromGenericWebhook,
  }),
]

export type DevTriggerPresetMapInput = {
  readonly presetId: string
  readonly payload: unknown
}

export type DevTriggerPresetMapResult =
  | { readonly ok: true; readonly prompt: string; readonly taskKind: CodingTaskKind; readonly permissionProfileId: CodingPermissionProfileId }
  | { readonly ok: false; readonly error: string }

/** Map an inbound payload to a normalized prompt + defaults (pure; no validation against any provider). */
export const mapDevTriggerPresetToTaskInput = (input: DevTriggerPresetMapInput): DevTriggerPresetMapResult => {
  const preset = DEV_TRIGGER_PRESETS.find((p) => p.id === input.presetId)
  if (!preset) return { ok: false, error: `unknown preset: ${input.presetId}` }
  const prompt = preset.promptFromPayload(input.payload)
  if (!prompt) return { ok: false, error: `preset ${preset.id} did not yield a prompt from payload` }
  return {
    ok: true,
    prompt,
    taskKind: preset.defaultTaskKind,
    permissionProfileId: preset.defaultPermission.profileId,
  }
}

export const listDevTriggerPresets = (): readonly DevTriggerPreset[] => DEV_TRIGGER_PRESETS

export const getDevTriggerPreset = (id: string): DevTriggerPreset | undefined =>
  DEV_TRIGGER_PRESETS.find((p) => p.id === id)

