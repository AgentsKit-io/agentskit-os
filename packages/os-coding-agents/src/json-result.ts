import type { CodingTaskResult, FileEdit, ShellInvocation, ToolUse } from '@agentskit/os-core'

type UnknownRecord = Record<string, unknown>

const isRecord = (v: unknown): v is UnknownRecord => !!v && typeof v === 'object'

const asStr = (v: unknown): string | undefined => typeof v === 'string' ? v : undefined
const asNum = (v: unknown): number | undefined => typeof v === 'number' && Number.isFinite(v) ? v : undefined

export const parseAgentJsonResult = (raw: string, providerId: string): CodingTaskResult | null => {
  const trimmed = raw.trim()
  if (!trimmed) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed) as unknown
  } catch {
    return null
  }

  if (!isRecord(parsed)) return null

  const statusRaw = asStr(parsed.status) ?? asStr(parsed.state)
  let status: CodingTaskResult['status'] | undefined
  if (statusRaw === 'timeout') status = 'timeout'
  else if (statusRaw === 'partial') status = 'partial'
  else if (statusRaw === 'fail' || statusRaw === 'error') status = 'fail'
  else if (statusRaw === 'ok' || statusRaw === 'success') status = 'ok'
  if (!status) return null

  const files: FileEdit[] = []
  const fileEdits = parsed.fileEdits ?? parsed.files
  if (Array.isArray(fileEdits)) {
    for (const fe of fileEdits) {
      if (!isRecord(fe)) continue
      const path = asStr(fe.path) ?? asStr(fe.file)
      const opRaw = asStr(fe.op) ?? asStr(fe.operation) ?? 'modify'
      let op: FileEdit['op'] = 'modify'
      if (opRaw === 'create' || opRaw === 'add') op = 'create'
      else if (opRaw === 'delete' || opRaw === 'remove') op = 'delete'
      const after = asStr(fe.after) ?? asStr(fe.content) ?? ''
      const before = asStr(fe.before)
      if (!path) continue
      if (before === undefined) files.push({ path, op, after })
      else files.push({ path, op, before, after })
    }
  }

  const shell: ShellInvocation[] = []
  if (Array.isArray(parsed.shell)) {
    for (const s of parsed.shell) {
      if (!isRecord(s)) continue
      const command = asStr(s.command) ?? asStr(s.cmd)
      if (!command) continue
      shell.push({
        command,
        exitCode: asNum(s.exitCode) ?? asNum(s.code) ?? -1,
        stdout: asStr(s.stdout) ?? '',
        stderr: asStr(s.stderr) ?? '',
        durationMs: asNum(s.durationMs),
      })
    }
  }

  const tools: ToolUse[] = []
  if (Array.isArray(parsed.tools)) {
    for (const t of parsed.tools) {
      if (!isRecord(t)) continue
      const tool = asStr(t.tool) ?? asStr(t.name)
      if (!tool) continue
      tools.push({
        tool,
        args: asStr(t.args) ?? '',
        ok: !!t.ok,
        detail: asStr(t.detail) ?? asStr(t.error),
      })
    }
  }

  return {
    providerId,
    status,
    files,
    shell,
    tools,
    summary: asStr(parsed.summary) ?? asStr(parsed.message) ?? '',
    costUsd: asNum(parsed.costUsd) ?? asNum(parsed.cost_usd),
    inputTokens: asNum(parsed.inputTokens) ?? asNum(parsed.input_tokens),
    outputTokens: asNum(parsed.outputTokens) ?? asNum(parsed.output_tokens),
    errorCode: asStr(parsed.errorCode) ?? asStr(parsed.error_code),
    durationMs: asNum(parsed.durationMs) ?? asNum(parsed.duration_ms),
  }
}
