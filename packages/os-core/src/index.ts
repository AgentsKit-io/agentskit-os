export const PACKAGE_NAME = '@agentskit/os-core' as const
export const PACKAGE_VERSION = '0.0.0' as const

export {
  Slug,
  Tag,
  TagList,
  VaultSecretRef,
  RepoRef,
  parseRepoRef,
  safeParseRepoRef,
} from './schema/_primitives.js'

export {
  SCHEMA_VERSION,
  WorkspaceConfig,
  WorkspaceKind,
  ClientRef,
  WorkspaceIsolation,
  WorkspaceLimits,
  DataResidencyConfig,
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
  effectiveLimitsFor,
} from './schema/trigger.js'

export {
  TRIGGER_PRESETS,
  getTriggerPreset,
  listTriggerPresets,
} from './trigger/presets.js'
export type { TriggerPreset } from './trigger/presets.js'

export {
  FlowConfig,
  FlowNode,
  FlowEdge,
  AgentNode,
  ToolNode,
  HumanNode,
  ConditionNode,
  ParallelNode,
  CompareNode,
  VoteNode,
  DebateNode,
  AuctionNode,
  BlackboardNode,
  BlackboardScratchpad,
  BlackboardSchedule,
  BlackboardTermination,
  RetryPolicy,
  parseFlowConfig,
  safeParseFlowConfig,
} from './schema/flow.js'

export {
  FLOW_ENVELOPE_FORMAT,
  FlowEnvelope,
  FlowEnvelopeSignature,
  canonicalFlowBody,
  parseFlowEnvelope,
  safeParseFlowEnvelope,
} from './schema/flow-envelope.js'

export {
  VisualPoint,
  VisualFlowLayout,
  VisualFlowNodeKind,
  VisualFlowNode,
  VisualFlowEdge,
  VisualFlowDocument,
  visualEdgeId,
  flowConfigToVisualDocument,
  visualDocumentToFlowConfig,
  assertVisualFlowRoundTrip,
  parseVisualFlowDocument,
  safeParseVisualFlowDocument,
} from './schema/flow-visual.js'

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
  ActivationMetricsConfig,
  parseObservabilityConfig,
  safeParseObservabilityConfig,
} from './schema/observability.js'

export {
  SecurityConfig,
  WorkspacePolicyConfig,
  PromptFirewallConfig,
  PiiRedactionConfig,
  PiiCategory,
  SandboxConfig,
  AuditLogConfig,
  parseSecurityConfig,
  safeParseSecurityConfig,
} from './schema/security.js'

export {
  evaluateWorkspacePolicyAtRunStart,
  evaluateWorkspacePolicyBeforeTool,
  policyGlobMatch,
} from './security/workspace-policy-engine.js'
export {
  OperatorRoleKind,
  OperatorScreen,
  OperatorAction,
  OperatorRoleAssignment,
  visibleScreensForRole,
  allowedActionsForRole,
  canViewScreen,
  canPerformAction,
  hiddenScreensForRole,
  parseOperatorRoleAssignment,
} from './security/operator-roles.js'
export type {
  PolicyViolation,
  RunStartPolicyInput,
  ToolPolicyInput,
  WorkspacePolicyDecision,
} from './security/workspace-policy-engine.js'

export { createInMemoryHitlInbox, HitlDecision, HitlTask, HitlTaskStatus } from './hitl/inbox.js'
export type {
  HitlDecision as HitlDecisionType,
  HitlInbox,
  HitlTask as HitlTaskType,
  HitlTaskStatus as HitlTaskStatusType,
} from './hitl/inbox.js'

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
  RagPipeline,
  RagPipelineRef,
  RagLoader,
  KnowledgeGovernance,
  KnowledgeSensitivity,
  KnowledgeTrustLevel,
  KnowledgeFallbackBehavior,
  CitationRequirement,
  ChunkerConfig,
  ChunkerStrategy,
  EmbedderConfig,
  VectorStoreConfig,
  RerankerConfig,
  RerankerKind,
  HybridSearchConfig,
  parseRagConfig,
  safeParseRagConfig,
  parseRagPipeline,
  safeParseRagPipeline,
} from './schema/rag.js'

export {
  AgentRegistryEntry,
  AgentLifecycleState,
  AgentRiskTier,
  AgentEnvironment,
  SupportContact,
  SloRef,
  SlaRef,
  AgentDependency,
  AuditMetadata,
  parseAgentRegistryEntry,
  safeParseAgentRegistryEntry,
} from './schema/agent-registry.js'

