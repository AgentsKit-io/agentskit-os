export {
  InMemoryManifestFetcher,
  validateManifestShape,
} from './manifest-fetcher.js'
export type { FetchResult, ManifestFetcher } from './manifest-fetcher.js'

export {
  decidePermission,
  evaluateManifestPermissions,
  tightenConstraints,
} from './permissions.js'
export type {
  GrantPolicy,
  GrantStatus,
  ManifestEvaluation,
  PermissionDecision,
} from './permissions.js'

export { filterDangerousPermissions, loadPlugin } from './loader.js'
export type {
  LoadErrorCode,
  LoadOptions,
  LoadResult,
  SignatureVerifier,
} from './loader.js'

export const PACKAGE_NAME = '@agentskit/os-plugins' as const
export const PACKAGE_VERSION = '0.0.0' as const
