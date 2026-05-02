export const PACKAGE_NAME = '@agentskit/os-core' as const
export const PACKAGE_VERSION = '0.0.0' as const

export { Slug, Tag, TagList, VaultSecretRef } from './schema/_primitives.js'

export {
  SCHEMA_VERSION,
  WorkspaceConfig,
  WorkspaceIsolation,
  WorkspaceLimits,
  parseWorkspaceConfig,
  safeParseWorkspaceConfig,
  parseWorkspaceLimits,
  safeParseWorkspaceLimits,
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
  PluginContribution,
  PluginPermission,
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

export {
  ObservabilityConfig,
  TraceExporter,
  CostQuota,
  AnomalyDetection,
  parseObservabilityConfig,
  safeParseObservabilityConfig,
} from './schema/observability.js'

export {
  SecurityConfig,
  PromptFirewallConfig,
  PiiRedactionConfig,
  PiiCategory,
  SandboxConfig,
  AuditLogConfig,
  parseSecurityConfig,
  safeParseSecurityConfig,
} from './schema/security.js'

export {
  CloudSyncConfig,
  CloudPlan,
  SyncStrategy,
  SsoProvider,
  RbacRole,
  TeamSeat,
  parseCloudSyncConfig,
  safeParseCloudSyncConfig,
} from './schema/cloud.js'

export {
  RagConfig,
  ChunkerConfig,
  ChunkStrategy,
  EmbeddingsConfig,
  LoaderConfig,
  FileLoader,
  UrlLoader,
  SqlLoader,
  ApiLoader,
  RetrieverConfig,
  RerankerConfig,
  parseRagConfig,
  safeParseRagConfig,
} from './schema/rag.js'

export {
  ConfigRoot,
  CONFIG_ROOT_VERSION,
  parseConfigRoot,
  safeParseConfigRoot,
} from './schema/config-root.js'

export { CONFIG_LAYERS, mergeLayers, buildProvenance } from './config/merge.js'
export type {
  ConfigLayer,
  ConfigInputs,
  DeepPartial,
  ProvenanceEntry,
  ProvenanceMap,
} from './config/merge.js'

export { MigrationError, migrateConfig } from './config/migrate.js'
export type { MigrationStep, MigrationRegistry, MigrationResult } from './config/migrate.js'

export { diffConfigs } from './config/diff.js'
export type { ConfigChangeOp } from './config/diff.js'

export { verifyCapability } from './auth/verify.js'
export type { VerifyDecision } from './auth/verify.js'

export { findVaultRefs, resolveVaultRefs } from './secrets/refs.js'
export type { VaultResolver, ResolveResult } from './secrets/refs.js'

export { InMemoryEventBus } from './events/bus.js'
export type { EventBus, EventHandler, Subscription } from './events/bus.js'

export {
  RUN_MODES,
  RUN_MODE_POLICY,
  RunMode,
  RunContext,
  escalationRule,
  checkDeterminism,
  parseRunContext,
  safeParseRunContext,
} from './runtime/run-mode.js'

export {
  EgressPolicy,
  EgressProxy,
  checkEgress,
  parseEgressPolicy,
  safeParseEgressPolicy,
} from './security/egress.js'
export type { EgressGrant, EgressDecision } from './security/egress.js'

export {
  SIDE_EFFECTS,
  SideEffect,
  SideEffectList,
  decideToolAction,
  maxSeverity,
} from './tools/side-effects.js'
export type { ModeAction } from './tools/side-effects.js'

export {
  SANDBOX_LEVELS,
  SandboxLevel,
  MIN_SANDBOX_FOR,
  ToolManifest,
  decideSandbox,
  parseToolManifest,
  safeParseToolManifest,
} from './tools/sandbox.js'
export type { SandboxDecision, SandboxRuntime } from './tools/sandbox.js'

export {
  AUDIT_SCHEMA_VERSION,
  GENESIS_PREV_HASH,
  AuditBatch,
  AuditSignature,
  AuditKeyCustody,
  AnchorRecord,
  SignedEventRef,
  computeMerkleRoot,
  computeBatchDigest,
  verifyChain,
  parseAuditBatch,
  safeParseAuditBatch,
} from './audit/batch.js'
export type { ChainBreak, SignatureVerifier } from './audit/batch.js'

export {
  EXTENSION_API_VERSION,
  EXTENSION_POINTS,
  ExtensionPoint,
  ExtensionRegistration,
  PluginEntrypoint,
  PluginRegistry,
  StabilityTier,
  stabilityOf,
  isHotReloadable,
  isApiCompatible,
  parsePluginEntrypoint,
  safeParsePluginEntrypoint,
} from './plugins/catalog.js'
export type { RegistryConflict } from './plugins/catalog.js'

export {
  LOCKFILE_VERSION,
  Lockfile,
  PluginLock,
  AgentLock,
  ModelLock,
  FlowLock,
  FlowNodeLock,
  ProviderLock,
  ToolLock,
  TemplateLock,
  SchemaVersionsLock,
  LockSignature,
  parseLockfile,
  safeParseLockfile,
  canonicalJson,
  sha256OfCanonical,
  detectLockDrift,
} from './lockfile/lock.js'
export type { LockDriftIssue, DriftCheckInput } from './lockfile/lock.js'
export type {
  RunModePolicy,
  EscalationRule,
  DeterminismIssue,
  DeterminismCheckInput,
} from './runtime/run-mode.js'

export {
  EVENT_SPEC_VERSION,
  RESERVED_TOPIC_ROOTS,
  EventType,
  EventSource,
  DataSchemaUri,
  Ulid,
  EventEnvelope,
  AnyEvent,
  parseEvent,
  safeParseEvent,
} from './events/event.js'

export {
  PrincipalKind,
  Principal,
  PrincipalRef,
  parsePrincipal,
  safeParsePrincipal,
} from './auth/principal.js'

export {
  Action,
  ResourceRef,
  CapabilityConstraints,
  CapabilitySignature,
  Capability,
  AuthContext,
  parseCapability,
  safeParseCapability,
  parseAuthContext,
  safeParseAuthContext,
} from './auth/capability.js'

export {
  ErrorCategory,
  ErrorCode,
  RESERVED_DOMAINS,
} from './errors/codes.js'

export {
  ERROR_SCHEMA_VERSION,
  OsErrorEnvelope,
  parseOsError,
  safeParseOsError,
} from './errors/error.js'
