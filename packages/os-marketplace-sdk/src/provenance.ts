// Per #342 — plugin provenance, SBOM, permissions diff, install policy.
// Pure: schemas + diffing helpers. No I/O; the marketplace UI + install flow
// pipe these structures through to the user.

export type SbomEntry = {
  readonly name: string
  readonly version: string
  /** Hex SHA-256 of the package tarball; matches lockfile integrity. */
  readonly integrity: string
  readonly license?: string
}

export type ProvenanceAttestation = {
  /** SLSA-style provenance level (0..4); plain number for marketplace UI. */
  readonly slsaLevel: 0 | 1 | 2 | 3 | 4
  /** Builder identity (e.g. "github-actions:agentskit-io/repo"). */
  readonly builder: string
  /** Source repo + commit sha that produced the artifact. */
  readonly sourceRepo: string
  readonly sourceCommit: string
  readonly builtAt: string
}

export type ProvenanceBundle = {
  readonly schemaVersion: '1.0'
  readonly pluginId: string
  readonly version: string
  readonly attestation: ProvenanceAttestation
  readonly sbom: readonly SbomEntry[]
  /** Permissions declared in the manifest at publish time. */
  readonly declaredPermissions: readonly string[]
}

export type PermissionDiff = {
  readonly added: readonly string[]
  readonly removed: readonly string[]
  readonly unchanged: readonly string[]
}

export type InstallPolicy = {
  /** Minimum SLSA level the install policy accepts. */
  readonly minSlsaLevel: 0 | 1 | 2 | 3 | 4
  /** Permissions the install policy denies outright. */
  readonly deniedPermissions?: readonly string[]
  /** When true, license must be set on every SBOM entry. */
  readonly requireLicensePerDep?: boolean
}

export type InstallVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly reasons: readonly string[] }

const sortedDedup = (xs: readonly string[]): readonly string[] =>
  [...new Set(xs)].sort()

/**
 * Compute permission additions / removals between two manifest versions (#342).
 * Caller passes the previously installed and newly proposed permission lists.
 */
export const diffPermissions = (
  previous: readonly string[],
  next: readonly string[],
): PermissionDiff => {
  const prev = new Set(previous)
  const nx = new Set(next)
  const added = sortedDedup([...nx].filter((p) => !prev.has(p)))
  const removed = sortedDedup([...prev].filter((p) => !nx.has(p)))
  const unchanged = sortedDedup([...prev].filter((p) => nx.has(p)))
  return { added, removed, unchanged }
}

/**
 * Evaluate a provenance bundle against an install policy (#342).
 * Returns one verdict the marketplace UI can render directly.
 */
export const evaluateProvenanceAgainstPolicy = (
  bundle: ProvenanceBundle,
  policy: InstallPolicy,
): InstallVerdict => {
  const reasons: string[] = []
  if (bundle.attestation.slsaLevel < policy.minSlsaLevel) {
    reasons.push(
      `slsa.level=${bundle.attestation.slsaLevel} below policy min=${policy.minSlsaLevel}`,
    )
  }
  if (policy.deniedPermissions !== undefined) {
    const denied = bundle.declaredPermissions.filter((p) => policy.deniedPermissions!.includes(p))
    if (denied.length > 0) reasons.push(`denied_permissions: ${denied.join(', ')}`)
  }
  if (policy.requireLicensePerDep === true) {
    const missing = bundle.sbom.filter((e) => !e.license || e.license.length === 0)
    if (missing.length > 0) {
      reasons.push(`sbom.license_missing: ${missing.map((e) => `${e.name}@${e.version}`).join(', ')}`)
    }
  }
  return reasons.length === 0 ? { ok: true } : { ok: false, reasons }
}
