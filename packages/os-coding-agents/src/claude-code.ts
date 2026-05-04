import type {
  CodingAgentProvider,
  CodingAgentProviderInfo,
  CodingTaskRequest,
  CodingTaskResult,
} from '@agentskit/os-core'
import { parseAgentJsonResult } from './json-result.js'
import { createSubprocessRunner, type SubprocessRunner } from './subprocess.js'

export type CliCodingAgentProviderOptions = {
  /** Override binary name (default: `claude`). */
  readonly command?: string
  /** Inject runner for tests. */
  readonly runner?: SubprocessRunner
  /** Extra CLI args inserted before the prompt. */
  readonly extraArgs?: readonly string[]
  readonly infoOverrides?: Partial<CodingAgentProviderInfo>
}

const baseInfo = (overrides: CliCodingAgentProviderOptions | undefined): CodingAgentProviderInfo => ({
  id: 'claude-code',
  displayName: 'Claude Code CLI',
  capabilities: ['edit_files', 'run_shell', 'git_ops'],
  invocation: 'subprocess',
  docsUrl: 'https://docs.anthropic.com/claude/docs/claude-code',
  requiredKeys: [],
  ...overrides?.infoOverrides,
})

export const createClaudeCodeProvider = (opts?: CliCodingAgentProviderOptions): CodingAgentProvider => {
  const runner = opts?.runner ?? createSubprocessRunner()
  const command = opts?.command ?? 'claude'

  return {
    info: baseInfo(opts),
    isAvailable: async () => {
      const path = await runner.which(command)
      if (!path) return false
      const r = await runner.run({ command: path, args: ['--version'], cwd: process.cwd(), timeoutMs: 1500 })
      return r.exitCode === 0
    },
    runTask: async (req: CodingTaskRequest): Promise<CodingTaskResult> => {
      const started = Date.now()
      const path = await runner.which(command)
      if (!path) {
        return {
          providerId: 'claude-code',
          status: 'fail',
          files: [],
          shell: [],
          tools: [],
          summary: `claude CLI not found (looked up: ${command})`,
          errorCode: 'claude.not_found',
          durationMs: Date.now() - started,
        }
      }

      const prompt = [
        'Return ONLY a single JSON object (no markdown fences) with keys:',
        '{ status: "ok"|"partial"|"fail"|"timeout", summary: string,',
        'files?: Array<{path:string, op:"create"|"modify"|"delete", before?:string, after:string}>,',
        'shell?: Array<{command:string, exitCode:number, stdout?:string, stderr?:string, durationMs?:number}>,',
        'tools?: Array<{tool:string, args?:string, ok:boolean, detail?:string}>,',
        'costUsd?: number, inputTokens?: number, outputTokens?: number, errorCode?: string, durationMs?: number }.',
        '',
        `Task kind: ${req.kind}`,
        `cwd: ${req.cwd}`,
        `dryRun: ${req.dryRun}`,
        `readScope: ${JSON.stringify(req.readScope)}`,
        `writeScope: ${JSON.stringify(req.writeScope)}`,
        `granted: ${JSON.stringify(req.granted)}`,
        '',
        'User instruction:',
        req.prompt,
      ].join('\n')

      const args = ['-p', prompt, '--output-format', 'json', ...(opts?.extraArgs ?? [])]

      const r = await runner.run({
        command: path,
        args,
        cwd: req.cwd,
        timeoutMs: req.timeoutMs,
      })

      const parsed = parseAgentJsonResult(r.stdout, 'claude-code')
      if (parsed) {
        return {
          ...parsed,
          durationMs: parsed.durationMs ?? Date.now() - started,
          costUsd: parsed.costUsd ?? 0,
          inputTokens: parsed.inputTokens ?? 0,
          outputTokens: parsed.outputTokens ?? 0,
        }
      }

      const ok = r.exitCode === 0
      return {
        providerId: 'claude-code',
        status: ok ? 'ok' : 'fail',
        files: [],
        shell: [],
        tools: [],
        summary: `non-json response (exit=${r.exitCode})`,
        errorCode: ok ? undefined : 'claude.bad_json',
        durationMs: Date.now() - started,
        costUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
      }
    },
  }
}
