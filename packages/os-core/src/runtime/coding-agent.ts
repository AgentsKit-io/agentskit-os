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
  /**
   * Optional cooperative cancellation (nothing in flight → fast no-op).
   * When present, the conformance suite verifies idempotent calls do not throw.
   */
  cancelTask?(): Promise<void>
}

/** Magic `CodingTaskRequest.prompt` fragments used by `runConformance` scenario probes (#374). */
export const CONFORMANCE_PROMPTS = {
  /** Provider should return `ok` with an empty `files` array. */
  expectNoDiff: 'CONFORMANCE:EXPECT_NO_DIFF',
  /** Provider should return `fail` with `errorCode` related to tests and a failing shell line. */
  expectFailingTests: 'CONFORMANCE:EXPECT_FAILING_TESTS',
  /** Provider should return `fail` with an `errorCode` containing `permission`. */
  expectPermissionDenied: 'CONFORMANCE:EXPECT_PERMISSION_DENIED',
  /** Provider should return `ok` with at least one `tools` entry (artifact collection). */
  expectArtifacts: 'CONFORMANCE:EXPECT_ARTIFACTS',
  /** Provider should return `timeout` status (simulated slow / bounded work). */
  expectTimeout: 'CONFORMANCE:EXPECT_TIMEOUT',
  /** Provider should complete quickly with `ok` (used for timeout budget probe). */
  expectFastOk: 'CONFORMANCE:EXPECT_FAST_OK',
} as const

// ---- conformance suite (#374) ----------------------------------------

export const ConformanceCheck = z.enum([
  'capability_declared',
  'isAvailable_returns_bool',
  'dry_run_writes_no_files',
  'edit_within_writeScope',
  'shell_only_when_granted',
  'fast_run_within_timeout_budget',
  'timeout_status_emitted_when_requested',
  'cost_or_token_reported',
  'errorCode_on_fail',
  'provider_id_matches',
  'structured_summary_present',
  'no_diff_ok_surfaces',
  'failing_tests_reported',
  'permission_denied_reported',
  'artifacts_collected',
  'cancel_task_idempotent',
])
export type ConformanceCheck = z.infer<typeof ConformanceCheck>

export const ConformanceCheckResult = z.object({
  check: ConformanceCheck,
  passed: z.boolean(),
  detail: z.string().max(1024).optional(),
})
export type ConformanceCheckResult = z.infer<typeof ConformanceCheckResult>

export const MarketplaceConformanceBadge = z.enum(['none', 'verified-basic'])
export type MarketplaceConformanceBadge = z.infer<typeof MarketplaceConformanceBadge>

export const ConformanceReport = z.object({
  providerId: z.string().min(1).max(64),
  results: z.array(ConformanceCheckResult).max(64),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  certified: z.boolean(),
  /** When `verified-basic`, marketplace UIs may show a conformance badge (policy still applies). */
  marketplaceBadge: MarketplaceConformanceBadge.default('none'),
})
export type ConformanceReport = z.infer<typeof ConformanceReport>

