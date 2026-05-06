// Per #441 — provider binary attestation primitives.
// Pure verification helpers; no I/O at module load. Callers wire SHA computation
// at boot when policy requires attestation.

import { createHash } from 'node:crypto'
import { open } from 'node:fs/promises'

export type BinaryAttestation = {
  readonly providerId: string
  /** Exact resolved path the binary must live at (e.g. /usr/local/bin/codex). */
  readonly expectedPath?: string
  /** Allowlisted directory prefixes; matched when `expectedPath` is absent. */
  readonly allowedPathPrefixes?: readonly string[]
  /** Hex SHA-256 of the binary. Required for strict attestation. */
  readonly expectedSha256?: string
  /** Free-form note recorded on audit events when attestation fires. */
  readonly note?: string
}

export type AttestationVerdict = {
  readonly ok: boolean
  readonly providerId: string
  readonly resolvedPath: string
  readonly reasons: readonly string[]
}

const startsWithAny = (s: string, prefixes: readonly string[]): boolean =>
  prefixes.some((p) => s === p || s.startsWith(p.endsWith('/') ? p : `${p}/`))

/**
 * Verify a resolved binary path + sha against an attestation record (#441).
 * Returns ok=true only when every supplied constraint matches; missing fields
 * are skipped (not implicit pass: caller decides whether to require sha).
 */
export const verifyBinaryAttestation = (args: {
  readonly resolvedPath: string
  readonly sha256?: string
  readonly attestation: BinaryAttestation
}): AttestationVerdict => {
  const { resolvedPath, sha256, attestation: a } = args
  const reasons: string[] = []
  if (a.expectedPath !== undefined && resolvedPath !== a.expectedPath) {
    reasons.push(`path_mismatch: expected ${a.expectedPath}, got ${resolvedPath}`)
  }
  if (
    a.expectedPath === undefined
    && a.allowedPathPrefixes !== undefined
    && a.allowedPathPrefixes.length > 0
    && !startsWithAny(resolvedPath, a.allowedPathPrefixes)
  ) {
    reasons.push(
      `path_not_allowlisted: ${resolvedPath} not under {${a.allowedPathPrefixes.join(', ')}}`,
    )
  }
  if (a.expectedSha256 !== undefined) {
    if (sha256 === undefined) {
      reasons.push('sha256_missing: attestation requires sha256 but caller did not supply one')
    } else if (sha256.toLowerCase() !== a.expectedSha256.toLowerCase()) {
      reasons.push(`sha256_mismatch: expected ${a.expectedSha256}, got ${sha256}`)
    }
  }
  return {
    ok: reasons.length === 0,
    providerId: a.providerId,
    resolvedPath,
    reasons,
  }
}

/** Streaming SHA-256 of a file, hex-lowercase. Reads in 64KiB chunks. */
export const sha256OfFile = async (path: string): Promise<string> => {
  const handle = await open(path, 'r')
  try {
    const hash = createHash('sha256')
    const buf = Buffer.alloc(65_536)
    while (true) {
      const { bytesRead } = await handle.read(buf, 0, buf.length, null)
      if (bytesRead === 0) break
      hash.update(buf.subarray(0, bytesRead))
    }
    return hash.digest('hex')
  } finally {
    await handle.close()
  }
}
