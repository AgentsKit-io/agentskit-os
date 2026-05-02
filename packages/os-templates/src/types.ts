import type { AgentConfig, FlowConfig } from '@agentskit/os-core'

export type TemplateCategory =
  | 'coding'
  | 'marketing'
  | 'support'
  | 'research'
  | 'clinical'
  | 'finance'
  | 'general'

export type Template = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly category: TemplateCategory
  readonly tags: readonly string[]
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced'
  readonly version: string
  readonly agents: readonly AgentConfig[]
  readonly flows: readonly FlowConfig[]
}