export {
  AgentVersion,
  AgentVersionSnapshot,
  AgentsManifest,
  AgentsManifestVersion,
  hashSnapshot,
  suggestBump,
  applyBump,
  diffSnapshots,
  parseAgentVersion,
  safeParseAgentVersion,
  parseAgentsManifest,
  safeParseAgentsManifest,
} from './schema/agent-version.js'
export type { BumpKind, Hasher, SnapshotDiff } from './schema/agent-version.js'

export {
  EvalKind,
  EvalCriterion,
  EvalDef,
  EvalSuite,
  EvalSuiteVersion,
  DomainPack,
  EvalResult,
  EvalResultStatus,
  passesThreshold,
  parseEvalDef,
  safeParseEvalDef,
  parseEvalSuite,
  safeParseEvalSuite,
  parseDomainPack,
  safeParseDomainPack,
} from './schema/eval.js'

export {
  ConfigRoot,
  CONFIG_ROOT_VERSION,
  parseConfigRoot,
  safeParseConfigRoot,
} from './schema/config-root.js'

export {
  SliComparison,
  SliKind,
  SliSlo,
  SliSloContract,
  SliWindow,
  evaluateSliSloContract,
  parseSliSloContract,
  safeParseSliSloContract,
} from './schema/sli-slo.js'
export type { SliSample, SliSloVerdict } from './schema/sli-slo.js'

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

export {
  ProviderKind,
  ProviderRequirement,
  ProviderCheckResult,
  BUILTIN_PROVIDERS,
  filterProviders,
  checkProviderKeys,
  parseProviderRequirement,
  safeParseProviderRequirement,
} from './secrets/providers.js'
export type {
  ProviderFilterOptions,
  ProviderCheckStatus,
} from './secrets/providers.js'

export {
  TelemetryConsentState,
  TelemetryConsent,
  TelemetryEventKind,
  TelemetryEvent,
  TelemetrySink,
  TelemetryConfig,
  decideEmit,
  bucketDuration,
  parseTelemetryEvent,
  safeParseTelemetryEvent,
  parseTelemetryConfig,
  safeParseTelemetryConfig,
} from './obs/telemetry.js'
export {
  ActivationEventKind,
  ActivationEvent,
  RetentionCohort,
  buildActivationFunnel,
  buildRetentionCohorts,
  buildProviderSuccessRates,
  buildRepeatRunFrequency,
  decideEmitActivation,
  parseActivationEvent,
  safeParseActivationEvent,
} from './obs/activation.js'
export type {
  ActivationFunnel,
  ProviderSuccessRate,
  RepeatRunFrequency,
  RetentionInputs,
} from './obs/activation.js'
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
  STUB_RUN_MODES,
  isStubRunMode,
  createDefaultRunId,
} from './runtime/run-mode.js'
export type { StubRunMode } from './runtime/run-mode.js'

export {
  FallbackEntry,
  pickAdapter,
  NoAdapterAvailableError,
  parseFallbackEntry,
  safeParseFallbackEntry,
} from './runtime/adapter-fallback.js'
export type { PickAdapterOptions, PickAdapterSuccess } from './runtime/adapter-fallback.js'

export { forkAgentConfig, forkWorkspaceConfig } from './runtime/fork.js'
export type { ForkOptions } from './runtime/fork.js'

export {
  MarketplaceCacheEntry,
  MarketplaceCacheSnapshot,
  decideMarketplaceSource,
  mergeMarketplaceSnapshot,
  parseMarketplaceCacheSnapshot,
} from './runtime/marketplace-cache.js'
export type {
  MarketplaceSourceDecision,
  MarketplaceDecisionInputs,
} from './runtime/marketplace-cache.js'

export { resolveWorkspacePaths } from './runtime/workspace-paths.js'
export type {
  WorkspacePaths,
  ResolveWorkspacePathsOptions,
} from './runtime/workspace-paths.js'

export {
  TransitionCheck,
  AgentLifecycleEvent,
  evaluateTransition,
  isTransitionAllowed,
  requirementsFor,
  parseAgentLifecycleEvent,
  safeParseAgentLifecycleEvent,
} from './runtime/agent-lifecycle.js'
export type { TransitionRequirements, TransitionDecision } from './runtime/agent-lifecycle.js'

export {
  RegistryWriteResult,
  applyLifecycleEvent,
  replayEvents,
  stageLabel,
} from './runtime/agent-registry-store.js'
export type { RegistryStore } from './runtime/agent-registry-store.js'

export {
  buildChangelogEntries,
  renderAgentChangelog,
  renderManifestChangelogs,
} from './runtime/agent-changelog.js'

export {
  ThrottleScope,
  ThrottleAction,
  CostBudget,
  CostThrottleConfig,
  CostMeasurement,
  ThrottleDecision,
  decideThrottle,
  parseThrottleConfig,
  safeParseThrottleConfig,
  parseCostMeasurement,
  safeParseCostMeasurement,
} from './runtime/cost-throttle.js'

