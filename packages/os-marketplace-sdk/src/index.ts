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

export const PACKAGE_NAME = '@agentskit/os-marketplace-sdk' as const
export const PACKAGE_VERSION = '0.0.0' as const
