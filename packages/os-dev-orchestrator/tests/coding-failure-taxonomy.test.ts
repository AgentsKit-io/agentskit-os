import { describe, expect, it } from 'vitest'
import type { CodingTaskResult } from '@agentskit/os-core'
import {
  buildCodingFailureIncident,
  classifyCodingFailure,
  CODING_FAILURE_CATALOG,
} from '../src/coding-failure-taxonomy.js'

const base = (overrides: Partial<CodingTaskResult>): CodingTaskResult => ({
  providerId: 'codex',
  status: 'ok',
  files: [],
  shell: [],
  tools: [],
  summary: '',
  ...overrides,
})

describe('CODING_FAILURE_CATALOG', () => {
  it('defines every code with recovery metadata', () => {
    const keys = Object.keys(CODING_FAILURE_CATALOG)
    expect(keys.length).toBeGreaterThanOrEqual(10)
    for (const k of keys) {
      const e = CODING_FAILURE_CATALOG[k as keyof typeof CODING_FAILURE_CATALOG]
      expect(e.suggestedRecovery.length).toBeGreaterThan(10)
      expect(e.recoveryActions.length).toBeGreaterThan(0)
    }
  })
})

describe('classifyCodingFailure', () => {
  it('returns null for clean ok', () => {
    expect(classifyCodingFailure(base({ status: 'ok', summary: 'done' }))).toBeNull()
  })

  it('maps timeout status', () => {
    const c = classifyCodingFailure(base({ status: 'timeout' }))
    expect(c?.code).toBe('provider_timeout')
    expect(c?.source).toBe('status')
  })

  it('maps permission errorCode', () => {
    const c = classifyCodingFailure(base({ status: 'fail', errorCode: 'eacces.permission' }))
    expect(c?.code).toBe('permission_denied')
  })

  it('maps provider unavailable', () => {
    const c = classifyCodingFailure(
      base({ status: 'fail', errorCode: 'codex.not_found', summary: 'cli missing' }),
    )
    expect(c?.code).toBe('provider_unavailable')
  })

  it('maps bad json to invalid_diff', () => {
    const c = classifyCodingFailure(base({ status: 'fail', errorCode: 'codex.bad_json' }))
    expect(c?.code).toBe('invalid_diff')
  })

  it('maps failing test shell', () => {
    const c = classifyCodingFailure(
      base({
        status: 'ok',
        shell: [{ command: 'pnpm vitest run', exitCode: 1, stdout: '', stderr: 'FAIL' }],
      }),
    )
    expect(c?.code).toBe('tests_failed')
    expect(c?.source).toBe('shell')
  })

  it('detects secret leak heuristic', () => {
    const c = classifyCodingFailure(
      base({ status: 'fail', summary: 'leaked sk-abc123 in log', errorCode: 'x' }),
    )
    expect(c?.code).toBe('secret_leak')
  })

  it('detects hallucinated path', () => {
    const c = classifyCodingFailure(
      base({
        status: 'ok',
        files: [{ path: '/etc/passwd', op: 'modify', after: 'x' }],
      }),
    )
    expect(c?.code).toBe('hallucinated_file')
  })
})

describe('buildCodingFailureIncident', () => {
  it('returns null for clean success', () => {
    expect(
      buildCodingFailureIncident({
        result: base({ status: 'ok', summary: 'done' }),
        providerId: 'codex',
      }),
    ).toBeNull()
  })

  it('builds incident for timeout', () => {
    const inc = buildCodingFailureIncident({
      result: base({ status: 'timeout', summary: 'timed out' }),
      providerId: 'codex',
      runId: 'r1',
      taskId: 't1',
      capturedAt: '2026-05-05T12:00:00Z',
    })
    expect(inc).not.toBeNull()
    expect(inc?.classification.code).toBe('provider_timeout')
    expect(inc?.providerId).toBe('codex')
    expect(inc?.runId).toBe('r1')
    expect(inc?.incidentId).toContain('provider_timeout')
  })
})
