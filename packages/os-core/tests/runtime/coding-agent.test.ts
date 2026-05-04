import { describe, expect, it } from 'vitest'
import {
  parseCodingTaskRequest,
  parseCodingTaskResult,
  parseConformanceReport,
  runConformance,
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
  runTask: async (req: CodingTaskRequest): Promise<CodingTaskResult> => ({
    providerId: 'fake',
    status: 'ok',
    files: req.dryRun ? [{ path: 'allowed/x.ts', op: 'create', after: '// hi' }] : [],
    shell: [],
    tools: [],
    summary: 'did the thing',
    costUsd: 0.01,
    inputTokens: 100,
    outputTokens: 50,
  }),
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
})

describe('runConformance', () => {
  it('certifies a conforming provider', async () => {
    const report = await runConformance(conformingProvider())
    expect(report.certified).toBe(true)
    expect(report.failed).toBe(0)
    parseConformanceReport(report)
  })

  it('flags a violating provider', async () => {
    const report = await runConformance(violatingProvider())
    expect(report.certified).toBe(false)
    expect(report.failed).toBeGreaterThan(0)
    const checks = new Set(report.results.filter((r) => !r.passed).map((r) => r.check))
    expect(checks.has('capability_declared')).toBe(true)
    expect(checks.has('edit_within_writeScope')).toBe(true)
    expect(checks.has('shell_only_when_granted')).toBe(true)
  })
})
