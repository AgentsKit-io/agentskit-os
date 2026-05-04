import { describe, expect, it } from 'vitest'
import {
  CONFORMANCE_PROMPTS,
  parseCodingTaskRequest,
  parseCodingTaskResult,
  parseConformanceReport,
  runConformance,
  safeParseConformanceReport,
  type CodingAgentProvider,
  type CodingTaskRequest,
  type CodingTaskResult,
} from '../../src/runtime/coding-agent.js'

const conformingProvider = (): CodingAgentProvider => ({
  info: {
    id: 'fake',
    displayName: 'Fake Provider',
    capabilities: ['edit_files', 'run_shell'],
    invocation: 'subprocess',
    requiredKeys: [],
  },
  isAvailable: async () => true,
  cancelTask: async () => undefined,
  runTask: async (req: CodingTaskRequest): Promise<CodingTaskResult> => {
    const base = (): CodingTaskResult => ({
      providerId: 'fake',
      status: 'ok',
      files: [],
      shell: [],
      tools: [],
      summary: 'conformance stub',
      durationMs: 2,
      costUsd: 0,
      inputTokens: 1,
      outputTokens: 1,
    })
    if (req.prompt.includes(CONFORMANCE_PROMPTS.expectNoDiff)) {
      return { ...base(), files: [], summary: 'no changes' }
    }
    if (req.prompt.includes(CONFORMANCE_PROMPTS.expectFailingTests)) {
      return {
        providerId: 'fake',
        status: 'fail',
        files: [],
        shell: [{ command: 'pnpm test', exitCode: 1, stdout: '', stderr: '1 failed' }],
        tools: [],
        summary: 'tests failed',
        errorCode: 'tests.failed',
        durationMs: 3,
        costUsd: 0,
        inputTokens: 1,
        outputTokens: 1,
      }
    }
    if (req.prompt.includes(CONFORMANCE_PROMPTS.expectPermissionDenied)) {
      return {
        providerId: 'fake',
        status: 'fail',
        files: [],
        shell: [],
        tools: [],
        summary: 'denied',
        errorCode: 'os.permission_denied',
        durationMs: 2,
        costUsd: 0,
        inputTokens: 1,
        outputTokens: 1,
      }
    }
    if (req.prompt.includes(CONFORMANCE_PROMPTS.expectArtifacts)) {
      return {
        ...base(),
        tools: [{ tool: 'artifacts.collect', args: '{}', ok: true }],
      }
    }
    if (req.prompt.includes(CONFORMANCE_PROMPTS.expectTimeout)) {
      return {
        providerId: 'fake',
        status: 'timeout',
        files: [],
        shell: [],
        tools: [],
        summary: 'timed out',
        durationMs: 800,
        costUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
      }
    }
    if (req.prompt.includes(CONFORMANCE_PROMPTS.expectFastOk)) {
      return { ...base(), durationMs: 50 }
    }
    if (req.dryRun) {
      return {
        ...base(),
        files: [{ path: 'allowed/x.ts', op: 'create', after: '// hi' }],
        shell: [],
      }
    }
    return base()
  },
})

const violatingProvider = (): CodingAgentProvider => ({
  info: {
    id: 'bad',
    displayName: 'Bad Provider',
    capabilities: [],
    invocation: 'subprocess',
    requiredKeys: [],
  },
  isAvailable: async () => true,
  runTask: async (): Promise<CodingTaskResult> => ({
    providerId: 'bad',
    status: 'ok',
    files: [{ path: '/etc/forbidden', op: 'create', after: 'oops' }],
    shell: [{ command: 'rm -rf /', exitCode: 0, stdout: '', stderr: '' }],
    tools: [],
    summary: '',
    costUsd: 0,
    inputTokens: 1,
    outputTokens: 1,
  }),
})

describe('coding-agent schemas', () => {
  it('parses minimal request', () => {
    const r = parseCodingTaskRequest({
      kind: 'edit',
      prompt: 'fix bug',
      cwd: '/tmp',
      readScope: ['**/*'],
      writeScope: ['src/**'],
      granted: ['edit_files'],
      timeoutMs: 60_000,
      dryRun: false,
    })
    expect(r.kind).toBe('edit')
  })

  it('parses minimal result', () => {
    const r = parseCodingTaskResult({
      providerId: 'p',
      status: 'ok',
      files: [],
      shell: [],
      tools: [],
      summary: '',
    })
    expect(r.status).toBe('ok')
  })

  it('safeParseConformanceReport defaults marketplaceBadge', () => {
    const r = safeParseConformanceReport({
      providerId: 'p',
      results: [],
      passed: 0,
      failed: 0,
      certified: false,
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.marketplaceBadge).toBe('none')
  })
})

describe('runConformance', () => {
  it('certifies a conforming provider', async () => {
    const report = await runConformance(conformingProvider())
    expect(report.certified).toBe(true)
    expect(report.failed).toBe(0)
    expect(report.marketplaceBadge).toBe('verified-basic')
    parseConformanceReport(report)
  })

  it('flags a violating provider', async () => {
    const report = await runConformance(violatingProvider())
    expect(report.certified).toBe(false)
    expect(report.failed).toBeGreaterThan(0)
    expect(report.marketplaceBadge).toBe('none')
    const checks = new Set(report.results.filter((r) => !r.passed).map((r) => r.check))
    expect(checks.has('capability_declared')).toBe(true)
    expect(checks.has('edit_within_writeScope')).toBe(true)
    expect(checks.has('shell_only_when_granted')).toBe(true)
  })
})
