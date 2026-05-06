import { describe, expect, it } from 'vitest'
import {
  CODING_PERMISSION_PROFILES,
  buildCodingPermissionAuditEvent,
  evaluateCodingPermission,
  getCodingPermissionProfile,
  listCodingPermissionProfiles,
} from '../src/coding-permission-profiles.js'

describe('CODING_PERMISSION_PROFILES', () => {
  it('lists every profile id', () => {
    const ids = listCodingPermissionProfiles().map((p) => p.id).sort()
    expect(ids).toEqual([
      'edit_without_shell',
      'full_sandbox',
      'read_only_review',
      'release_manager',
      'test_runner',
    ])
  })

  it('resolves by id via getCodingPermissionProfile', () => {
    expect(getCodingPermissionProfile('read_only_review')?.displayName).toBe('Read-only review')
    expect(getCodingPermissionProfile('unknown')).toBeUndefined()
  })
})

describe('evaluateCodingPermission', () => {
  const ro = CODING_PERMISSION_PROFILES.read_only_review

  it('denies file writes on read_only_review', () => {
    const d = evaluateCodingPermission(ro, { kind: 'file_write', path: 'src/foo.ts' })
    expect(d.allow).toBe(false)
    expect(d.code).toBe('profile.write_denied')
  })

  it('denies shell on edit_without_shell', () => {
    const p = CODING_PERMISSION_PROFILES.edit_without_shell
    const d = evaluateCodingPermission(p, { kind: 'shell', command: 'pnpm test' })
    expect(d.allow).toBe(false)
    expect(d.code).toBe('profile.shell_denied')
  })

  it('allows test commands for test_runner', () => {
    const p = CODING_PERMISSION_PROFILES.test_runner
    expect(evaluateCodingPermission(p, { kind: 'shell', command: 'pnpm test' }).allow).toBe(true)
    expect(evaluateCodingPermission(p, { kind: 'shell', command: 'sudo reboot' }).allow).toBe(false)
  })

  it('allowlists egress for full_sandbox', () => {
    const p = CODING_PERMISSION_PROFILES.full_sandbox
    expect(evaluateCodingPermission(p, { kind: 'network', host: 'github.com' }).allow).toBe(true)
    expect(evaluateCodingPermission(p, { kind: 'network', host: 'evil.example' }).allow).toBe(false)
  })

  it('allows git push only for release_manager', () => {
    expect(
      evaluateCodingPermission(CODING_PERMISSION_PROFILES.full_sandbox, { kind: 'git', action: 'push' }).allow,
    ).toBe(false)
    expect(
      evaluateCodingPermission(CODING_PERMISSION_PROFILES.release_manager, { kind: 'git', action: 'push' }).allow,
    ).toBe(true)
  })
})

describe('buildCodingPermissionAuditEvent', () => {
  it('records schema + operation snapshot', () => {
    const profile = CODING_PERMISSION_PROFILES.read_only_review
    const op = { kind: 'file_write' as const, path: 'x' }
    const decision = evaluateCodingPermission(profile, op)
    const ev = buildCodingPermissionAuditEvent({
      providerId: 'codex',
      taskId: 't1',
      profile,
      operation: op,
      decision,
      at: '2026-05-05T12:00:00.000Z',
    })
    expect(ev.schemaVersion).toBe('1.0')
    expect(ev.profileId).toBe('read_only_review')
    expect(ev.decision).toEqual(decision)
  })
})
