import type {
  CodingAgentProvider,
  CodingAgentProviderInfo,
  CodingTaskRequest,
  CodingTaskResult,
} from '@agentskit/os-core'
import { createSubprocessRunner, type SubprocessRunner } from './subprocess.js'
import { runSubprocessJsonTask } from './subprocess-json-task.js'

export type OpenCodeProviderOptions = {
  /** Override binary name (default: `opencode`). */
  readonly command?: string
  readonly runner?: SubprocessRunner
  readonly extraArgs?: readonly string[]
  readonly infoOverrides?: Partial<CodingAgentProviderInfo>
}

const baseInfo = (overrides: OpenCodeProviderOptions | undefined): CodingAgentProviderInfo => ({
  id: 'opencode',
  displayName: 'OpenCode',
  capabilities: ['edit_files', 'run_shell', 'git_ops'],
  invocation: 'subprocess',
  docsUrl: 'https://opencode.ai/docs',
  requiredKeys: [],
  ...overrides?.infoOverrides,
})

export const createOpenCodeProvider = (opts?: OpenCodeProviderOptions): CodingAgentProvider => {
  const runner = opts?.runner ?? createSubprocessRunner()
  const command = opts?.command ?? 'opencode'

  return {
    info: baseInfo(opts),
    isAvailable: async () => {
      const path = await runner.which(command)
      if (!path) return false
      const r = await runner.run({ command: path, args: ['--version'], cwd: process.cwd(), timeoutMs: 1500 })
      if (r.exitCode === 0) return true
      const h = await runner.run({ command: path, args: ['--help'], cwd: process.cwd(), timeoutMs: 1500 })
      return h.exitCode === 0
    },
    runTask: async (req: CodingTaskRequest): Promise<CodingTaskResult> => {
      return runSubprocessJsonTask({
        runner,
        command,
        req,
        extraArgs: opts && opts.extraArgs !== undefined ? opts.extraArgs : undefined,
        providerName: 'opencode',
        providerId: 'opencode',
        notFoundErrorCode: 'opencode.not_found',
        notFoundSummary: `opencode CLI not found (looked up: ${command})`,
        badJsonErrorCode: 'opencode.bad_json',
        buildArgs: ({ prompt, extraArgs }) => [
          'run',
          '-p',
          prompt,
          '--output-format',
          'json',
          ...extraArgs,
        ],
      })
    },
  }
}
