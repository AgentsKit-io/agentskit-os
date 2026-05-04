// Per ROADMAP M2 (#29). Telemetry contract — pure types + decision rules.
// No I/O. Consumers (CLI/desktop) supply transport + storage.
//
// Decisions:
// - Default: prompt at first init/wizard. Persist user's answer.
// - Captured: cli verb + version + os/node + flow run counts + node kinds + error codes
// - Sink: local jsonl + optional HTTP POST
// - Export: json | csv, --since, --dry-run preview

import { z } from 'zod'

export const TelemetryConsentState = z.enum(['unset', 'enabled', 'disabled'])
export type TelemetryConsentState = z.infer<typeof TelemetryConsentState>

export const TelemetryConsent = z.object({
  state: TelemetryConsentState.default('unset'),
  /** When the user answered the prompt. */
  decidedAt: z.string().datetime().optional(),
  /** Anonymous install id — UUID generated at first run. Never reset on opt-out. */
  installId: z.string().uuid().optional(),
})
export type TelemetryConsent = z.infer<typeof TelemetryConsent>

export const TelemetryEventKind = z.enum([
  'cli.invoke',
  'flow.run',
  'flow.node',
  'error',
])
export type TelemetryEventKind = z.infer<typeof TelemetryEventKind>

/**
 * Schema for an emitted event. Captures only the fields we promised to
 * collect. No agent IDs, no flow IDs, no prompt text, no error messages,
 * no stack traces.
 */
export const TelemetryEvent = z.object({
  kind: TelemetryEventKind,
  at: z.string().datetime(),
  installId: z.string().uuid(),
  cliVersion: z.string().min(1).max(64),
  osCoreVersion: z.string().min(1).max(64),
  os: z.enum(['darwin', 'linux', 'win32', 'other']),
  nodeVersion: z.string().min(1).max(32),
  /** For cli.invoke. */
  verb: z.string().min(1).max(64).optional(),
  /** For flow.run / flow.node. */
  runMode: z.enum(['real', 'preview', 'dry_run', 'replay', 'simulate', 'deterministic']).optional(),
  nodeKind: z.string().min(1).max(64).optional(),
  /** For error. Stable error code only — never the message. */
  errorCode: z.string().min(1).max(128).optional(),
  /** Wall-clock duration in ms (rounded to 50 ms buckets). */
  durationMs: z.number().int().nonnegative().max(86_400_000).optional(),
  /** Exit code if applicable. */
  exitCode: z.number().int().min(0).max(255).optional(),
})
export type TelemetryEvent = z.infer<typeof TelemetryEvent>

export const TelemetrySink = z.object({
  /** Write each event as a JSONL line under the workspace runtime root. */
  file: z.boolean().default(true),
  /** Optional HTTP POST endpoint. JSON array body, one batch per send. */
  httpUrl: z.string().url().max(2048).optional(),
  /** How often to flush the file buffer to disk (ms). */
  flushIntervalMs: z.number().int().min(100).max(60_000).default(5_000),
  /** How many events trigger an HTTP send. */
  httpBatchSize: z.number().int().min(1).max(1024).default(64),
})
export type TelemetrySink = z.infer<typeof TelemetrySink>

export const TelemetryConfig = z.object({
  consent: TelemetryConsent.default({ state: 'unset' }),
  sink: TelemetrySink.default({ file: true, flushIntervalMs: 5_000, httpBatchSize: 64 }),
})
export type TelemetryConfig = z.infer<typeof TelemetryConfig>

/**
 * Decide whether to emit a given event.
 * Returns 'emit' | 'drop'. Pure.
 */
export const decideEmit = (consent: TelemetryConsent): 'emit' | 'drop' =>
  consent.state === 'enabled' ? 'emit' : 'drop'

/**
 * Bucket a duration to a 50 ms granularity to limit timing-side-channel
 * uniqueness. Keeps events less identifying.
 */
export const bucketDuration = (ms: number): number =>
  Math.max(0, Math.round(ms / 50) * 50)

export const parseTelemetryEvent = (input: unknown): TelemetryEvent =>
  TelemetryEvent.parse(input)
export const safeParseTelemetryEvent = (input: unknown) =>
  TelemetryEvent.safeParse(input)
export const parseTelemetryConfig = (input: unknown): TelemetryConfig =>
  TelemetryConfig.parse(input)
export const safeParseTelemetryConfig = (input: unknown) =>
  TelemetryConfig.safeParse(input)
