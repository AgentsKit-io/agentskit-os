// OpenTelemetry GenAI semantic conventions per RFC-0006.
// Spec: https://opentelemetry.io/docs/specs/semconv/gen-ai/
// Pure constants + zod validators. No SDK dependency.

import { z } from 'zod'

export const SEMCONV_VERSION = '1.29.0' as const

export const GenAiAttr = {
  system: 'gen_ai.system',
  operationName: 'gen_ai.operation.name',
  requestModel: 'gen_ai.request.model',
  requestMaxTokens: 'gen_ai.request.max_tokens',
  requestTemperature: 'gen_ai.request.temperature',
  requestTopP: 'gen_ai.request.top_p',
  requestTopK: 'gen_ai.request.top_k',
  requestStopSequences: 'gen_ai.request.stop_sequences',
  requestPresencePenalty: 'gen_ai.request.presence_penalty',
  requestFrequencyPenalty: 'gen_ai.request.frequency_penalty',
  requestSeed: 'gen_ai.request.seed',
  responseId: 'gen_ai.response.id',
  responseModel: 'gen_ai.response.model',
  responseFinishReasons: 'gen_ai.response.finish_reasons',
  usageInputTokens: 'gen_ai.usage.input_tokens',
  usageOutputTokens: 'gen_ai.usage.output_tokens',
  serverAddress: 'server.address',
  serverPort: 'server.port',
  errorType: 'error.type',
  osWorkspaceId: 'agentskitos.workspace_id',
  osRunId: 'agentskitos.run_id',
  osRunMode: 'agentskitos.run_mode',
  osAgentId: 'agentskitos.agent_id',
  osFlowId: 'agentskitos.flow_id',
  osNodeId: 'agentskitos.node_id',
  osPrincipalId: 'agentskitos.principal_id',
  osCostUsd: 'agentskitos.cost_usd',
  osCacheHit: 'agentskitos.cache_hit',
  osConsentRefId: 'agentskitos.consent_ref_id',
  osBrandKitId: 'agentskitos.brand_kit_id',
} as const

export type GenAiAttrName = (typeof GenAiAttr)[keyof typeof GenAiAttr]

export const GEN_AI_OPERATION_NAMES = ['chat', 'completion', 'embedding', 'tool', 'agent', 'rerank'] as const
export type GenAiOperationName = (typeof GEN_AI_OPERATION_NAMES)[number]
export const GenAiOperationName = z.enum(GEN_AI_OPERATION_NAMES)

export const GEN_AI_FINISH_REASONS = ['stop', 'length', 'tool_calls', 'content_filter', 'error'] as const
export type GenAiFinishReason = (typeof GEN_AI_FINISH_REASONS)[number]
export const GenAiFinishReason = z.enum(GEN_AI_FINISH_REASONS)

const numLike = z.union([z.number(), z.bigint().transform((b) => Number(b))])

export const GenAiSpanAttributes = z
  .object({
    'gen_ai.system': z.string().min(1).max(64).optional(),
    'gen_ai.operation.name': GenAiOperationName.optional(),
    'gen_ai.request.model': z.string().min(1).max(128).optional(),
    'gen_ai.request.max_tokens': z.number().int().positive().max(1_000_000).optional(),
    'gen_ai.request.temperature': z.number().min(0).max(2).optional(),
    'gen_ai.request.top_p': z.number().min(0).max(1).optional(),
    'gen_ai.request.top_k': z.number().int().nonnegative().optional(),
    'gen_ai.request.stop_sequences': z.array(z.string()).max(8).optional(),
    'gen_ai.request.presence_penalty': z.number().min(-2).max(2).optional(),
    'gen_ai.request.frequency_penalty': z.number().min(-2).max(2).optional(),
    'gen_ai.request.seed': z.number().int().optional(),
    'gen_ai.response.id': z.string().min(1).max(256).optional(),
    'gen_ai.response.model': z.string().min(1).max(128).optional(),
    'gen_ai.response.finish_reasons': z.array(GenAiFinishReason).max(8).optional(),
    'gen_ai.usage.input_tokens': numLike.optional(),
    'gen_ai.usage.output_tokens': numLike.optional(),
    'server.address': z.string().min(1).max(256).optional(),
    'server.port': z.number().int().min(0).max(65535).optional(),
    'error.type': z.string().min(1).max(256).optional(),
    'agentskitos.workspace_id': z.string().min(1).max(64).optional(),
    'agentskitos.run_id': z.string().min(1).max(64).optional(),
    'agentskitos.run_mode': z.string().min(1).max(32).optional(),
    'agentskitos.agent_id': z.string().min(1).max(64).optional(),
    'agentskitos.flow_id': z.string().min(1).max(64).optional(),
    'agentskitos.node_id': z.string().min(1).max(64).optional(),
    'agentskitos.principal_id': z.string().min(1).max(128).optional(),
    'agentskitos.cost_usd': z.number().nonnegative().optional(),
    'agentskitos.cache_hit': z.boolean().optional(),
    'agentskitos.consent_ref_id': z.string().min(1).max(64).optional(),
    'agentskitos.brand_kit_id': z.string().min(1).max(64).optional(),
  })
  .passthrough()
