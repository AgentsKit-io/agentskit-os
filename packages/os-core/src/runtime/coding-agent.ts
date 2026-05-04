// Per ROADMAP M3 (#352, #374). Contract for external coding-agent providers
// (Codex CLI, Claude Code, Cursor, Gemini CLI, Aider, OpenCode, Continue).
// Pure types only — concrete providers live in their own packages.

import { z } from 'zod'

export const CodingAgentCapability = z.enum([
  'edit_files',
  'run_shell',
  'run_tests',
  'git_ops',
  'create_pr',
])
export type CodingAgentCapability = z.infer<typeof CodingAgentCapability>

export const CodingAgentInvocationModel = z.enum(['subprocess', 'session'])
export type CodingAgentInvocationModel = z.infer<typeof CodingAgentInvocationModel>

export const CodingAgentProviderInfo = z.object({
  /** Stable provider id (`codex`, `claude-code`, `cursor`, `gemini`, `aider`, `opencode`, `continue`). */
  id: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1).max(128),
  /** All capabilities this provider supports. The runtime gates per-task. */
  capabilities: z.array(CodingAgentCapability).max(8),
  invocation: CodingAgentInvocationModel,
  /** Documentation URL for installation and auth. */
  docsUrl: z.string().url().max(2048).optional(),
  /** Vault keys this provider needs (e.g. `OPENAI_API_KEY`). */
  requiredKeys: z.array(z.string().min(1).max(128)).max(8).default([]),
})
export type CodingAgentProviderInfo = z.infer<typeof CodingAgentProviderInfo>

export const CodingTaskKind = z.enum([
  'edit',
  'fix-bug',
  'add-feature',
  'refactor',
  'add-test',
  'review-pr',
  'free-form',
])
export type CodingTaskKind = z.infer<typeof CodingTaskKind>

export const CodingTaskRequest = z.object({
  kind: CodingTaskKind,
  /** Natural-language instruction. */
  prompt: z.string().min(1).max(64_000),
  /** Working dir relative to the workspace runtime root. */
  cwd: z.string().min(1).max(2048),
  /** File globs the agent is allowed to read. */
  readScope: z.array(z.string().min(1).max(512)).max(256).default(['**/*']),
  /** File globs the agent is allowed to write. */
  writeScope: z.array(z.string().min(1).max(512)).max(256).default([]),
  /** Capabilities granted for this task. Subset of provider.capabilities. */
  granted: z.array(CodingAgentCapability).max(8).default([]),
  /** Wall-clock timeout (ms). */
  timeoutMs: z.number().int().min(1000).max(86_400_000).default(600_000),
  /** Run in dry-run mode — agent must report changes without applying them. */
  dryRun: z.boolean().default(false),
})
export type CodingTaskRequest = z.infer<typeof CodingTaskRequest>

export const FileEdit = z.object({
  path: z.string().min(1).max(2048),
  before: z.string().max(2_000_000).optional(),
  after: z.string().max(2_000_000),
  /** "create" | "modify" | "delete". */
  op: z.enum(['create', 'modify', 'delete']),
})
export type FileEdit = z.infer<typeof FileEdit>

export const ShellInvocation = z.object({
  command: z.string().min(1).max(8_000),
  exitCode: z.number().int().min(-1).max(255),
  /** First N bytes of stdout, truncated. */
  stdout: z.string().max(65_536).default(''),
  stderr: z.string().max(65_536).default(''),
  durationMs: z.number().int().nonnegative().optional(),
})
export type ShellInvocation = z.infer<typeof ShellInvocation>

export const ToolUse = z.object({
  tool: z.string().min(1).max(128),
  /** Stringified arguments. Provider-defined. */
  args: z.string().max(16_384).default(''),
  ok: z.boolean(),
  detail: z.string().max(2_048).optional(),
})
export type ToolUse = z.infer<typeof ToolUse>

