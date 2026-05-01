import { z } from 'zod'
import { ErrorCategory, ErrorCode } from './codes.js'

export const ERROR_SCHEMA_VERSION = 1 as const

const CauseShape: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    OsErrorEnvelope,
    z.object({
      name: z.string().min(1).max(128),
      message: z.string().max(4096),
      stack: z.string().max(16384).optional(),
    }),
  ]),
)

export const OsErrorEnvelope: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    name: z.literal('OsError'),
    code: ErrorCode,
    message: z.string().min(1).max(1024),
    hint: z.string().max(2048).optional(),
    retryable: z.boolean(),
    category: ErrorCategory,
    source: z.string().min(1).max(512),
    principalId: z.string().min(1).max(128).optional(),
    workspaceId: z.string().min(1).max(128).optional(),
    traceId: z.string().min(1).max(64).optional(),
    spanId: z.string().min(1).max(64).optional(),
    causationId: z.string().min(1).max(64).optional(),
    cause: CauseShape.optional(),
    details: z.record(z.string(), z.unknown()).optional(),
    occurredAt: z.string().datetime({ offset: true }),
    schemaVersion: z.literal(ERROR_SCHEMA_VERSION),
  }),
)

export type OsErrorEnvelope = z.infer<typeof OsErrorEnvelope>

export const parseOsError = (input: unknown): OsErrorEnvelope =>
  OsErrorEnvelope.parse(input) as OsErrorEnvelope
export const safeParseOsError = (input: unknown) => OsErrorEnvelope.safeParse(input)