export type GenAiSpanAttributes = z.infer<typeof GenAiSpanAttributes>

export const parseGenAiAttributes = (input: unknown): GenAiSpanAttributes =>
  GenAiSpanAttributes.parse(input)
export const safeParseGenAiAttributes = (input: unknown) => GenAiSpanAttributes.safeParse(input)

export const spanName = (op: GenAiOperationName, modelOrTarget?: string): string =>
  modelOrTarget ? `${op} ${modelOrTarget}` : op

export type GenAiRequest = {
  readonly system: string
  readonly operationName: GenAiOperationName
  readonly model: string
  readonly maxTokens?: number
  readonly temperature?: number
  readonly topP?: number
  readonly topK?: number
  readonly stopSequences?: readonly string[]
  readonly seed?: number
}

export type GenAiResponse = {
  readonly id?: string
  readonly model?: string
  readonly finishReasons?: readonly GenAiFinishReason[]
  readonly inputTokens?: number
  readonly outputTokens?: number
}

export type OsRunHints = {
  readonly workspaceId?: string
  readonly runId?: string
  readonly runMode?: string
  readonly agentId?: string
  readonly flowId?: string
  readonly nodeId?: string
  readonly principalId?: string
  readonly costUsd?: number
  readonly cacheHit?: boolean
  readonly consentRefId?: string
  readonly brandKitId?: string
}

const setIfDefined = <T>(out: Record<string, unknown>, key: string, value: T | undefined): void => {
  if (value !== undefined) out[key] = value
}

const applyHints = (out: Record<string, unknown>, h: OsRunHints): void => {
  setIfDefined(out, 'agentskitos.workspace_id', h.workspaceId)
  setIfDefined(out, 'agentskitos.run_id', h.runId)
  setIfDefined(out, 'agentskitos.run_mode', h.runMode)
  setIfDefined(out, 'agentskitos.agent_id', h.agentId)
  setIfDefined(out, 'agentskitos.flow_id', h.flowId)
  setIfDefined(out, 'agentskitos.node_id', h.nodeId)
  setIfDefined(out, 'agentskitos.principal_id', h.principalId)
  setIfDefined(out, 'agentskitos.cost_usd', h.costUsd)
  setIfDefined(out, 'agentskitos.cache_hit', h.cacheHit)
  setIfDefined(out, 'agentskitos.consent_ref_id', h.consentRefId)
  setIfDefined(out, 'agentskitos.brand_kit_id', h.brandKitId)
}

export const buildRequestAttributes = (req: GenAiRequest, hints?: OsRunHints): GenAiSpanAttributes => {
  const out: Record<string, unknown> = {
    'gen_ai.system': req.system,
    'gen_ai.operation.name': req.operationName,
    'gen_ai.request.model': req.model,
  }
  setIfDefined(out, 'gen_ai.request.max_tokens', req.maxTokens)
  setIfDefined(out, 'gen_ai.request.temperature', req.temperature)
  setIfDefined(out, 'gen_ai.request.top_p', req.topP)
  setIfDefined(out, 'gen_ai.request.top_k', req.topK)
  setIfDefined(out, 'gen_ai.request.stop_sequences', req.stopSequences)
  setIfDefined(out, 'gen_ai.request.seed', req.seed)
  if (hints) applyHints(out, hints)
  return parseGenAiAttributes(out)
}

export const buildResponseAttributes = (res: GenAiResponse, hints?: OsRunHints): GenAiSpanAttributes => {
  const out: Record<string, unknown> = {}
  setIfDefined(out, 'gen_ai.response.id', res.id)
  setIfDefined(out, 'gen_ai.response.model', res.model)
  setIfDefined(out, 'gen_ai.response.finish_reasons', res.finishReasons)
  setIfDefined(out, 'gen_ai.usage.input_tokens', res.inputTokens)
  setIfDefined(out, 'gen_ai.usage.output_tokens', res.outputTokens)
  if (hints) applyHints(out, hints)
  return parseGenAiAttributes(out)
}
