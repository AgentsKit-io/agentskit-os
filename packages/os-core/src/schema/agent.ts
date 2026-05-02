import { z } from 'zod'
import { Slug, TagList } from './_primitives.js'

export const ProviderRef = z.string().min(1).max(64)
export type ProviderRef = z.infer<typeof ProviderRef>

export const ToolRef = z.string().min(1).max(128)
export type ToolRef = z.infer<typeof ToolRef>

export const SkillRef = z.string().min(1).max(128)
export type SkillRef = z.infer<typeof SkillRef>

export const AgentModelConfig = z.object({
  provider: ProviderRef,
  model: z.string().min(1).max(128),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(1_000_000).optional(),
  topP: z.number().min(0).max(1).optional(),
})
export type AgentModelConfig = z.infer<typeof AgentModelConfig>

export const AgentMemoryRef = z.object({
  ref: z.string().min(1).max(128),
  maxMessages: z.number().int().positive().max(10_000).optional(),
})
export type AgentMemoryRef = z.infer<typeof AgentMemoryRef>

export const AgentConfig = z.object({
  id: Slug,
  name: z.string().min(1).max(128),
  description: z.string().max(1024).optional(),
  systemPrompt: z.string().max(32_768).optional(),
  model: AgentModelConfig,
  tools: z.array(ToolRef).max(128).default([]),
  skills: z.array(SkillRef).max(64).default([]),
  memory: AgentMemoryRef.optional(),
  ragRefs: z.array(Slug).max(16).default([]),
  tags: TagList.default([]),
})
export type AgentConfig = z.infer<typeof AgentConfig>

export const parseAgentConfig = (input: unknown): AgentConfig => AgentConfig.parse(input)
export const safeParseAgentConfig = (input: unknown) => AgentConfig.safeParse(input)
