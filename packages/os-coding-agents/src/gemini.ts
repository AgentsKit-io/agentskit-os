import type {
  CodingAgentProvider,
  CodingAgentProviderInfo,
  CodingTaskRequest,
  CodingTaskResult,
} from '@agentskit/os-core'
import { createSubprocessRunner, type SubprocessRunner } from './subprocess.js'
import { runSubprocessJsonTask } from './subprocess-json-task.js'

export type GeminiProviderOptions = {
  /** Override binary name (default: `gemini`). */
  readonly command?: string
  readonly runner?: SubprocessRunner
  readonly extraArgs?: readonly string[]
  readonly infoOverrides?: Partial<CodingAgentProviderInfo>
}

const baseInfo = (overrides: GeminiProviderOptions | undefined): CodingAgentProviderInfo => ({
  id: 'gemini',
  displayName: 'Google Gemini CLI',
  capabilities: ['edit_files', 'run_shell', 'git_ops'],
  invocation: 'subprocess',
  docsUrl: 'https://ai.google.dev/gemini-api/docs',
  requiredKeys: [],
  ...overrides?.infoOverrides,
})

export const createGeminiProvider = (opts?: GeminiProviderOptions): CodingAgentProvider => {
  const runner = opts?.runner ?? createSubprocessRunner()
  const command = opts?.command ?? 'gemini'

  return {
    info: baseInfo(opts),
    isAvailable: async () => {
      const path = await runner.which(command)
      if (!path) return false
      const r = await runner.run({ command: path, args: ['--version'], cwd: process.cwd(), timeoutMs: 1500 })
      return r.exitCode === 0
    },
    runTask: async (req: CodingTaskRequest): Promise<CodingTaskResult> => {
      return runSubprocessJsonTask({
        runner,
        command,
        req,
        extraArgs: opts && opts.extraArgs !== undefined ? opts.extraArgs : undefined,
        providerName: 'gemini',
        providerId: 'gemini',
        notFoundErrorCode: 'gemini.not_found',
        notFoundSummary: `gemini CLI not found (looked up: ${command})`,
        badJsonErrorCode: 'gemini.bad_json',
      })
    },
  }
}
