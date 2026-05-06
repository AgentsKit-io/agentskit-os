import type { CodingTaskRequest, CodingTaskResult } from '@agentskit/os-core'
import type { SubprocessRunner } from './subprocess.js'
import { parseAgentJsonResult } from './json-result.js'

export type SubprocessJsonProviderName = 'gemini' | 'cursor' | 'aider' | 'opencode' | 'continue'

export const buildSubprocessJsonPrompt = (req: CodingTaskRequest): string => {
  return [
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
}

export const runSubprocessJsonTask = async (
  args: {
    runner: SubprocessRunner
    command: string
    req: CodingTaskRequest
    extraArgs: readonly string[] | undefined
    providerName: SubprocessJsonProviderName
    providerId: CodingTaskResult['providerId']
    notFoundErrorCode: string
    notFoundSummary: string
    badJsonErrorCode: string
    /** Override CLI args builder. Default: `['-p', prompt, '--output-format', 'json', ...extraArgs]`. */
    readonly buildArgs?: (input: { readonly prompt: string; readonly extraArgs: readonly string[] }) => readonly string[]
    /** Send prompt on stdin instead of as an arg. */
    readonly stdinPrompt?: boolean
  },
): Promise<CodingTaskResult> => {
  const { runner, command, req, providerName, providerId, badJsonErrorCode } = args
  const started = Date.now()

  const path = await runner.which(command)
  if (!path) {
    return {
      providerId,
      status: 'fail',
      files: [],
      shell: [],
      tools: [],
      summary: args.notFoundSummary,
      errorCode: args.notFoundErrorCode,
      durationMs: Date.now() - started,
    }
  }

  const prompt = buildSubprocessJsonPrompt(req)
  const extraArgs = args.extraArgs !== undefined ? args.extraArgs : []
  const jsonArgs = args.buildArgs
    ? [...args.buildArgs({ prompt, extraArgs })]
    : args.stdinPrompt
      ? ['--output-format', 'json', ...extraArgs]
      : ['-p', prompt, '--output-format', 'json', ...extraArgs]

  const r = await runner.run(
    args.stdinPrompt
      ? { command: path, args: jsonArgs, cwd: req.cwd, timeoutMs: req.timeoutMs, stdin: prompt }
      : { command: path, args: jsonArgs, cwd: req.cwd, timeoutMs: req.timeoutMs },
  )

  const parsed = parseAgentJsonResult(r.stdout, providerName)
  if (parsed) {
    const durationMs = parsed.durationMs !== undefined ? parsed.durationMs : Date.now() - started
    const costUsd = parsed.costUsd !== undefined ? parsed.costUsd : 0
    const inputTokens = parsed.inputTokens !== undefined ? parsed.inputTokens : 0
    const outputTokens = parsed.outputTokens !== undefined ? parsed.outputTokens : 0
    return {
      ...parsed,
      durationMs,
      costUsd,
      inputTokens,
      outputTokens,
    }
  }

  const ok = r.exitCode === 0
  return {
    providerId,
    status: ok ? 'ok' : 'fail',
    files: [],
    shell: [],
    tools: [],
    summary: `non-json response (exit=${r.exitCode})`,
    errorCode: ok ? undefined : badJsonErrorCode,
    durationMs: Date.now() - started,
    costUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
  }
}

