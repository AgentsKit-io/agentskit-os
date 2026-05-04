import type {
  CodingAgentProvider,
  CodingAgentProviderInfo,
  CodingTaskRequest,
  CodingTaskResult,
} from '@agentskit/os-core'
import { parseAgentJsonResult } from './json-result.js'
import { createSubprocessRunner, type SubprocessRunner } from './subprocess.js'

export type CliCodingAgentProviderOptions = {
  /** Override binary name (default: `codex`). */
  readonly command?: string
  /** Inject runner for tests. */
  readonly runner?: SubprocessRunner
  /** Extra CLI args appended after built-ins. */
  readonly extraArgs?: readonly string[]
  readonly infoOverrides?: Partial<CodingAgentProviderInfo>
}

const baseInfo = (overrides: CliCodingAgentProviderOptions | undefined): CodingAgentProviderInfo => ({
  id: 'codex',
  displayName: 'OpenAI Codex CLI',
  capabilities: ['edit_files', 'run_shell', 'git_ops'],
  invocation: 'subprocess',
  docsUrl: 'https://developers.openai.com/codex',
  requiredKeys: [],
  ...overrides?.infoOverrides,
})

export const createCodexProvider = (opts?: CliCodingAgentProviderOptions): CodingAgentProvider => {
  const runner = opts?.runner ?? createSubprocessRunner()
  const command = opts?.command ?? 'codex'

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
          providerId: 'codex',
          status: 'fail',
          files: [],
          shell: [],
          tools: [],
          summary: `codex CLI not found (looked up: ${command})`,
          errorCode: 'codex.not_found',
          durationMs: Date.now() - started,
        }
      }

      const instruction = [
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

      const sub = 'exec'
      const args: string[] = [sub, '--json', ...(opts?.extraArgs ?? []), '-']

      const r = await runner.run({
        command: path,
        args,
        cwd: req.cwd,
        timeoutMs: req.timeoutMs,
        stdin: instruction,
      })

      const parsed = parseAgentJsonResult(r.stdout, 'codex')
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
        providerId: 'codex',
        status: ok ? 'ok' : 'fail',
        files: [],
        shell: [],
        tools: [],
        summary: `non-json response (exit=${r.exitCode})`,
        errorCode: ok ? undefined : 'codex.bad_json',
        durationMs: Date.now() - started,
        costUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
      }
    },
  }
}