const matchesWriteScope = (filePath: string, glob: string): boolean => {
  const p = filePath.replaceAll('\\', '/').replaceAll(/^\.\//g, '')
  const g = glob.replaceAll('\\', '/').replaceAll(/^\.\//g, '')

  if (g.endsWith('/**')) {
    const root = g.slice(0, -3)
    return p === root || p.startsWith(`${root}/`)
  }

  if (!/[+*?\[]/.test(g)) {
    return p === g || p.startsWith(`${g}/`)
  }

  const escaped = g
    .replaceAll(/[.+^${}()|[\]\\]/g, '\\$&')
    .replaceAll('\\*\\*', '.*')
    .replaceAll('\\*', '[^/]*')
  const re = new RegExp(`^${escaped}$`)
  return re.test(p)
}

/**
 * Runs the conformance suite against a provider instance.
 * Returns a deterministic report — runtime callers feed results into the
 * audit log and dashboards.
 *
 * The suite mocks file/shell side effects via the provider's own dryRun
 * path; therefore providers MUST implement dry-run faithfully.
 *
 * Scenario probes use `CONFORMANCE_PROMPTS` substrings in `prompt`. Fakes and
 * test doubles should branch on them; real CLIs may not satisfy every probe
 * until adapters teach the model those contracts.
 */
export const runConformance = async (
  provider: CodingAgentProvider,
): Promise<ConformanceReport> => {
  const out: ConformanceCheckResult[] = []
  const pid = provider.info.id

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

  const baseProbe = (overrides: Partial<CodingTaskRequest>): CodingTaskRequest => ({
    kind: 'free-form',
    prompt: CONFORMANCE_PROMPTS.expectFastOk,
    cwd: '/tmp',
    readScope: ['**/*'],
    writeScope: ['allowed/**'],
    granted: provider.info.capabilities,
    timeoutMs: 5000,
    dryRun: true,
    ...overrides,
  })

  const drRequest = baseProbe({
    prompt: 'CONFORMANCE: pretend to create /etc/forbidden but stay in dry-run',
  })

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

  out.push(check(
    'shell_only_when_granted',
    !drResult
      || (drResult.shell.length === 0
        || (provider.info.capabilities.includes('run_shell')
          && drRequest.granted.includes('run_shell'))),
    'shell invoked without run_shell capability or grant',
  ))

  let fastRes: CodingTaskResult | undefined
  try {
    fastRes = await provider.runTask(baseProbe({
      prompt: CONFORMANCE_PROMPTS.expectFastOk,
      timeoutMs: 900,
    }))
  } catch (err) {
    fastRes = undefined
    out.push(check(
      'fast_run_within_timeout_budget',
      false,
      err instanceof Error ? err.message : 'runTask threw during fast timeout probe',
    ))
  }
  if (fastRes) {
    const slackMs = 400
    const budget = 900 + slackMs
    out.push(check(
      'fast_run_within_timeout_budget',
      fastRes.durationMs === undefined || fastRes.durationMs <= budget,
      fastRes.durationMs === undefined
        ? 'durationMs missing — cannot verify timeout budget'
        : `exceeded timeoutMs budget (${fastRes.durationMs}ms > ${budget}ms)`,
    ))
  }

  let timeoutRes: CodingTaskResult | undefined
  try {
    timeoutRes = await provider.runTask(baseProbe({
      prompt: CONFORMANCE_PROMPTS.expectTimeout,
      timeoutMs: 5000,
    }))
  } catch (err) {
    timeoutRes = undefined
    out.push(check(
      'timeout_status_emitted_when_requested',
      false,
      err instanceof Error ? err.message : 'runTask threw during timeout scenario',
    ))
  }
  if (timeoutRes) {
    out.push(check(
      'timeout_status_emitted_when_requested',
      timeoutRes.status === 'timeout',
      `expected status "timeout", got "${timeoutRes.status}"`,
    ))
  }

  out.push(check(
    'cost_or_token_reported',
    !drResult
      || drResult.costUsd !== undefined
      || drResult.inputTokens !== undefined
      || drResult.outputTokens !== undefined,
    'no cost/token info reported',
  ))

  out.push(check(
    'errorCode_on_fail',
    !drResult || drResult.status !== 'fail' || drResult.errorCode !== undefined,
    'fail status without errorCode',
  ))

  out.push(check(
    'provider_id_matches',
    !drResult || drResult.providerId === pid,
    `providerId mismatch (want ${pid}, got ${drResult?.providerId})`,
  ))

  out.push(check(
    'structured_summary_present',
    !drResult
      || drResult.status === 'fail'
      || drResult.status === 'timeout'
      || drResult.summary.trim().length > 0,
    'ok/partial result without summary text',
  ))

  const runScenario = async (prompt: string): Promise<CodingTaskResult | undefined> => {
    try {
      return await provider.runTask(baseProbe({ prompt, timeoutMs: 5000 }))
    } catch {
      return undefined
    }
  }

  const noDiff = await runScenario(CONFORMANCE_PROMPTS.expectNoDiff)
  out.push(check(
    'no_diff_ok_surfaces',
    !!noDiff && noDiff.status === 'ok' && noDiff.files.length === 0,
    'expected ok with zero file edits for no-diff scenario',
  ))

  const failTests = await runScenario(CONFORMANCE_PROMPTS.expectFailingTests)
  const testsFailed =
    !!failTests
    && (failTests.status === 'fail' || failTests.status === 'partial')
    && (
      (failTests.errorCode?.toLowerCase().includes('test') ?? false)
      || failTests.shell.some((s) => s.exitCode !== 0)
    )
  out.push(check(
    'failing_tests_reported',
    testsFailed,
    'expected fail/partial with test-related errorCode or failing shell exitCode',
  ))

  const perm = await runScenario(CONFORMANCE_PROMPTS.expectPermissionDenied)
  out.push(check(
    'permission_denied_reported',
    !!perm && perm.status === 'fail' && (perm.errorCode?.toLowerCase().includes('permission') ?? false),
    'expected fail with permission-related errorCode',
  ))

  const art = await runScenario(CONFORMANCE_PROMPTS.expectArtifacts)
  out.push(check(
    'artifacts_collected',
    !!art && art.tools.length > 0,
    'expected at least one tools[] entry for artifact collection scenario',
  ))

  if (typeof provider.cancelTask === 'function') {
    try {
      await provider.cancelTask()
      await provider.cancelTask()
      out.push(check('cancel_task_idempotent', true))
    } catch (err) {
      out.push(check(
        'cancel_task_idempotent',
        false,
        err instanceof Error ? err.message : 'cancelTask threw',
      ))
    }
  }

  const passed = out.filter((r) => r.passed).length
  const failed = out.length - passed
  const certified = failed === 0
  return {
    providerId: pid,
    results: out,
    passed,
    failed,
    certified,
    marketplaceBadge: certified ? 'verified-basic' : 'none',
  }
}

const check = (kind: ConformanceCheck, passed: boolean, detail?: string): ConformanceCheckResult => {
  if (passed) return { check: kind, passed: true }
  const out: ConformanceCheckResult = { check: kind, passed: false }
  if (detail) {
    ;(out as { detail?: string }).detail = detail
  }
  return out
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
