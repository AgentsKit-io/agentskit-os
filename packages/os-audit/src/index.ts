export { hashEvent } from './event-hash.js'
export type { SignedEventRef } from './event-hash.js'

export { InMemoryBatchStore } from './batch-store.js'
export type { BatchStore } from './batch-store.js'

export { AuditEmitter } from './emitter.js'
export type { EmitterOptions, Signer } from './emitter.js'

export const PACKAGE_NAME = '@agentskit/os-audit' as const
export const PACKAGE_VERSION = '0.0.0' as const
