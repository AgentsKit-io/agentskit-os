import type {
  CodingAgentProvider,
  CodingAgentProviderInfo,
  CodingTaskRequest,
  CodingTaskResult,
} from '@agentskit/os-core'
import { parseAgentJsonResult } from './json-result.js'
import { createSubprocessRunner, type SubprocessRunner } from './subprocess.js'

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
      const started = Date.now()
      const path = await runner.which(command)
      if (!path) {
        return {
          providerId: 'cursor',
          status: 'fail',
          files: [],
          shell: [],
          tools: [],
          summary: `cursor agent CLI not found (looked up: ${command})`,
          errorCode: 'cursor.not_found',
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

      const parsed = parseAgentJsonResult(r.stdout, 'cursor')
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
        providerId: 'cursor',
        status: ok ? 'ok' : 'fail',
        files: [],
        shell: [],
        tools: [],
        summary: `non-json response (exit=${r.exitCode})`,
        errorCode: ok ? undefined : 'cursor.bad_json',
        durationMs: Date.now() - started,
        costUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
      }
    },
  }
}
