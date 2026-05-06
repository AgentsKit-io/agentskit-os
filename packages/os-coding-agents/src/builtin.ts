import type { CodingAgentProvider } from '@agentskit/os-core'
import { createAiderProvider } from './aider.js'
import { createClaudeCodeProvider } from './claude-code.js'
import { createCodexProvider } from './codex.js'
import { createContinueProvider } from './continue.js'
import { createCursorProvider } from './cursor.js'
import { createGeminiProvider } from './gemini.js'
import { createOpenCodeProvider } from './opencode.js'
import { loadSecretsEnvFromFile } from './secrets-env-file.js'
import { createSubprocessRunner } from './subprocess.js'

export const BUILTIN_CODING_AGENT_IDS = [
  'codex',
  'claude-code',
  'cursor',
  'gemini',
  'aider',
  'opencode',
  'continue',
] as const

export type BuiltinCodingAgentId = (typeof BUILTIN_CODING_AGENT_IDS)[number]

export const isBuiltinCodingAgentId = (id: string): id is BuiltinCodingAgentId =>
  (BUILTIN_CODING_AGENT_IDS as readonly string[]).includes(id)

/** Optional vault file + extra env merged into every built-in provider subprocess (#375). */
export type BuiltinCodingAgentVaultOpts = {
  readonly secretsFile?: string
  readonly env?: Readonly<Record<string, string>>
}

const runnerForBuiltin = (vault?: BuiltinCodingAgentVaultOpts) => {
  const file = vault?.secretsFile?.trim()
  const extra = vault?.env
  if ((file !== undefined && file.length > 0) || (extra !== undefined && Object.keys(extra).length > 0)) {
    const fromFile = file !== undefined && file.length > 0 ? loadSecretsEnvFromFile(file) : {}
    const merged = { ...fromFile, ...extra }
    return createSubprocessRunner({ env: merged })
  }
  return createSubprocessRunner()
}

export const createBuiltinCodingAgentProvider = (
  id: BuiltinCodingAgentId,
  vault?: BuiltinCodingAgentVaultOpts,
): CodingAgentProvider => {
  const runner = runnerForBuiltin(vault)
  switch (id) {
    case 'codex':
      return createCodexProvider({ runner })
    case 'claude-code':
      return createClaudeCodeProvider({ runner })
    case 'cursor':
      return createCursorProvider({ runner })
    case 'gemini':
      return createGeminiProvider({ runner })
    case 'aider':
      return createAiderProvider({ runner })
    case 'opencode':
      return createOpenCodeProvider({ runner })
    case 'continue':
      return createContinueProvider({ runner })
    default: {
      const _x: never = id
      throw new Error(`unknown builtin coding agent: ${String(_x)}`)
    }
  }
}
