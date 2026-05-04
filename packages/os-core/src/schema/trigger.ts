import { z } from 'zod'
import { Slug, TagList, VaultSecretRef } from './_primitives.js'
import { WorkspaceLimits } from './workspace.js'

const SecretOrPlain = z.union([VaultSecretRef, z.string().min(1).max(2048)])

const Common = {
  id: Slug,
  name: z.string().min(1).max(128),
  enabled: z.boolean().default(true),
  flow: Slug,
  tags: TagList.default([]),
  /**
   * Per-trigger budget override. Any field set here takes precedence over the
   * workspace-level WorkspaceLimits. Unset fields inherit the workspace value.
   */
  limits: WorkspaceLimits.optional(),
}

export const CronTrigger = z.object({
  ...Common,
  kind: z.literal('cron'),
  cron: z.string().min(1).max(128),
  timezone: z.string().min(1).max(64).optional(),
})
export type CronTrigger = z.infer<typeof CronTrigger>

export const WebhookTrigger = z.object({
  ...Common,
  kind: z.literal('webhook'),
  path: z
    .string()
    .min(2)
    .max(256)
    .regex(/^\/[a-zA-Z0-9/_-]*$/, { message: 'must start with / and use alphanumeric/-/_/path-separators' }),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  secret: SecretOrPlain.optional(),
  /**
   * Optional request signing configuration for inbound webhooks (verify) and outbound webhooks (sign).
   * This stays intentionally minimal so providers can interop while we iterate on conventions.
   */
  signing: z
    .object({
      algorithm: z.enum(['hmac-sha256']).default('hmac-sha256'),
      /**
       * Signature header with format: `v1=<hex>` where hex is HMAC(secret, `${timestamp}.${body}`).
       */
      signatureHeader: z.string().min(1).max(128).default('x-agentskit-signature'),
      timestampHeader: z.string().min(1).max(128).default('x-agentskit-timestamp'),
      /**
       * If set, inbound verification can reject signatures older than this window.
       * 0 disables the freshness check.
       */
      toleranceSeconds: z.number().int().min(0).max(86_400).default(300),
    })
    .optional(),
})
export type WebhookTrigger = z.infer<typeof WebhookTrigger>

export const FileWatchTrigger = z.object({
  ...Common,
  kind: z.literal('file'),
  path: z.string().min(1).max(1024),
  events: z.array(z.enum(['add', 'change', 'unlink'])).min(1).default(['add', 'change']),
  glob: z.string().max(256).optional(),
})
export type FileWatchTrigger = z.infer<typeof FileWatchTrigger>

export const EmailTrigger = z.object({
  ...Common,
  kind: z.literal('email'),
  mailbox: z.string().min(1).max(256),
  filter: z.string().max(512).optional(),
})
export type EmailTrigger = z.infer<typeof EmailTrigger>

export const SlackTrigger = z.object({
  ...Common,
  kind: z.literal('slack'),
  channel: z.string().min(1).max(128),
  event: z.enum(['message', 'mention', 'reaction']).default('message'),
})
export type SlackTrigger = z.infer<typeof SlackTrigger>

export const GitHubTrigger = z.object({
  ...Common,
  kind: z.literal('github'),
  repo: z
    .string()
    .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, { message: 'must be owner/repo' }),
  event: z.enum(['pull_request', 'issues', 'push', 'release', 'workflow_run']),
  filter: z.string().max(512).optional(),
})
export type GitHubTrigger = z.infer<typeof GitHubTrigger>

export const LinearTrigger = z.object({
  ...Common,
  kind: z.literal('linear'),
  team: z.string().min(1).max(64),
  event: z.enum(['issue.create', 'issue.update', 'comment.create']).default('issue.create'),
})
export type LinearTrigger = z.infer<typeof LinearTrigger>

export const CdcTrigger = z.object({
  ...Common,
  kind: z.literal('cdc'),
  source: z.enum(['postgres', 'supabase', 'mysql']),
  connection: SecretOrPlain,
  table: z.string().min(1).max(128),
  operations: z.array(z.enum(['insert', 'update', 'delete'])).min(1).default(['insert']),
})
export type CdcTrigger = z.infer<typeof CdcTrigger>

export const TriggerConfig = z.discriminatedUnion('kind', [
  CronTrigger,
  WebhookTrigger,
  FileWatchTrigger,
  EmailTrigger,
  SlackTrigger,
  GitHubTrigger,
  LinearTrigger,
  CdcTrigger,
])
export type TriggerConfig = z.infer<typeof TriggerConfig>

export const parseTriggerConfig = (input: unknown): TriggerConfig => TriggerConfig.parse(input)
export const safeParseTriggerConfig = (input: unknown) => TriggerConfig.safeParse(input)

/**
 * Merge workspace-level limits with per-trigger limits.
 * Fields present on `trigger.limits` override the corresponding workspace field.
 * Fields absent on `trigger.limits` inherit from `workspace`.
 */
export const effectiveLimitsFor = ({
  workspace,
  trigger,
}: {
  workspace?: WorkspaceLimits
  trigger?: WorkspaceLimits
}): WorkspaceLimits => ({
  tokensPerRun: trigger?.tokensPerRun ?? workspace?.tokensPerRun,
  usdPerRun: trigger?.usdPerRun ?? workspace?.usdPerRun,
  tokensPerDay: trigger?.tokensPerDay ?? workspace?.tokensPerDay,
  usdPerDay: trigger?.usdPerDay ?? workspace?.usdPerDay,
  wallClockMsPerRun: trigger?.wallClockMsPerRun ?? workspace?.wallClockMsPerRun,
  maxConcurrentRuns: trigger?.maxConcurrentRuns ?? workspace?.maxConcurrentRuns,
  maxStepsPerRun: trigger?.maxStepsPerRun ?? workspace?.maxStepsPerRun,
})
