import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { sha256OfFile, verifyBinaryAttestation } from '../src/binary-attestation.js'

describe('verifyBinaryAttestation (#441)', () => {
  it('passes when no constraints are set beyond providerId', () => {
    const v = verifyBinaryAttestation({
      resolvedPath: '/opt/cli/codex',
      attestation: { providerId: 'codex' },
    })
    expect(v.ok).toBe(true)
    expect(v.reasons).toEqual([])
  })

  it('fails on expectedPath mismatch', () => {
    const v = verifyBinaryAttestation({
      resolvedPath: '/tmp/codex',
      attestation: { providerId: 'codex', expectedPath: '/usr/local/bin/codex' },
    })
    expect(v.ok).toBe(false)
    expect(v.reasons[0]).toMatch(/path_mismatch/)
  })

  it('fails on path not in allowlist when expectedPath absent', () => {
    const v = verifyBinaryAttestation({
      resolvedPath: '/tmp/cli/codex',
      attestation: {
        providerId: 'codex',
        allowedPathPrefixes: ['/usr/local/bin', '/opt/agentskit/bin'],
      },
    })
    expect(v.ok).toBe(false)
    expect(v.reasons[0]).toMatch(/path_not_allowlisted/)
  })

  it('passes when path lives under an allowlisted prefix', () => {
    const v = verifyBinaryAttestation({
      resolvedPath: '/usr/local/bin/codex',
      attestation: {
        providerId: 'codex',
        allowedPathPrefixes: ['/usr/local/bin'],
      },
    })
    expect(v.ok).toBe(true)
  })

  it('flags missing sha when attestation requires one', () => {
    const v = verifyBinaryAttestation({
      resolvedPath: '/usr/local/bin/codex',
      attestation: { providerId: 'codex', expectedSha256: 'a'.repeat(64) },
    })
    expect(v.ok).toBe(false)
    expect(v.reasons[0]).toMatch(/sha256_missing/)
  })

  it('flags sha mismatch (case-insensitive compare)', () => {
    const v = verifyBinaryAttestation({
      resolvedPath: '/usr/local/bin/codex',
      sha256: 'b'.repeat(64),
      attestation: { providerId: 'codex', expectedSha256: 'a'.repeat(64) },
    })
    expect(v.ok).toBe(false)
    expect(v.reasons[0]).toMatch(/sha256_mismatch/)
  })

  it('passes with matching sha (case-insensitive)', () => {
    const v = verifyBinaryAttestation({
      resolvedPath: '/usr/local/bin/codex',
      sha256: 'A'.repeat(64),
      attestation: { providerId: 'codex', expectedSha256: 'a'.repeat(64) },
    })
    expect(v.ok).toBe(true)
  })
})

describe('sha256OfFile (#441)', () => {
  it('returns the streaming sha256 of the file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ak-sha-'))
    try {
      const f = join(dir, 'bin')
      await writeFile(f, 'hello world', 'utf8')
      // sha256("hello world") = b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
      const got = await sha256OfFile(f)
      expect(got).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