export {
  CodingAgentCapability,
  CodingAgentInvocationModel,
  CodingAgentProviderInfo,
  CodingTaskKind,
  CodingTaskRequest,
  CodingTaskResult,
  FileEdit,
  ShellInvocation,
  ToolUse,
  CONFORMANCE_PROMPTS,
  ConformanceCheck,
  ConformanceCheckResult,
  ConformanceReport,
  MarketplaceConformanceBadge,
  runConformance,
  parseCodingTaskRequest,
  safeParseCodingTaskRequest,
  parseCodingTaskResult,
  safeParseCodingTaskResult,
  parseConformanceReport,
  safeParseConformanceReport,
} from './runtime/coding-agent.js'
export type { CodingAgentProvider } from './runtime/coding-agent.js'
export type {
  ChangelogEntry,
  ChangelogSummary,
  GitCommitResolver,
} from './runtime/agent-changelog.js'

export {
  EgressPolicy,
  EgressProxy,
  checkEgress,
  parseEgressPolicy,
  safeParseEgressPolicy,
} from './security/egress.js'
export type { EgressGrant, EgressDecision } from './security/egress.js'

export {
  computeWebhookSignature,
  formatWebhookSignatureHeader,
  parseWebhookSignatureHeader,
  signWebhookRequest,
  verifyWebhookRequest,
} from './security/webhook-signing.js'
export type {
  WebhookHmacAlgorithm,
  WebhookSignature,
  WebhookSigningConfig,
  WebhookVerifyDecision,
} from './security/webhook-signing.js'

export {
  PROMPT_FIREWALL_CORPUS,
  PROMPT_FIREWALL_TIERS,
  evaluatePromptFirewall,
  evaluatePromptFirewallTiered,
} from './security/prompt-firewall.js'
export type {
  PromptFirewallCorpusEntry,
  PromptFirewallTier,
  PromptFirewallVerdict,
} from './security/prompt-firewall.js'

export {
  REDACTION_PROFILE_IDS,
  applyRedactionProfile,
  createRedactor,
  getRedactionProfile,
} from './security/redaction-profiles.js'
export type {
  RedactionProfile,
  RedactionProfileId,
  RedactionRule,
} from './security/redaction-profiles.js'

export {
  AirGapPolicy,
  airGapEnforce,
  parseAirGapPolicy,
  safeParseAirGapPolicy,
} from './security/airgap.js'
export type { AirGapRequest, AirGapDecision } from './security/airgap.js'

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

export {
  BrandKit,
  VoiceConfig,
  VoiceTone,
  Severity,
  VocabularyConfig,
  PreferredTerm,
  BannedPhrase,
  RequiredDisclaimer,
  GlossaryEntry,
  FormattingConfig,
  IdentityConfig,
  parseBrandKit,
  safeParseBrandKit,
  validateAgainstBrandKit,
  hasBlockingViolation,
} from './brand/brand-kit.js'
export type { BrandViolation, ValidationOptions } from './brand/brand-kit.js'

export {
  SENSITIVITY_LEVELS,
  Sensitivity,
  ConsentScope,
  ConsentRef,
  BreakGlassActivation,
  BreakGlassBypass,
  BreakGlassReason,
  BreakGlassPostHoc,
  BREAK_GLASS_BYPASSES,
  compareSensitivity,
  requiresConsent,
  checkConsent,
  evaluateBreakGlass,
  parseConsentRef,
  safeParseConsentRef,
  parseBreakGlassActivation,
  safeParseBreakGlassActivation,
} from './consent/consent.js'
export type { ConsentDecision, BreakGlassDecision } from './consent/consent.js'
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


export {
  SEMCONV_VERSION,
  GenAiAttr,
  GEN_AI_OPERATION_NAMES,
  GEN_AI_FINISH_REASONS,
  GenAiOperationName,
  GenAiFinishReason,
  GenAiSpanAttributes,
  parseGenAiAttributes,
  safeParseGenAiAttributes,
  spanName,
  buildRequestAttributes,
  buildResponseAttributes,
} from './obs/gen-ai-semconv.js'
export type {
  GenAiAttrName,
  GenAiRequest,
  GenAiResponse,
  OsRunHints,
} from './obs/gen-ai-semconv.js'

export {
  Currency,
  ModelPricing,
  CostMeter,
  CostBudgetCheck,
  computeCost,
  checkBudget,
  parseModelPricing,
  safeParseModelPricing,
} from './cost/cost-meter.js'
export type {
  Usage,
  CostBreakdown,
  CostKey,
  CostMeterId,
  BudgetDecision,
} from './cost/cost-meter.js'
