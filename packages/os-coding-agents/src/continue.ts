import type {
  CodingAgentProvider,
  CodingAgentProviderInfo,
  CodingTaskRequest,
  CodingTaskResult,
} from '@agentskit/os-core'
import { createSubprocessRunner, type SubprocessRunner } from './subprocess.js'
import { runSubprocessJsonTask } from './subprocess-json-task.js'

export type ContinueProviderOptions = {
  /** Override binary name (default: `cn`). */
  readonly command?: string
  readonly runner?: SubprocessRunner
  readonly extraArgs?: readonly string[]
  readonly infoOverrides?: Partial<CodingAgentProviderInfo>
}

const baseInfo = (overrides: ContinueProviderOptions | undefined): CodingAgentProviderInfo => ({
  id: 'continue',
  displayName: 'Continue CLI',
  capabilities: ['edit_files', 'run_shell', 'git_ops'],
  invocation: 'subprocess',
  docsUrl: 'https://docs.continue.dev/',
  requiredKeys: [],
  ...overrides?.infoOverrides,
})

/**
 * Continue exposes a headless CLI (`cn`) for non-interactive runs.
 * Capability detection: if the binary is missing, `runTask` returns a structured
 * `continue.not_found` failure rather than throwing.
 */
export const createContinueProvider = (opts?: ContinueProviderOptions): CodingAgentProvider => {
  const runner = opts?.runner ?? createSubprocessRunner()
  const command = opts?.command ?? 'cn'

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
        providerName: 'continue',
        providerId: 'continue',
        notFoundErrorCode: 'continue.not_found',
        notFoundSummary: `continue CLI not found (looked up: ${command})`,
        badJsonErrorCode: 'continue.bad_json',
        buildArgs: ({ prompt, extraArgs }) => [
          '-p',
          prompt,
          '--format',
          'json',
          ...extraArgs,
        ],
      })
    },
  }
}
