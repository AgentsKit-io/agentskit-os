import { z } from 'zod'
import { VaultSecretRef } from './_primitives.js'

const SecretOrPlain = z.union([VaultSecretRef, z.string().min(1).max(2048)])

export const TraceExporter = z.enum(['console', 'langfuse', 'posthog', 'otlp', 'file'])
export type TraceExporter = z.infer<typeof TraceExporter>

export const CostQuota = z.object({
  daily: z.number().nonnegative().max(1_000_000).optional(),
  monthly: z.number().nonnegative().max(10_000_000).optional(),
  perAgent: z.record(z.string().min(1).max(64), z.number().nonnegative()).optional(),
})
export type CostQuota = z.infer<typeof CostQuota>

export const AnomalyDetection = z.object({
  enabled: z.boolean().default(true),
  costSpikeMultiplier: z.number().min(1).max(100).default(3),
  toolCallRateLimitPerMinute: z.number().int().positive().max(100_000).default(120),
})
export type AnomalyDetection = z.infer<typeof AnomalyDetection>

export const ObservabilityConfig = z.object({
  enabled: z.boolean().default(true),
  exporters: z.array(TraceExporter).min(1).default(['console']),
  endpoint: z.string().url().optional(),
  apiKey: SecretOrPlain.optional(),
  sampleRate: z.number().min(0).max(1).default(1),
  redactInputs: z.boolean().default(false),
  costQuota: CostQuota.optional(),
  anomalyDetection: AnomalyDetection.optional(),
})
export type ObservabilityConfig = z.infer<typeof ObservabilityConfig>

export const parseObservabilityConfig = (input: unknown): ObservabilityConfig =>
  ObservabilityConfig.parse(input)
export const safeParseObservabilityConfig = (input: unknown) =>
  ObservabilityConfig.safeParse(input)
