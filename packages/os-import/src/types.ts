// Importer contract — pure transformation, no I/O.

import type { AgentConfig, FlowConfig } from '@agentskit/os-core'

export type ImportWarning = {
  readonly code:
    | 'unknown_node_type'
    | 'unsupported_feature'
    | 'lossy_conversion'
    | 'missing_field'
    | 'name_collision'
  readonly path: readonly (string | number)[]
  readonly message: string
}

export type ImportResult = {
  readonly source: 'n8n' | 'langflow' | 'dify' | string
  readonly workspace: { id: string; name: string }
  readonly agents: readonly AgentConfig[]
  readonly flows: readonly FlowConfig[]
  readonly warnings: readonly ImportWarning[]
}

export interface Importer {
  readonly source: string
  readonly displayName: string
  detect(input: unknown): boolean
  parse(input: unknown): ImportResult
}

export type ImporterRegistry = ReadonlyArray<Importer>
