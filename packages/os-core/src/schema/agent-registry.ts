import { z } from 'zod'
import { Capability } from '../auth/capability.js'
import { Slug, TagList } from './_primitives.js'

export const AgentLifecycleState = z.enum([
  'draft',
  'review',
  'approved',
  'staged',
  'production',
  'deprecated',
  'retired',
])
export type AgentLifecycleState = z.infer<typeof AgentLifecycleState>

export const AgentRiskTier = z.enum(['low', 'medium', 'high', 'critical'])
export type AgentRiskTier = z.infer<typeof AgentRiskTier>

export const AgentEnvironment = z.enum(['local', 'staging', 'production'])
export type AgentEnvironment = z.infer<typeof AgentEnvironment>

export const SupportContact = z.object({
  name: z.string().min(1).max(128).optional(),
  email: z.string().email().max(256).optional(),
  slack: z.string().min(1).max(128).optional(),
  url: z.string().url().max(2048).optional(),
})
export type SupportContact = z.infer<typeof SupportContact>

export const SloRef = z.object({
  name: z.string().min(1).max(128),
  url: z.string().url().max(2048).optional(),
})
export type SloRef = z.infer<typeof SloRef>

export const SlaRef = z.object({
  name: z.string().min(1).max(128),
  url: z.string().url().max(2048).optional(),
})
export type SlaRef = z.infer<typeof SlaRef>

export const AgentDependency = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('tool'), ref: z.string().min(1).max(128) }),
  z.object({ kind: z.literal('skill'), ref: z.string().min(1).max(128) }),
  z.object({ kind: z.literal('model'), provider: z.string().min(1).max(64), model: z.string().min(1).max(128) }),
  z.object({ kind: z.literal('rag'), ref: Slug }),
  z.object({ kind: z.literal('plugin'), ref: Slug }),
])
export type AgentDependency = z.infer<typeof AgentDependency>

export const AuditMetadata = z.object({
  createdAt: z.string().datetime().optional(),
  createdBy: z.string().min(1).max(256).optional(),
  lastReviewedAt: z.string().datetime().optional(),
  lastReviewedBy: z.string().min(1).max(256).optional(),
  notes: z.string().max(2048).optional(),
})
export type AuditMetadata = z.infer<typeof AuditMetadata>

export const AgentRegistryEntry = z.object({
  agentId: Slug,
  owner: z.string().min(1).max(256),
  purpose: z.string().min(1).max(1024),
  lifecycleState: AgentLifecycleState.default('draft'),
  riskTier: AgentRiskTier.default('low'),
  capabilities: z.array(Capability).max(256).default([]),
  dependencies: z.array(AgentDependency).max(256).default([]),
  environments: z.array(AgentEnvironment).max(8).default(['local']),
  productionStatus: z.enum(['none', 'candidate', 'live', 'paused']).default('none'),
  support: SupportContact.optional(),
  slo: z.array(SloRef).max(32).default([]),
  sla: z.array(SlaRef).max(32).default([]),
  tags: TagList.default([]),
  audit: AuditMetadata.optional(),
})
export type AgentRegistryEntry = z.infer<typeof AgentRegistryEntry>

export const parseAgentRegistryEntry = (input: unknown): AgentRegistryEntry =>
  AgentRegistryEntry.parse(input)

export const safeParseAgentRegistryEntry = (input: unknown) =>
  AgentRegistryEntry.safeParse(input)

