import type { CodingAgentProvider } from '@agentskit/os-core'
import { createClaudeCodeProvider } from './claude-code.js'
import { createCodexProvider } from './codex.js'
import { createCursorProvider } from './cursor.js'
import { createGeminiProvider } from './gemini.js'

export const BUILTIN_CODING_AGENT_IDS = [
  'codex',
  'claude-code',
  'cursor',
  'gemini',
] as const

export type BuiltinCodingAgentId = (typeof BUILTIN_CODING_AGENT_IDS)[number]

export const isBuiltinCodingAgentId = (id: string): id is BuiltinCodingAgentId =>
  (BUILTIN_CODING_AGENT_IDS as readonly string[]).includes(id)

export const createBuiltinCodingAgentProvider = (id: BuiltinCodingAgentId): CodingAgentProvider => {
  switch (id) {
    case 'codex':
      return createCodexProvider()
    case 'claude-code':
      return createClaudeCodeProvider()
    case 'cursor':
      return createCursorProvider()
    case 'gemini':
      return createGeminiProvider()
    default: {
      const _x: never = id
      throw new Error(`unknown builtin coding agent: ${String(_x)}`)
    }
  }
}