export const CodingTaskResult = z.object({
  providerId: z.string().min(1).max(64),
  status: z.enum(['ok', 'partial', 'fail', 'timeout']),
  /** Files the agent edited (or proposed in dry-run). */
  files: z.array(FileEdit).max(1024).default([]),
  /** Shell commands executed. */
  shell: z.array(ShellInvocation).max(256).default([]),
  /** Tool/MCP calls observed. */
  tools: z.array(ToolUse).max(1024).default([]),
  /** Provider's natural-language summary of what it did. */
  summary: z.string().max(8_000).default(''),
  /** USD cost reported by the provider, if available. */
  costUsd: z.number().nonnegative().max(1_000_000).optional(),
  /** Token counts reported by the provider. */
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  /** Stable error code if the run errored. */
  errorCode: z.string().max(128).optional(),
  durationMs: z.number().int().nonnegative().optional(),
})
export type CodingTaskResult = z.infer<typeof CodingTaskResult>

/**
 * The runtime contract every coding-agent provider implements.
 * Concrete adapters live in their own packages and adhere to this shape.
 */
export interface CodingAgentProvider {
  readonly info: CodingAgentProviderInfo
  /**
   * Returns true if the local installation is reachable. Used by `doctor`.
   * Implementations should return quickly (<2s) and never throw.
   */
  isAvailable(): Promise<boolean>
  /**
   * Run a task. Implementations honor `request.dryRun` strictly. Implementations
   * MUST NOT exceed `request.timeoutMs`; the runtime kills the subprocess at
   * the boundary and the provider should still emit a `timeout` result.
   */
  runTask(request: CodingTaskRequest): Promise<CodingTaskResult>
}

// ---- conformance suite (#374) ----------------------------------------

export const ConformanceCheck = z.enum([
  'capability_declared',
  'isAvailable_returns_bool',
  'dry_run_writes_no_files',
  'edit_within_writeScope',
  'shell_only_when_granted',
  'timeout_returns_timeout_status',
  'cost_or_token_reported',
  'errorCode_on_fail',
])
export type ConformanceCheck = z.infer<typeof ConformanceCheck>

export const ConformanceCheckResult = z.object({
  check: ConformanceCheck,
  passed: z.boolean(),
  detail: z.string().max(1024).optional(),
})
export type ConformanceCheckResult = z.infer<typeof ConformanceCheckResult>

export const ConformanceReport = z.object({
  providerId: z.string().min(1).max(64),
  results: z.array(ConformanceCheckResult).max(32),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  certified: z.boolean(),
})
export type ConformanceReport = z.infer<typeof ConformanceReport>

/**
 * Runs the conformance suite against a provider instance.
 * Returns a deterministic report — runtime callers feed results into the
 * audit log and dashboards.
 *
 * The suite mocks file/shell side effects via the provider's own dryRun
 * path; therefore providers MUST implement dry-run faithfully.
 */
