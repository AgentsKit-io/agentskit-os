import type {
  CodingAgentProvider,
  CodingAgentProviderInfo,
  CodingTaskRequest,
  CodingTaskResult,
} from '@agentskit/os-core'
import { createSubprocessRunner, type SubprocessRunner } from './subprocess.js'
import { runSubprocessJsonTask } from './subprocess-json-task.js'

export type AiderProviderOptions = {
  /** Override binary name (default: `aider`). */
  readonly command?: string
  readonly runner?: SubprocessRunner
  readonly extraArgs?: readonly string[]
  readonly infoOverrides?: Partial<CodingAgentProviderInfo>
}

const baseInfo = (overrides: AiderProviderOptions | undefined): CodingAgentProviderInfo => ({
  id: 'aider',
  displayName: 'Aider',
  capabilities: ['edit_files', 'run_shell', 'git_ops'],
  invocation: 'subprocess',
  docsUrl: 'https://aider.chat/docs/',
  requiredKeys: [],
  ...overrides?.infoOverrides,
})

export const createAiderProvider = (opts?: AiderProviderOptions): CodingAgentProvider => {
  const runner = opts?.runner ?? createSubprocessRunner()
  const command = opts?.command ?? 'aider'

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
        providerName: 'aider',
        providerId: 'aider',
        notFoundErrorCode: 'aider.not_found',
        notFoundSummary: `aider CLI not found (looked up: ${command})`,
        badJsonErrorCode: 'aider.bad_json',
        buildArgs: ({ prompt, extraArgs }) => [
          '--yes',
          '--no-pretty',
          '--no-stream',
          '--message',
          prompt,
          ...extraArgs,
        ],
      })
    },
  }
}
