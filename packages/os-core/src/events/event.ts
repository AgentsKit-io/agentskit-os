import { z } from 'zod'
import { Slug } from '../schema/_primitives.js'

export const EVENT_SPEC_VERSION = '1.0' as const

export const EventType = z
  .string()
  .min(3)
  .max(128)
  .regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_*]+)+$/, {
    message: 'must be dot-separated lowercase: <root>.<domain>.<action>',
  })
export type EventType = z.infer<typeof EventType>

export const RESERVED_TOPIC_ROOTS = [
  'config',
  'agent',
  'flow',
  'trigger',
  'plugin',
  'vault',
  'trace',
  'hitl',
  'cost',
  'system',
] as const
export type ReservedTopicRoot = (typeof RESERVED_TOPIC_ROOTS)[number]

export const Ulid = z
  .string()
  .length(26)
  .regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, { message: 'must be ULID' })
export type Ulid = z.infer<typeof Ulid>

export const EventSource = z
  .string()
  .min(1)
  .max(512)
  .regex(/^agentskitos:\/\/[^\s]+$/, { message: 'must be agentskitos://… URI' })
export type EventSource = z.infer<typeof EventSource>

export const DataSchemaUri = z
  .string()
  .min(1)
  .max(512)
  .regex(/^agentskitos:\/\/schema\/[a-z0-9_.*-]+\/v\d+$/, {
    message: 'must be agentskitos://schema/<type>/v<n>',
  })
export type DataSchemaUri = z.infer<typeof DataSchemaUri>

export const EventEnvelope = <TType extends z.ZodTypeAny, TData extends z.ZodTypeAny>(
  type: TType,
  data: TData,
) =>
  z.object({
    specversion: z.literal(EVENT_SPEC_VERSION),
    id: Ulid,
    type,
    source: EventSource,
    subject: z.string().min(1).max(512).optional(),
    time: z.string().datetime({ offset: true }),
    datacontenttype: z.literal('application/json'),
    dataschema: DataSchemaUri,
    data,
    workspaceId: Slug,
    principalId: z.string().min(1).max(128),
    traceId: z.string().min(1).max(64),
    spanId: z.string().min(1).max(64),
    causationId: Ulid.optional(),
    correlationId: z.string().min(1).max(128).optional(),
  })

export const AnyEvent = EventEnvelope(EventType, z.unknown())
export type AnyEvent = z.infer<typeof AnyEvent>

export const parseEvent = (input: unknown): AnyEvent => AnyEvent.parse(input)
export const safeParseEvent = (input: unknown) => AnyEvent.safeParse(input)
