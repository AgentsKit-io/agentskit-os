export { createSubprocessRunner, defaultRun, defaultWhich } from './subprocess.js'
export type { ExecResult, RunFn, SubprocessRunner, WhichFn } from './subprocess.js'

export { parseAgentJsonResult } from './json-result.js'

export { createCodexProvider } from './codex.js'
export type { CliCodingAgentProviderOptions as CodexProviderOptions } from './codex.js'

export { createClaudeCodeProvider } from './claude-code.js'
export type { CliCodingAgentProviderOptions as ClaudeCodeProviderOptions } from './claude-code.js'

export { createCursorProvider } from './cursor.js'
export type { CursorProviderOptions } from './cursor.js'

export { createGeminiProvider } from './gemini.js'
export type { GeminiProviderOptions } from './gemini.js'

export { createAiderProvider } from './aider.js'
export type { AiderProviderOptions } from './aider.js'

export { createOpenCodeProvider } from './opencode.js'
export type { OpenCodeProviderOptions } from './opencode.js'

export { createContinueProvider } from './continue.js'
export type { ContinueProviderOptions } from './continue.js'

export {
  BUILTIN_CODING_AGENT_IDS,
  createBuiltinCodingAgentProvider,
  isBuiltinCodingAgentId,
} from './builtin.js'
export type { BuiltinCodingAgentId } from './builtin.js'

export { loadSecretsEnvFromFile, parseSecretsEnvFileLines } from './secrets-env-file.js'
