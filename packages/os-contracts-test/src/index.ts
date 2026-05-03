export { runCheckpointStoreSuite } from './checkpoint-store-suite.js'
export type {
  CheckpointStoreFactory,
  SuiteHooks,
} from './checkpoint-store-suite.js'

export { runBatchStoreSuite } from './batch-store-suite.js'
export type { BatchStoreFactory } from './batch-store-suite.js'

export { runEventBusSuite } from './event-bus-suite.js'
export type { EventBusFactory } from './event-bus-suite.js'

export const PACKAGE_NAME = '@agentskit/os-contracts-test' as const
export const PACKAGE_VERSION = '0.0.0' as const