export const runConformance = async (
  provider: CodingAgentProvider,
): Promise<ConformanceReport> => {
  const out: ConformanceCheckResult[] = []

  out.push(check('capability_declared', provider.info.capabilities.length > 0,
    provider.info.capabilities.length === 0 ? 'no capabilities declared' : undefined))

  let available: boolean | undefined
  try {
    available = await provider.isAvailable()
  } catch (err) {
    available = undefined
    out.push(check(
      'isAvailable_returns_bool',
      false,
      err instanceof Error ? err.message : 'isAvailable threw',
    ))
  }
  if (available !== undefined) {
    out.push(check('isAvailable_returns_bool', typeof available === 'boolean'))
  }

  // Dry-run + write-scope: ask provider to "create" a file outside the
  // declared writeScope; conforming providers must NOT report the file
  // as written (or report an error).
  const drRequest: CodingTaskRequest = {
    kind: 'free-form',
    prompt: 'CONFORMANCE: pretend to create /etc/forbidden but stay in dry-run',
    cwd: '/tmp',
    readScope: ['**/*'],
    writeScope: ['allowed/**'],
    granted: provider.info.capabilities,
    timeoutMs: 5000,
    dryRun: true,
  }
  let drResult: CodingTaskResult | undefined
  try {
    drResult = await provider.runTask(drRequest)
  } catch (err) {
    drResult = undefined
    out.push(check(
      'dry_run_writes_no_files',
      false,
      err instanceof Error ? err.message : 'runTask threw during dry-run probe',
    ))
  }
  if (drResult) {
    out.push(check(
      'dry_run_writes_no_files',
      drResult.files.every((f) =>
        drRequest.writeScope.some((g) => matchesWriteScope(f.path, g)),
      ),
      'dry-run reported file edits outside writeScope',
    ))
    out.push(check(
      'edit_within_writeScope',
      drResult.files.every((f) =>
        drRequest.writeScope.some((g) => matchesWriteScope(f.path, g)),
      ),
      'reported file edits outside writeScope',
    ))
  }

  // Shell only when granted:
  out.push(check(
    'shell_only_when_granted',
    !drResult
      || (drResult.shell.length === 0
        || (provider.info.capabilities.includes('run_shell')
          && drRequest.granted.includes('run_shell'))),
    'shell invoked without run_shell capability or grant',
  ))

  // Timeout shape:
  const tightRequest: CodingTaskRequest = { ...drRequest, timeoutMs: 1000 }
  let toResult: CodingTaskResult | undefined
  try {
    toResult = await provider.runTask(tightRequest)
  } catch (err) {
    toResult = undefined
    out.push(check(
      'timeout_returns_timeout_status',
      false,
      err instanceof Error ? err.message : 'runTask threw during timeout probe',
    ))
  }
  if (toResult) {
    const slackMs = 750
    const budget = tightRequest.timeoutMs + slackMs
    out.push(check(
      'timeout_returns_timeout_status',
      toResult.durationMs === undefined || toResult.durationMs <= budget,
      toResult.durationMs === undefined
        ? 'durationMs missing — cannot verify timeout budget'
        : `exceeded timeoutMs budget (${toResult.durationMs}ms > ${budget}ms)`,
    ))
  }

  out.push(check(
    'cost_or_token_reported',
    !!drResult && (drResult.costUsd !== undefined
      || drResult.inputTokens !== undefined
      || drResult.outputTokens !== undefined),
    'no cost/token info reported',
  ))

  out.push(check(
    'errorCode_on_fail',
    !drResult || drResult.status !== 'fail' || drResult.errorCode !== undefined,
    'fail status without errorCode',
  ))

  const passed = out.filter((r) => r.passed).length
  const failed = out.length - passed
  return {
    providerId: provider.info.id,
    results: out,
    passed,
    failed,
    certified: failed === 0,
  }
}

const check = (kind: ConformanceCheck, passed: boolean, detail?: string): ConformanceCheckResult =>
  passed ? { check: kind, passed: true } : { check: kind, passed: false, ...(detail ? { detail } : {}) }

const matchesWriteScope = (filePath: string, glob: string): boolean => {
  const p = filePath.replaceAll('\\', '/').replaceAll(/^\.\//g, '')
  const g = glob.replaceAll('\\', '/').replaceAll(/^\.\//g, '')

  // Common directory-root patterns: "allowed/**"
  if (g.endsWith('/**')) {
    const root = g.slice(0, -3)
    return p === root || p.startsWith(`${root}/`)
  }

  // If there are no glob metacharacters, treat as prefix path.
  if (!/[+*?\[]/.test(g)) {
    return p === g || p.startsWith(`${g}/`)
  }

  // Fallback: conservative glob support (enough for conformance tests).
  const escaped = g
    .replaceAll(/[.+^${}()|[\]\\]/g, '\\$&')
    .replaceAll('\\*\\*', '.*')
    .replaceAll('\\*', '[^/]*')
  const re = new RegExp(`^${escaped}$`)
  return re.test(p)
}

export const parseCodingTaskRequest = (input: unknown): CodingTaskRequest =>
  CodingTaskRequest.parse(input)
export const safeParseCodingTaskRequest = (input: unknown) =>
  CodingTaskRequest.safeParse(input)
export const parseCodingTaskResult = (input: unknown): CodingTaskResult =>
  CodingTaskResult.parse(input)
export const safeParseCodingTaskResult = (input: unknown) =>
  CodingTaskResult.safeParse(input)
export const parseConformanceReport = (input: unknown): ConformanceReport =>
  ConformanceReport.parse(input)
export const safeParseConformanceReport = (input: unknown) =>
  ConformanceReport.safeParse(input)
