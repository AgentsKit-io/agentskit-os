export const PACKAGE_NAME = '@agentskit/os-core' as const
export const PACKAGE_VERSION = '0.0.0' as const

export {
  SCHEMA_VERSION,
  WorkspaceConfig,
  WorkspaceIsolation,
  parseWorkspaceConfig,
  safeParseWorkspaceConfig,
} from './schema/workspace.js'
