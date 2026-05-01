import { z } from 'zod'
import { Slug, TagList, VaultSecretRef } from './_primitives.js'

const SecretOrPlain = z.union([VaultSecretRef, z.string().min(1).max(2048)])

const Common = {
  id: Slug,
  name: z.string().min(1).max(128),
  enabled: z.boolean().default(true),
  flow: Slug,
  tags: TagList.default([]),
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
