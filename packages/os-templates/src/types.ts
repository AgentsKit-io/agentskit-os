import { z } from 'zod'
import type { AgentConfig, FlowConfig } from '@agentskit/os-core'

export type TemplateCategory =
  | 'coding'
  | 'marketing'
  | 'support'
  | 'clinical'
  | 'general'
  | 'customer-support'
  | 'research'
  | 'marketing-content'
  | 'healthcare'
  | 'operations-sre'
  | 'finance'
  | 'data-pipelines'
  | 'personal-productivity'
  | 'compare-vote'

export const TemplateMetadataSchema = z.object({
  id: z.string().min(1).max(96),
  name: z.string().min(1).max(128),
  intent: z.string().min(1).max(1024),
  category: z.enum([
    'coding',
    'customer-support',
    'research',
    'marketing-content',
    'healthcare',
    'operations-sre',
    'finance',
    'data-pipelines',
    'personal-productivity',
    'compare-vote',
  ]),
  tags: z.array(z.string().min(1).max(64)).min(1).max(16),
  estimatedCostUsd: z.number().nonnegative().max(10_000),
  estimatedTokens: z.number().int().nonnegative().max(100_000_000),
  primaryAgents: z.array(z.string().min(1).max(96)).min(1).max(16),
  primaryTools: z.array(z.string().min(1).max(128)).max(32),
  runModesSupported: z.array(z.enum(['dry_run', 'preview', 'real', 'replay', 'simulate', 'deterministic'])).min(1),
  triggerKind: z.enum(['cron', 'webhook', 'email', 'slack', 'github', 'linear', 'cdc']),
  stability: z.enum(['ready', 'stub']).default('ready'),
})
export type TemplateMetadata = z.infer<typeof TemplateMetadataSchema>

export type Template = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly category: TemplateCategory
  readonly tags: readonly string[]
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced'
  readonly version: string
  readonly metadata?: TemplateMetadata
  readonly agents: readonly AgentConfig[]
  readonly flows: readonly FlowConfig[]
}
