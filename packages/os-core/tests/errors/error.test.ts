import { describe, expect, it } from 'vitest'
import { ErrorCategory, ErrorCode, RESERVED_DOMAINS } from '../../src/errors/codes.js'
import { ERROR_SCHEMA_VERSION, parseOsError, safeParseOsError } from '../../src/errors/error.js'

describe('ErrorCode', () => {
  it.each([['config.invalid_workspace'], ['vault.locked'], ['flow.cycle_detected']])(
    'accepts %s',
    (v) => {
      expect(ErrorCode.safeParse(v).success).toBe(true)
    },
  )
  it.each([['Bad'], ['no_dot'], ['CONFIG.X'], ['x..y']])('rejects %s', (v) => {
    expect(ErrorCode.safeParse(v).success).toBe(false)
  })
})

describe('RESERVED_DOMAINS', () => {
  it('includes core domains', () => {
    for (const d of ['config', 'auth', 'vault', 'flow', 'plugin']) {
      expect(RESERVED_DOMAINS).toContain(d)
    }
  })
})

describe('ErrorCategory', () => {
  it.each([['user'], ['config'], ['auth'], ['plugin'], ['runtime'], ['integration'], ['internal']])(
    'accepts %s',
    (v) => {
      expect(ErrorCategory.safeParse(v).success).toBe(true)
    },
  )
})

const validErr = {
  name: 'OsError' as const,
  code: 'config.invalid_workspace',
  message: 'workspace id is invalid',
  retryable: false,
  category: 'config' as const,
  source: 'agentskitos://os-core',
  occurredAt: '2026-05-01T17:00:00.000Z',
  schemaVersion: 1 as const,
}

describe('OsErrorEnvelope', () => {
  it('exposes stable schema version', () => {
    expect(ERROR_SCHEMA_VERSION).toBe(1)
  })

  it('parses minimal error', () => {
    const e = parseOsError(validErr) as typeof validErr
    expect(e.code).toBe('config.invalid_workspace')
  })

  it('parses with cause chain', () => {
    const e = parseOsError({
      ...validErr,
      cause: { name: 'TypeError', message: 'foo', stack: 'stack' },
      details: { field: 'id' },
    })
    expect((e as any).cause.name).toBe('TypeError')
  })

  it('rejects wrong name', () => {
    expect(safeParseOsError({ ...validErr, name: 'Error' }).success).toBe(false)
  })

  it('rejects bad code format', () => {
    expect(safeParseOsError({ ...validErr, code: 'bad' }).success).toBe(false)
  })

  it('rejects missing required field', () => {
    expect(safeParseOsError({ ...validErr, retryable: undefined }).success).toBe(false)
  })

  it('throws on parseOsError with invalid input', () => {
    expect(() => parseOsError({})).toThrow()
  })
})
