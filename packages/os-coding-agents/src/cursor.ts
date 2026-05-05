import type {
  CodingAgentProvider,
  CodingAgentProviderInfo,
  CodingTaskRequest,
  CodingTaskResult,
} from '@agentskit/os-core'
import { createSubprocessRunner, type SubprocessRunner } from './subprocess.js'
import { runSubprocessJsonTask } from './subprocess-json-task.js'

export type CursorProviderOptions = {
  /** Override binary name (default: `cursor-agent`). */
  readonly command?: string
  readonly runner?: SubprocessRunner
  readonly extraArgs?: readonly string[]
  readonly infoOverrides?: Partial<CodingAgentProviderInfo>
}

const baseInfo = (overrides: CursorProviderOptions | undefined): CodingAgentProviderInfo => ({
  id: 'cursor',
  displayName: 'Cursor Agent CLI',
  capabilities: ['edit_files', 'run_shell', 'git_ops'],
  invocation: 'subprocess',
  docsUrl: 'https://cursor.com/docs',
  requiredKeys: [],
  ...overrides?.infoOverrides,
})

/** Headless Cursor agent subprocess (binary name configurable). */
export const createCursorProvider = (opts?: CursorProviderOptions): CodingAgentProvider => {
  const runner = opts?.runner ?? createSubprocessRunner()
  const command = opts?.command ?? 'cursor-agent'

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
        providerName: 'cursor',
        providerId: 'cursor',
        notFoundErrorCode: 'cursor.not_found',
        notFoundSummary: `cursor agent CLI not found (looked up: ${command})`,
        badJsonErrorCode: 'cursor.bad_json',
      })
    },
  }
}
