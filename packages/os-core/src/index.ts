export const PACKAGE_NAME = '@agentskit/os-core' as const
export const PACKAGE_VERSION = '0.0.0' as const

export { Slug, Tag, TagList, VaultSecretRef } from './schema/_primitives.js'

export {
  SCHEMA_VERSION,
  WorkspaceConfig,
  WorkspaceIsolation,
  parseWorkspaceConfig,
  safeParseWorkspaceConfig,
} from './schema/workspace.js'

export {
  AgentConfig,
  AgentModelConfig,
  AgentMemoryRef,
  ProviderRef,
  ToolRef,
  SkillRef,
  parseAgentConfig,
  safeParseAgentConfig,
} from './schema/agent.js'

export {
  TriggerConfig,
  CronTrigger,
  WebhookTrigger,
  FileWatchTrigger,
  EmailTrigger,
  SlackTrigger,
  GitHubTrigger,
  LinearTrigger,
  CdcTrigger,
  parseTriggerConfig,
  safeParseTriggerConfig,
} from './schema/trigger.js'

export {
  FlowConfig,
  FlowNode,
  FlowEdge,
  AgentNode,
  ToolNode,
  HumanNode,
  ConditionNode,
  ParallelNode,
  RetryPolicy,
  parseFlowConfig,
  safeParseFlowConfig,
} from './schema/flow.js'

export {
  PluginConfig,
  PluginCapability,
  PluginSignature,
  parsePluginConfig,
  safeParsePluginConfig,
} from './schema/plugin.js'

export {
  VaultConfig,
  VaultBackend,
  FileVault,
  OsKeychainVault,
  EnvVault,
  ExternalVault,
  parseVaultConfig,
  safeParseVaultConfig,
} from './schema/vault.js'

export {
  MemoryConfig,
  InMemoryStore,
  FileMemoryStore,
  SqliteMemoryStore,
  RedisMemoryStore,
  VectorMemoryStore,
  LocalStorageMemoryStore,
  parseMemoryConfig,
  safeParseMemoryConfig,
} from './schema/memory.js'
