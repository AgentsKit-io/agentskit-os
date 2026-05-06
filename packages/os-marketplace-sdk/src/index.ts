export {
  canonicalJson,
  sha256OfBytes,
  sha256OfCanonical,
  sha512OfBytes,
  sha512OfCanonical,
  verifyIntegrity,
} from './integrity.js'

export { buildManifest, stripSignature } from './manifest-builder.js'
export type { ManifestSigner, BuildOptions } from './manifest-builder.js'

export { buildBundle, verifyAsset, verifyBundleArchive } from './bundle.js'
export type { AssetEntry, AssetRecord, Bundle } from './bundle.js'

export { InMemoryPublisher } from './publisher.js'
export type { Publisher, PublishResult } from './publisher.js'

export { buildPluginCostBadge } from './cost-badge.js'
export type { PluginCostBadge, PluginCostBadgeInput } from './cost-badge.js'

export { evaluateInstall, searchListings } from './listing.js'
export type {
  EvaluateInstallArgs,
  InstallVerdict,
  InstallVerdictFail,
  InstallVerdictOk,
  ListingCategory,
  ListingSearchQuery,
  MarketplaceListing,
  SearchOpts,
} from './listing.js'

export { diffPermissions, evaluateProvenanceAgainstPolicy } from './provenance.js'
export type {
  InstallPolicy,
  InstallVerdict as ProvenanceInstallVerdict,
  PermissionDiff,
  ProvenanceAttestation,
  ProvenanceBundle,
  SbomEntry,
} from './provenance.js'

export { filterForPrivateViewer, tagPrivateScope } from './private-library.js'
export type {
  PrivateLibraryViewer,
  PrivateScope,
} from './private-library.js'

export const PACKAGE_NAME = '@agentskit/os-marketplace-sdk' as const
export const PACKAGE_VERSION = '0.0.0' as const
