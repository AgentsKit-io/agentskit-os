export { FileCheckpointStore } from './file-checkpoint-store.js'
export type { FileCheckpointStoreOptions } from './file-checkpoint-store.js'

export { LockfileStore } from './lockfile-store.js'
export type { LockfileStoreOptions } from './lockfile-store.js'

export { nodeFs, safeRunId } from './fs-utils.js'
export type { FileSystem } from './fs-utils.js'

export const PACKAGE_NAME = '@agentskit/os-storage' as const
export const PACKAGE_VERSION = '0.0.0' as const
