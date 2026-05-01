import { z } from 'zod'

export const ErrorCategory = z.enum([
  'user',
  'config',
  'auth',
  'plugin',
  'runtime',
  'integration',
  'internal',
])
export type ErrorCategory = z.infer<typeof ErrorCategory>

export const ErrorCode = z
  .string()
  .min(3)
  .max(96)
  .regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, {
    message: 'must be dot-separated lowercase: <domain>.<reason>',
  })
export type ErrorCode = z.infer<typeof ErrorCode>

export const RESERVED_DOMAINS = [
  'config',
  'auth',
  'vault',
  'flow',
  'trigger',
  'plugin',
  'agent',
  'tool',
  'event',
  'net',
  'fs',
  'cost',
  'system',
] as const
export type ReservedDomain = (typeof RESERVED_DOMAINS)[number]
