import type { CodingTaskResult, FileEdit, ShellInvocation, ToolUse } from '@agentskit/os-core'

type UnknownRecord = Record<string, unknown>

const isRecord = (v: unknown): v is UnknownRecord => !!v && typeof v === 'object'

const asStr = (v: unknown): string | undefined => {
  if (typeof v === 'string') return v
  return undefined
}
const asNum = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  return undefined
}

const coalesceStr = (a: unknown, b: unknown): string | undefined => asStr(a) ?? asStr(b)

const coalesceNum = (a: unknown, b: unknown): number | undefined => asNum(a) ?? asNum(b)

const coalesceNum3 = (a: unknown, b: unknown, c: number): number => {
  const n1 = asNum(a)
  if (n1 !== undefined) return n1
  const n2 = asNum(b)
  if (n2 !== undefined) return n2
  return c
}

const coalesceStr3 = (a: unknown, b: unknown, c: string): string => {
  const s1 = asStr(a)
  if (s1 !== undefined) return s1
  const s2 = asStr(b)
  if (s2 !== undefined) return s2
  return c
}

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

  const statusRaw = coalesceStr(parsed.status, parsed.state)
  let status: CodingTaskResult['status'] | undefined
  if (statusRaw === 'timeout') status = 'timeout'
  else if (statusRaw === 'partial') status = 'partial'
  else if (statusRaw === 'fail' || statusRaw === 'error') status = 'fail'
  else if (statusRaw === 'ok' || statusRaw === 'success') status = 'ok'
  if (!status) return null

  const files: FileEdit[] = []
  const fileEdits = parsed.fileEdits !== undefined ? parsed.fileEdits : parsed.files
  if (Array.isArray(fileEdits)) {
    for (const fe of fileEdits) {
      if (!isRecord(fe)) continue
      const path = coalesceStr(fe.path, fe.file)
      const opRaw = coalesceStr3(fe.op, fe.operation, 'modify')
      let op: FileEdit['op'] = 'modify'
      if (opRaw === 'create' || opRaw === 'add') op = 'create'
      else if (opRaw === 'delete' || opRaw === 'remove') op = 'delete'
      const after = coalesceStr3(fe.after, fe.content, '')
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
      const command = coalesceStr(s.command, s.cmd)
      if (!command) continue
      shell.push({
        command,
        exitCode: coalesceNum3(s.exitCode, s.code, -1),
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
      const tool = coalesceStr(t.tool, t.name)
      if (!tool) continue
      tools.push({
        tool,
        args: coalesceStr3(t.args, undefined, ''),
        ok: !!t.ok,
        detail: coalesceStr(t.detail, t.error),
      })
    }
  }

  return {
    providerId,
    status,
    files,
    shell,
    tools,
    summary: coalesceStr3(parsed.summary, parsed.message, ''),
    costUsd: coalesceNum(parsed.costUsd, parsed.cost_usd),
    inputTokens: coalesceNum(parsed.inputTokens, parsed.input_tokens),
    outputTokens: coalesceNum(parsed.outputTokens, parsed.output_tokens),
    errorCode: coalesceStr(parsed.errorCode, parsed.error_code),
    durationMs: coalesceNum(parsed.durationMs, parsed.duration_ms),
  }
}
